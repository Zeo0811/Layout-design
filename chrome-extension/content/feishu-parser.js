// 飞书文档 DOM 解析器
// 支持飞书 docs / docx / wiki 三种页面格式
// 新增：h4/h5/h6、表格支持

function parseFeishu() {
  const title = getFeishuTitle();
  const links = [];

  const contentArea =
    document.querySelector('.lark-ck-editor') ||
    document.querySelector('.doc-content') ||
    document.querySelector('.suite-doc-content') ||
    document.querySelector('[class*="udoc-editor-main"]') ||
    document.querySelector('[class*="docx-content"]') ||
    document.querySelector('.block-content-inner') ||
    document.querySelector('[class*="editor-content"]') ||
    document.querySelector('main [class*="editor"]') ||
    document.querySelector('article');

  if (!contentArea) {
    throw new Error('无法找到飞书文档内容，请确保页面已完全加载');
  }

  const blocks = parseFeishuBlocks(contentArea, links);
  return { type: 'feishu', title, blocks, links };
}

function getFeishuTitle() {
  const candidates = [
    document.querySelector('.docx-heading1 [data-slate-leaf]'),
    document.querySelector('[class*="doc-title"] [contenteditable]'),
    document.querySelector('[class*="title-block"] [data-slate-leaf]'),
    document.querySelector('h1[contenteditable]'),
    document.querySelector('[class*="heading1"]'),
    document.querySelector('[data-block-type="heading1"]'),
  ];

  for (const el of candidates) {
    if (el && el.textContent.trim()) return el.textContent.trim();
  }

  return document.title.replace(/- 飞书.*/g, '').replace(/\| 飞书.*/g, '').trim();
}

function parseFeishuBlocks(container, links) {
  const blocks = [];
  let listBuffer = { type: null, items: [] };

  const blockEls = container.querySelectorAll(
    '[data-block-type], [class*="docx-block"], [class*="block-element"], ' +
    '[class*="paragraph-element"], [class*="heading"], .block'
  );

  const elements = blockEls.length > 0 ? blockEls : container.children;

  for (const el of elements) {
    const { type: blockType } = getFeishuBlockType(el);
    if (!blockType) continue;

    const isList = blockType === 'bulleted_list' || blockType === 'numbered_list';

    if (isList) {
      if (listBuffer.type !== blockType) {
        if (listBuffer.items.length > 0) {
          blocks.push({ type: listBuffer.type, items: listBuffer.items });
          listBuffer = { type: null, items: [] };
        }
        listBuffer.type = blockType;
      }
      listBuffer.items.push({ content: extractFeishuText(el, links), children: [] });
    } else {
      if (listBuffer.items.length > 0) {
        blocks.push({ type: listBuffer.type, items: listBuffer.items });
        listBuffer = { type: null, items: [] };
      }
      const block = parseFeishuBlock(el, blockType, links);
      if (block) blocks.push(block);
    }
  }

  if (listBuffer.items.length > 0) {
    blocks.push({ type: listBuffer.type, items: listBuffer.items });
  }

  return blocks;
}

function getFeishuBlockType(el) {
  if (!el) return { type: null };

  const cls = el.className || '';
  const blockType = el.getAttribute('data-block-type') || '';

  // data-block-type 最可靠
  if (blockType) {
    const typeMap = {
      'heading1': { type: 'h1' },
      'heading2': { type: 'h2' },
      'heading3': { type: 'h3' },
      'heading4': { type: 'h4' },
      'heading5': { type: 'h5' },
      'heading6': { type: 'h6' },
      'heading7': { type: 'h6' },
      'heading8': { type: 'h6' },
      'heading9': { type: 'h6' },
      'text': { type: 'paragraph' },
      'paragraph': { type: 'paragraph' },
      'quote': { type: 'quote' },
      'code': { type: 'code' },
      'callout': { type: 'callout' },
      'divider': { type: 'divider' },
      'bullet': { type: 'bulleted_list' },
      'ordered': { type: 'numbered_list' },
      'image': { type: 'image' },
      'video': { type: 'video' },
      'table': { type: 'table' },
      'embed': { type: 'embed' },
    };
    if (typeMap[blockType]) return typeMap[blockType];
  }

  // 通过 class 检测
  if (cls.includes('heading1') || cls.includes('heading-1') || cls.includes(' h1')) return { type: 'h1' };
  if (cls.includes('heading2') || cls.includes('heading-2') || cls.includes(' h2')) return { type: 'h2' };
  if (cls.includes('heading3') || cls.includes('heading-3') || cls.includes(' h3')) return { type: 'h3' };
  if (cls.includes('heading4') || cls.includes('heading-4')) return { type: 'h4' };
  if (cls.includes('heading5') || cls.includes('heading-5')) return { type: 'h5' };
  if (cls.includes('heading6') || cls.includes('heading-6')) return { type: 'h6' };
  if (cls.includes('blockquote') || cls.includes('quote')) return { type: 'quote' };
  if (cls.includes('code-block') || cls.includes('codeBlock')) return { type: 'code' };
  if (cls.includes('callout')) return { type: 'callout' };
  if (cls.includes('divider') || cls.includes('hr-block')) return { type: 'divider' };
  if (cls.includes('bullet') || (cls.includes('list-item') && !cls.includes('ordered'))) return { type: 'bulleted_list' };
  if (cls.includes('ordered') || cls.includes('numbered')) return { type: 'numbered_list' };
  if (cls.includes('image')) return { type: 'image' };
  if (cls.includes('video')) return { type: 'video' };
  if (cls.includes('table') && !cls.includes('table-row') && !cls.includes('table-cell')) return { type: 'table' };
  if (cls.includes('paragraph') || cls.includes('text-block')) return { type: 'paragraph' };

  // 通过 HTML 标签检测
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  if (tag === 'h1') return { type: 'h1' };
  if (tag === 'h2') return { type: 'h2' };
  if (tag === 'h3') return { type: 'h3' };
  if (tag === 'h4') return { type: 'h4' };
  if (tag === 'h5') return { type: 'h5' };
  if (tag === 'h6') return { type: 'h6' };
  if (tag === 'blockquote') return { type: 'quote' };
  if (tag === 'hr') return { type: 'divider' };
  if (tag === 'p') return { type: 'paragraph' };
  if (tag === 'li') return { type: 'bulleted_list' };
  if (tag === 'pre' || tag === 'code') return { type: 'code' };
  if (tag === 'table') return { type: 'table' };

  return { type: null };
}

function parseFeishuBlock(el, blockType, links) {
  switch (blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return { type: blockType, content: extractFeishuText(el, links) };

    case 'paragraph':
      return { type: 'paragraph', content: extractFeishuText(el, links) };

    case 'quote':
      return { type: 'quote', content: extractFeishuText(el, links) };

    case 'code': {
      const language = el.getAttribute('data-language') ||
        el.querySelector('[class*="lang"]')?.textContent?.trim() ||
        'plaintext';
      const codeEl = el.querySelector('pre') || el.querySelector('code') || el;
      return { type: 'code', language, content: codeEl.textContent };
    }

    case 'callout': {
      const iconEl = el.querySelector('[class*="icon"]') || el.querySelector('[class*="emoji"]');
      const icon = iconEl ? iconEl.textContent.trim() : '💡';
      const clone = el.cloneNode(true);
      if (clone.querySelector('[class*="icon"]')) clone.querySelector('[class*="icon"]').remove();
      return { type: 'callout', icon, content: extractFeishuText(clone, links) };
    }

    case 'divider':
      return { type: 'divider' };

    case 'image': {
      const imgEl = el.querySelector('img');
      if (!imgEl) return null;
      const current  = imgEl.currentSrc || '';
      const domSrc   = imgEl.src || '';
      const attrSrc  = imgEl.getAttribute('src') || '';
      const srcset   = imgEl.getAttribute('srcset') || imgEl.srcset || '';
      const srcsetFirst = srcset ? srcset.split(',')[0].trim().split(/\s+/)[0] : '';
      const src = [current, domSrc, attrSrc, srcsetFirst]
        .find(s => s && !s.startsWith('blob:') && !s.startsWith('data:')) || '';
      const captionEl = el.querySelector('[class*="caption"]') || el.querySelector('figcaption');
      const caption = captionEl ? captionEl.textContent.trim() : '';
      return src ? { type: 'image', url: src, caption } : null;
    }

    case 'video': {
      const videoEl = el.querySelector('video');
      const iframeEl = el.querySelector('iframe');
      const url = videoEl?.getAttribute('src') || iframeEl?.getAttribute('src') || '';
      const thumbnailUrl = videoEl?.getAttribute('poster') || el.querySelector('img')?.getAttribute('src') || '';
      return { type: 'video', url, thumbnailUrl };
    }

    case 'table':
      return parseFeishuTable(el, links);

    case 'embed': {
      const linkEl = el.querySelector('a');
      const iframeEl = el.querySelector('iframe');
      const url = (linkEl && linkEl.getAttribute('href')) ||
                  (iframeEl && iframeEl.getAttribute('src')) || '';
      const titleEl = el.querySelector('[class*="title"]');
      return url ? { type: 'embed', url, title: titleEl ? titleEl.textContent.trim() : '嵌入内容' } : null;
    }

    default:
      return null;
  }
}

// ── 新增：飞书表格解析 ─────────────────────────────────────────────────────

function parseFeishuTable(el, links) {
  const rows = [];

  // 优先查找 tr 结构
  const trEls = el.querySelectorAll('tr');
  if (trEls.length > 0) {
    trEls.forEach((tr, idx) => {
      const cellEls = tr.querySelectorAll('td, th');
      const cells = [];
      cellEls.forEach(cell => cells.push(extractFeishuText(cell, links)));
      if (cells.length > 0) rows.push({ cells, isHeader: idx === 0 });
    });
  } else {
    // 飞书自定义表格块结构
    const rowEls = el.querySelectorAll(
      '[data-block-type="table_row"], [class*="table-row"], [class*="tableRow"]'
    );
    rowEls.forEach((rowEl, idx) => {
      const cellEls = rowEl.querySelectorAll(
        '[data-block-type="table_cell"], [class*="table-cell"], [class*="tableCell"], td, th'
      );
      const cells = [];
      cellEls.forEach(cell => cells.push(extractFeishuText(cell, links)));
      if (cells.length > 0) rows.push({ cells, isHeader: idx === 0 });
    });
  }

  return rows.length > 0 ? { type: 'table', rows } : null;
}

function extractFeishuText(el, links) {
  return convertFeishuNodeToHtml(el, links);
}

function convertFeishuNodeToHtml(node, links) {
  let html = '';

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      html += escapeFeishuHtml(child.textContent);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName.toLowerCase();
    const cls = child.className || '';
    const style = child.getAttribute('style') || '';
    const innerHtml = convertFeishuNodeToHtml(child, links);

    if (tag === 'br') { html += '<br>'; continue; }

    if (tag === 'code' || cls.includes('code')) {
      html += `<code>${escapeFeishuHtml(child.textContent)}</code>`;
      continue;
    }

    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      const text = child.textContent.trim();
      if (href && !href.startsWith('#') && text) {
        const existing = links.findIndex(l => l.url === href);
        const idx = existing >= 0 ? existing + 1 : (links.push({ text, url: href }), links.length);
        html += `${escapeFeishuHtml(text)}<sup>[${idx}]</sup>`;
      } else {
        html += escapeFeishuHtml(text);
      }
      continue;
    }

    const isBold = tag === 'strong' || tag === 'b' ||
      cls.includes('bold') || style.includes('font-weight:700') ||
      style.includes('font-weight: 700') || style.includes('font-weight:600');
    const isItalic = tag === 'em' || tag === 'i' ||
      cls.includes('italic') || style.includes('font-style:italic');
    const isStrike = tag === 's' || cls.includes('strike') || style.includes('line-through');

    let result = innerHtml;
    if (isBold) result = `<strong>${result}</strong>`;
    if (isItalic) result = `<em>${result}</em>`;
    if (isStrike) result = `<s>${result}</s>`;
    html += result;
  }

  return html;
}

function escapeFeishuHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

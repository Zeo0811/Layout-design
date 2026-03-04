// 飞书文档 DOM 解析器
// 支持飞书 docs / docx / wiki 三种页面格式
// v3：遍历所有容器策略，取块数最多的结果；使用"块父 === 容器"过滤避免嵌套重复

// 找 page 块的可滚动父级容器
function findFeishuScroller() {
  const page = document.querySelector('[data-block-type="page"]');
  if (page) {
    let node = page.parentElement;
    while (node && node !== document.body) {
      if (node.scrollHeight > node.clientHeight) return node;
      node = node.parentElement;
    }
  }
  return document.documentElement;
}

// 边滚动边收集块，用文档垂直位置去重，解决虚拟滚动 + 内容相同块丢失问题
// 返回 Promise<{ blocks, links }>
function scrollAndCollect() {
  return new Promise(resolve => {
    const scroller = findFeishuScroller();
    const links = [];
    const blocksByPos = new Map(); // docTop(px) -> block
    const scrollerTop = scroller.getBoundingClientRect().top;

    function snapshot() {
      const page = document.querySelector('[data-block-type="page"]');
      if (!page) return;
      const currentScroll = scroller.scrollTop;
      const els = [...page.querySelectorAll('[data-block-type]')].filter(el => {
        const pb = el.parentElement && el.parentElement.closest('[data-block-type]');
        return pb === page;
      });
      for (const el of els) {
        // 用元素距文档顶部的绝对位置作为唯一 key，空行和重复内容都能正确区分
        const docTop = Math.round(currentScroll + el.getBoundingClientRect().top - scrollerTop);
        if (blocksByPos.has(docTop)) continue;
        const { type: blockType } = getFeishuBlockType(el);
        if (!blockType) continue;
        const block = parseFeishuBlock(el, blockType, links);
        if (block) blocksByPos.set(docTop, block);
      }
    }

    const step = 300;
    let pos = 0;

    function tick() {
      snapshot();
      const maxScroll = scroller.scrollHeight;
      if (pos >= maxScroll) {
        scroller.scrollTop = 0;
        // 按文档位置排序，保证块顺序正确
        const sorted = [...blocksByPos.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, block]) => block);
        // 合并相邻同类型列表块
        const merged = [];
        for (const block of sorted) {
          const prev = merged[merged.length - 1];
          if (prev && prev.type === block.type &&
              (block.type === 'bulleted_list' || block.type === 'numbered_list') &&
              block.items) {
            prev.items.push(...block.items);
          } else {
            merged.push(block);
          }
        }
        setTimeout(() => resolve({ blocks: merged, links }), 500);
        return;
      }
      scroller.scrollTop = pos;
      pos += step;
      setTimeout(tick, 150);
    }
    tick();
  });
}

function parseFeishu() {
  const title = getFeishuTitle();
  let best = null; // { blocks, links }

  // ── 策略一：遍历所有已知容器选择器，记录块数最多的结果 ───────────────────
  const containerSelectors = [
    '[data-block-type="page"]',
    '[data-block-type="doc"]',
    '.lark-ck-editor',
    '.doc-content',
    '.suite-doc-content',
    '[class*="udoc-editor-main"]',
    '[class*="docx-content"]',
    '[class*="render-unit-doc"]',
    '[class*="ccm-editor-block"]',
    '[class*="doc-render"]',
    '.ProseMirror',
    '[contenteditable="true"][class*="doc"]',
    '[contenteditable="true"][class*="editor"]',
    '.block-content-inner',
    '[class*="editor-content"]',
    'main [class*="editor"]',
    'article',
  ];

  for (const sel of containerSelectors) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      const links = [];
      const blocks = parseFeishuBlocks(el, links);
      if (blocks.length > (best ? best.blocks.length : 0)) {
        best = { blocks, links };
      }
    } catch (_) {}
  }

  // ── 策略二：找拥有最多 data-block-type 直接子节点的 DOM 元素 ─────────────
  try {
    const allBlockEls = [...document.querySelectorAll('[data-block-type]')];
    if (allBlockEls.length > 0) {
      const parentMap = new Map();
      for (const el of allBlockEls) {
        const p = el.parentElement;
        if (p) parentMap.set(p, (parentMap.get(p) || 0) + 1);
      }
      const [bestContainer] = [...parentMap.entries()]
        .reduce((a, b) => b[1] > a[1] ? b : a);
      const links = [];
      const blocks = parseFeishuBlocks(bestContainer, links);
      if (blocks.length > (best ? best.blocks.length : 0)) {
        best = { blocks, links };
      }
    }
  } catch (_) {}

  if (!best || best.blocks.length === 0) {
    throw new Error('无法找到飞书文档内容，请确保页面已完全加载后重试');
  }

  return { type: 'feishu', title, blocks: best.blocks, links: best.links };
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

// ── 核心：找"块父 === 容器"的块，避免嵌套块被重复处理 ─────────────────────
// 同时支持中间有普通 div 包装的情况（不只限于直接子节点）

function parseFeishuBlocks(container, links) {
  const blocks = [];
  let listBuffer = { type: null, items: [] };

  const containerIsBlock = container.hasAttribute('data-block-type');

  // 找属于"本容器一级"的 data-block-type 元素
  // 规则：el 的最近块祖先 === container（containerIsBlock 时）
  //       或：el 在 container 内且没有块祖先（container 不是块时）
  let elements = [...container.querySelectorAll('[data-block-type]')].filter(el => {
    const parentBlock = el.parentElement && el.parentElement.closest('[data-block-type]');
    if (containerIsBlock) return parentBlock === container;
    // 非块容器：el 的块祖先必须不在 container 内部
    return !parentBlock || !container.contains(parentBlock);
  });

  // 降级：无 data-block-type 时用 class 检测（直接子节点）
  if (elements.length === 0) {
    elements = [...container.children].filter(el => {
      const cls = el.className || '';
      return cls.includes('docx-block') || cls.includes('block-element') ||
             cls.includes('paragraph-element') || cls.includes('heading') ||
             el.classList.contains('block');
    });
  }

  // 最终降级：所有直接子节点
  if (elements.length === 0) elements = [...container.children];

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

  if (blockType) {
    const typeMap = {
      'heading1':  { type: 'h1' },
      'heading2':  { type: 'h2' },
      'heading3':  { type: 'h3' },
      'heading4':  { type: 'h4' },
      'heading5':  { type: 'h5' },
      'heading6':  { type: 'h6' },
      'heading7':  { type: 'h6' },
      'heading8':  { type: 'h6' },
      'heading9':  { type: 'h6' },
      'text':      { type: 'paragraph' },
      'paragraph': { type: 'paragraph' },
      'quote':     { type: 'quote' },
      'code':      { type: 'code' },
      'callout':   { type: 'callout' },
      'divider':   { type: 'divider' },
      'bullet':    { type: 'bulleted_list' },
      'ordered':   { type: 'numbered_list' },
      'todo':      { type: 'todo' },
      'image':     { type: 'image' },
      'video':     { type: 'video' },
      'table':     { type: 'table' },
      'embed':     { type: 'embed' },
      'bookmark':  { type: 'bookmark' },
    };
    if (typeMap[blockType]) return typeMap[blockType];
    // 容器类型（page/doc/table_row/table_cell/column 等）直接跳过
    return { type: null };
  }

  // class 兜底
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
    case 'h1': case 'h2': case 'h3':
    case 'h4': case 'h5': case 'h6':
      return { type: blockType, content: extractFeishuText(el, links) };

    case 'paragraph':
      return { type: 'paragraph', content: extractFeishuText(el, links) };

    case 'quote':
      return { type: 'quote', content: extractFeishuText(el, links) };

    case 'code': {
      const language = el.getAttribute('data-language') ||
        el.querySelector('[class*="lang"]')?.textContent?.trim() || 'plaintext';
      const codeEl = el.querySelector('pre') || el.querySelector('code') || el;
      return { type: 'code', language, content: codeEl.textContent };
    }

    case 'callout': {
      const iconEl = el.querySelector('[class*="icon"]') || el.querySelector('[class*="emoji"]');
      const icon = iconEl ? iconEl.textContent.trim() : '💡';
      const clone = el.cloneNode(true);
      const cloneIcon = clone.querySelector('[class*="icon"]') || clone.querySelector('[class*="emoji"]');
      if (cloneIcon) cloneIcon.remove();
      return { type: 'callout', icon, content: extractFeishuText(clone, links) };
    }

    case 'todo': {
      const checked = el.querySelector('[class*="checkbox"][class*="checked"]') !== null ||
                      el.querySelector('input[type="checkbox"]:checked') !== null;
      return { type: 'todo', checked, content: extractFeishuText(el, links) };
    }

    case 'divider':
      return { type: 'divider' };

    case 'image': {
      const imgEl = el.querySelector('img');
      if (!imgEl) return null;
      // 飞书图片使用 blob: URL，需保留；popup.js 的 convertImages 会在主线程 fetch 转 base64
      const src = imgEl.currentSrc || imgEl.src || imgEl.getAttribute('src') ||
        (imgEl.getAttribute('srcset') || '').split(',')[0].trim().split(/\s+/)[0] || '';
      const captionEl = el.querySelector('[class*="caption"]') || el.querySelector('figcaption');
      return src ? { type: 'image', url: src, caption: captionEl?.textContent.trim() || '' } : null;
    }

    case 'video': {
      const videoEl  = el.querySelector('video');
      const iframeEl = el.querySelector('iframe');
      return {
        type: 'video',
        url: videoEl?.getAttribute('src') || iframeEl?.getAttribute('src') || '',
        thumbnailUrl: videoEl?.getAttribute('poster') || el.querySelector('img')?.getAttribute('src') || '',
      };
    }

    case 'table':
      return parseFeishuTable(el, links);

    case 'bulleted_list':
    case 'numbered_list': {
      // 优先从嵌套 text 子块提取富文本；若只提取到 bullet 指示符则丢弃，退回 textContent
      let content = '';
      const textBlock = el.querySelector('[data-block-type="text"]');
      if (textBlock) {
        content = extractFeishuText(textBlock, links);
        // 只提取到了 bullet 指示符字符，视为无效
        if (/^[•·▪▸►‣⁃◦\u2022\u00b7\s]+$/.test(content)) content = '';
      }
      if (!content) {
        let raw = el.textContent.replace(/\n+/g, ' ').trim();
        raw = blockType === 'numbered_list'
          ? raw.replace(/^\d+[.)]\s*/, '')
          : raw.replace(/^[•·▪▸►‣⁃◦\u2022\u00b7]+\s*/, '');
        content = escapeFeishuHtml(raw.trim());
      }
      return { type: blockType, items: [{ content, children: [] }] };
    }

    case 'embed':
    case 'bookmark': {
      const linkEl   = el.querySelector('a');
      const iframeEl = el.querySelector('iframe');
      const url = (linkEl && linkEl.getAttribute('href')) ||
                  (iframeEl && iframeEl.getAttribute('src')) || '';
      const titleEl = el.querySelector('[class*="title"]');
      const text    = titleEl ? titleEl.textContent.trim() : (linkEl?.textContent.trim() || '嵌入内容');
      return url ? { type: 'embed', url, title: text } : null;
    }

    default:
      return null;
  }
}

function parseFeishuTable(el, links) {
  const rows = [];
  const trEls = el.querySelectorAll('tr');
  if (trEls.length > 0) {
    trEls.forEach((tr, idx) => {
      const cells = [];
      tr.querySelectorAll('td, th').forEach(cell => cells.push(extractFeishuText(cell, links)));
      if (cells.length > 0) rows.push({ cells, isHeader: idx === 0 });
    });
  } else {
    const rowEls = el.querySelectorAll(
      '[data-block-type="table_row"], [class*="table-row"], [class*="tableRow"]'
    );
    rowEls.forEach((rowEl, idx) => {
      const cells = [];
      rowEl.querySelectorAll(
        '[data-block-type="table_cell"], [class*="table-cell"], [class*="tableCell"], td, th'
      ).forEach(cell => cells.push(extractFeishuText(cell, links)));
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

    const tag   = child.tagName.toLowerCase();
    const cls   = child.getAttribute('class') || '';
    const style = child.getAttribute('style') || '';
    const inner = convertFeishuNodeToHtml(child, links);

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

    const isBold   = tag === 'strong' || tag === 'b' ||
      cls.includes('bold') || style.includes('font-weight:700') ||
      style.includes('font-weight: 700') || style.includes('font-weight:600');
    const isItalic = tag === 'em' || tag === 'i' ||
      cls.includes('italic') || style.includes('font-style:italic');
    const isStrike = tag === 's' || cls.includes('strike') || style.includes('line-through');

    let result = inner;
    if (isBold)   result = `<strong>${result}</strong>`;
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

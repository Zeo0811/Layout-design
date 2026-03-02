// Notion 页面 DOM 解析器
// 将 Notion DOM 结构转换为中间 JSON 表示
// 支持旧版 class 检测 + 新版 data-block-type 检测

function parseNotion() {
  const title = getNotionTitle();
  const links = [];

  // 新版 Notion 使用 data-content-editable-root 或 .notion-page-content
  const contentArea =
    document.querySelector('.notion-page-content') ||
    document.querySelector('[class*="notionPage"]') ||
    document.querySelector('[data-content-editable-root]') ||
    document.querySelector('[class*="layout-content"]') ||
    document.querySelector('main [class*="content"]') ||
    document.querySelector('main');

  if (!contentArea) {
    throw new Error('无法找到Notion页面内容，请确保页面已完全加载，并在文章页面使用本插件');
  }

  const blocks = parseNotionBlocks(Array.from(contentArea.children), links, 0);
  return { type: 'notion', title, blocks, links };
}

function getNotionTitle() {
  const candidates = [
    document.querySelector('.notion-page-block [data-content-editable-leaf]'),
    document.querySelector('.notion-title [data-content-editable-leaf]'),
    document.querySelector('[placeholder="Untitled"][contenteditable]'),
    document.querySelector('[data-block-type="page"] [data-content-editable-leaf]'),
    document.querySelector('.notion-page-block .notranslate'),
  ];

  for (const el of candidates) {
    if (el && el.textContent.trim()) return el.textContent.trim();
  }

  return document.title.replace(/ ?[–—-] ?Notion$/, '').replace(/ ?\| ?Notion$/, '').trim();
}

function parseNotionBlocks(elements, links, depth) {
  const blocks = [];
  let listBuffer = { type: null, items: [] };

  for (const el of elements) {
    const blockType = getNotionBlockType(el);
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
      listBuffer.items.push(parseNotionListItem(el, blockType, links, depth));
    } else {
      if (listBuffer.items.length > 0) {
        blocks.push({ type: listBuffer.type, items: listBuffer.items });
        listBuffer = { type: null, items: [] };
      }
      const block = parseNotionBlock(el, blockType, links, depth);
      if (block) blocks.push(block);
    }
  }

  if (listBuffer.items.length > 0) {
    blocks.push({ type: listBuffer.type, items: listBuffer.items });
  }

  return blocks;
}

function getNotionBlockType(el) {
  if (!el) return null;

  // ── 新版 Notion：优先检查 data-block-type ──
  const dataType = el.getAttribute && el.getAttribute('data-block-type');
  if (dataType) {
    const dataMap = {
      'header': 'h1',
      'sub_header': 'h2',
      'sub_sub_header': 'h3',
      'text': 'paragraph',
      'quote': 'quote',
      'code': 'code',
      'callout': 'callout',
      'divider': 'divider',
      'bulleted_list': 'bulleted_list',
      'numbered_list': 'numbered_list',
      'image': 'image',
      'video': 'video',
      'toggle': 'toggle',
      'column_list': 'column_list',
      'bookmark': 'bookmark',
      'to_do': 'todo',
      'table': 'table',
      'embed': 'embed',
      'link_preview': 'embed',
      'synced_block': 'synced',
    };
    if (dataMap[dataType]) return dataMap[dataType];
  }

  // ── 旧版 Notion：通过 class 检测 ──
  const cls = typeof el.className === 'string' ? el.className : '';
  const typeMap = [
    ['notion-header-block', 'h1'],
    ['notion-sub_header-block', 'h2'],
    ['notion-sub_sub_header-block', 'h3'],
    ['notion-text-block', 'paragraph'],
    ['notion-quote-block', 'quote'],
    ['notion-code-block', 'code'],
    ['notion-callout-block', 'callout'],
    ['notion-divider-block', 'divider'],
    ['notion-bulleted_list-block', 'bulleted_list'],
    ['notion-numbered_list-block', 'numbered_list'],
    ['notion-image-block', 'image'],
    ['notion-video-block', 'video'],
    ['notion-toggle-block', 'toggle'],
    ['notion-column_list-block', 'column_list'],
    ['notion-bookmark-block', 'bookmark'],
    ['notion-to_do-block', 'todo'],
    ['notion-table-block', 'table'],
    ['notion-embed-block', 'embed'],
  ];

  for (const [clsCheck, type] of typeMap) {
    if (cls.includes(clsCheck)) return type;
  }
  return null;
}

function parseNotionBlock(el, blockType, links, depth) {
  switch (blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return { type: blockType, content: extractNotionRichText(el, links) };

    case 'paragraph':
      return { type: 'paragraph', content: extractNotionRichText(el, links) };

    case 'quote':
      return { type: 'quote', content: extractNotionRichText(el, links) };

    case 'code':
      return parseNotionCodeBlock(el);

    case 'callout':
      return parseNotionCallout(el, links);

    case 'divider':
      return { type: 'divider' };

    case 'image':
      return parseNotionImage(el);

    case 'video':
      return parseNotionVideo(el);

    case 'toggle':
      return parseNotionToggle(el, links, depth);

    case 'bookmark':
      return parseNotionBookmark(el, links);

    case 'todo':
      return {
        type: 'todo',
        content: extractNotionRichText(el, links),
        checked: !!el.querySelector('[aria-checked="true"]'),
      };

    case 'table':
      return parseNotionTable(el, links);

    case 'embed':
      return parseNotionEmbed(el, links);

    case 'synced':
      // 同步块：递归解析内部内容
      return parseNotionSynced(el, links, depth);

    case 'column_list':
      return parseNotionColumnList(el, links, depth);

    default:
      return null;
  }
}

// 提取 Notion 块内的富文本（保留粗体、斜体、代码、链接）
function extractNotionRichText(blockEl, links) {
  const contentEl =
    blockEl.querySelector('[contenteditable]') ||
    blockEl.querySelector('[data-content-editable-leaf]') ||
    blockEl;

  return convertNodeToHtml(contentEl, links);
}

function convertNodeToHtml(node, links) {
  let html = '';

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      html += escapeHtml(child.textContent);
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const tag = child.tagName.toLowerCase();
    const style = child.getAttribute('style') || '';
    const innerHtml = convertNodeToHtml(child, links);

    if (tag === 'br') { html += '<br>'; continue; }

    if (tag === 'code') {
      html += `<code>${escapeHtml(child.textContent)}</code>`;
      continue;
    }

    if (tag === 'a') {
      const href = child.getAttribute('href') || '';
      const text = child.textContent.trim();
      if (href && !href.startsWith('#') && text) {
        const existing = links.findIndex(l => l.url === href);
        const idx = existing >= 0 ? existing + 1 : (links.push({ text, url: href }), links.length);
        html += `${escapeHtml(text)}<sup>[${idx}]</sup>`;
      } else {
        html += escapeHtml(text);
      }
      continue;
    }

    if (tag === 'span') {
      const isBold =
        style.includes('font-weight:600') || style.includes('font-weight: 600') ||
        style.includes('font-weight:700') || style.includes('font-weight: 700') ||
        child.classList.contains('notion-bold');
      const isItalic =
        style.includes('font-style:italic') || style.includes('font-style: italic') ||
        child.classList.contains('notion-italic');
      const isStrike =
        style.includes('line-through') || child.classList.contains('notion-strikethrough');
      const isUnder =
        (style.includes('underline') && !style.includes('line-through')) ||
        child.classList.contains('notion-underline');

      let result = innerHtml;
      if (isBold) result = `<strong>${result}</strong>`;
      if (isItalic) result = `<em>${result}</em>`;
      if (isStrike) result = `<s>${result}</s>`;
      if (isUnder) result = `<u>${result}</u>`;
      html += result;
      continue;
    }

    html += innerHtml;
  }

  return html;
}

function parseNotionCodeBlock(el) {
  const langEl =
    el.querySelector('.notion-code-block-language') ||
    el.querySelector('[aria-label]') ||
    el.querySelector('select') ||
    el.querySelector('[class*="language"]');

  let language = 'plaintext';
  if (langEl) {
    language =
      langEl.getAttribute('aria-label') ||
      langEl.value ||
      langEl.textContent.trim() ||
      'plaintext';
  }

  const codeEl =
    el.querySelector('pre') ||
    el.querySelector('[spellcheck="false"]') ||
    el.querySelector('[contenteditable]');

  return { type: 'code', language, content: codeEl ? codeEl.textContent : '' };
}

function parseNotionCallout(el, links) {
  const iconEl =
    el.querySelector('.notion-record-icon') ||
    el.querySelector('[class*="icon"]') ||
    el.querySelector('[class*="emoji"]');
  const icon = iconEl ? iconEl.textContent.trim() : '💡';

  const clone = el.cloneNode(true);
  const cloneIcon =
    clone.querySelector('.notion-record-icon') ||
    clone.querySelector('[class*="icon"]');
  if (cloneIcon) cloneIcon.remove();

  return { type: 'callout', icon, content: convertNodeToHtml(clone, links) };
}

function parseNotionImage(el) {
  const imgEl = el.querySelector('img');
  if (!imgEl) return null;

  // currentSrc = 浏览器实际加载的 URL（经 srcset 选择后的绝对 URL）
  // img.src    = JS 属性，给出绝对 URL（比 getAttribute 更可靠）
  // 跳过 blob: 地址（本地缓存，无法被外部 fetch 重取）
  const current  = imgEl.currentSrc || '';
  const domSrc   = imgEl.src || '';
  const attrSrc  = imgEl.getAttribute('src') || '';
  const srcset   = imgEl.getAttribute('srcset') || imgEl.srcset || '';
  const srcsetFirst = srcset ? srcset.split(',')[0].trim().split(/\s+/)[0] : '';

  const src = [current, domSrc, attrSrc, srcsetFirst]
    .find(s => s && !s.startsWith('blob:') && !s.startsWith('data:')) || '';

  if (!src) return null;

  const captionEl =
    el.querySelector('[placeholder="Add a caption"]') ||
    el.querySelector('[class*="caption"]');
  const caption = captionEl ? captionEl.textContent.trim() : '';

  return { type: 'image', url: src, caption };
}

function parseNotionVideo(el) {
  const videoEl = el.querySelector('video');
  const iframeEl = el.querySelector('iframe');
  let url = '', thumbnailUrl = '';

  if (videoEl) {
    url = videoEl.getAttribute('src') || '';
    thumbnailUrl = videoEl.getAttribute('poster') || '';
  } else if (iframeEl) {
    url = iframeEl.getAttribute('src') || '';
  }

  const imgEl = el.querySelector('img');
  if (imgEl && !thumbnailUrl) thumbnailUrl = imgEl.getAttribute('src') || '';

  return { type: 'video', url, thumbnailUrl };
}

function parseNotionToggle(el, links, depth) {
  const summaryEl =
    el.querySelector('[contenteditable]') ||
    el.querySelector('[data-content-editable-leaf]');
  const summary = summaryEl ? convertNodeToHtml(summaryEl, links) : '';

  const childrenContainer =
    el.querySelector('[class*="toggle-content"]') ||
    el.querySelector('[class*="children"]');

  let children = [];
  if (childrenContainer && depth < 5) {
    children = parseNotionBlocks(Array.from(childrenContainer.children), links, depth + 1);
  }

  return { type: 'toggle', content: summary, children };
}

function parseNotionColumnList(el, links, depth) {
  const columns = el.querySelectorAll('[class*="notion-column-block"]');
  const columnBlocks = [];

  for (const col of columns) {
    columnBlocks.push(parseNotionBlocks(Array.from(col.children), links, depth + 1));
  }

  return { type: 'column_list', columns: columnBlocks };
}

function parseNotionBookmark(el, links) {
  const linkEl = el.querySelector('a');
  if (!linkEl) return null;

  const url = linkEl.getAttribute('href') || '';
  const titleEl =
    el.querySelector('[class*="title"]') ||
    el.querySelector('strong') ||
    el.querySelector('[class*="bookmark-title"]');
  const text = titleEl ? titleEl.textContent.trim() : url;

  if (url) {
    links.push({ text, url });
    return { type: 'bookmark', text, url, linkIndex: links.length };
  }
  return null;
}

// ── 新增：表格解析 ─────────────────────────────────────────────────────────

function parseNotionTable(el, links) {
  const rows = [];
  // 新旧版都兼容
  const rowEls = el.querySelectorAll(
    '.notion-table_row-block, [data-block-type="table_row"], [class*="table-row"]'
  );

  rowEls.forEach((rowEl, rowIndex) => {
    const cellEls = rowEl.querySelectorAll(
      '.notion-cell-block, [class*="cell"], td, [data-block-type="table_cell"]'
    );
    const cells = [];
    cellEls.forEach(cellEl => cells.push(extractNotionRichText(cellEl, links)));

    if (cells.length > 0) {
      rows.push({ cells, isHeader: rowIndex === 0 });
    }
  });

  // 如果没找到标准行元素，尝试直接遍历子元素
  if (rows.length === 0) {
    Array.from(el.children).forEach((rowEl, rowIndex) => {
      const cellEls = rowEl.querySelectorAll('td, th, [class*="cell"]');
      if (cellEls.length === 0) return;
      const cells = [];
      cellEls.forEach(cellEl => cells.push(extractNotionRichText(cellEl, links)));
      rows.push({ cells, isHeader: rowIndex === 0 });
    });
  }

  return rows.length > 0 ? { type: 'table', rows } : null;
}

// ── 新增：嵌入/数据库块解析 ────────────────────────────────────────────────

function parseNotionEmbed(el, links) {
  const linkEl = el.querySelector('a');
  const iframeEl = el.querySelector('iframe');
  const url = (linkEl && linkEl.getAttribute('href')) ||
               (iframeEl && iframeEl.getAttribute('src')) || '';

  const titleEl = el.querySelector('[class*="title"]') || el.querySelector('strong');
  const title = titleEl ? titleEl.textContent.trim() : '嵌入内容';

  return url ? { type: 'embed', url, title } : null;
}

// ── 新增：同步块解析 ─────────────────────────────────────────────────────

function parseNotionSynced(el, links, depth) {
  if (depth >= 5) return null;
  const inner = el.querySelector('[class*="synced-block"]') || el;
  const children = parseNotionBlocks(Array.from(inner.children), links, depth + 1);
  // 扁平化同步块内容
  return children.length > 0 ? children[0] : null;
}

function parseNotionListItem(el, listType, links, depth) {
  const content = extractNotionRichText(el, links);
  const nestedLists = el.querySelectorAll(
    ':scope .notion-bulleted_list-block, :scope .notion-numbered_list-block, ' +
    ':scope [data-block-type="bulleted_list"], :scope [data-block-type="numbered_list"]'
  );

  let children = [];
  if (nestedLists.length > 0 && depth < 5) {
    children = parseNotionBlocks(Array.from(nestedLists), links, depth + 1);
  }

  return { content, children };
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

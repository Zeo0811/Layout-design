// Notion 页面 DOM 解析器
// 将 Notion DOM 结构转换为中间 JSON 表示

function parseNotion() {
  const title = getNotionTitle();
  const links = []; // 脚注收集器

  // 查找页面内容区域（支持多种选择器以应对版本变化）
  const contentArea =
    document.querySelector('.notion-page-content') ||
    document.querySelector('[class*="notionPage"]') ||
    document.querySelector('main');

  if (!contentArea) {
    throw new Error('无法找到Notion页面内容，请确保页面已完全加载，并在文章页面使用本插件');
  }

  const blocks = parseNotionBlocks(Array.from(contentArea.children), links, 0);

  return { type: 'notion', title, blocks, links };
}

function getNotionTitle() {
  // 优先级顺序尝试获取标题
  const candidates = [
    document.querySelector('.notion-page-block [data-content-editable-leaf]'),
    document.querySelector('.notion-title [data-content-editable-leaf]'),
    document.querySelector('[placeholder="Untitled"][contenteditable]'),
    document.querySelector('.notion-page-block .notranslate'),
  ];

  for (const el of candidates) {
    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }
  }

  return document.title.replace(' - Notion', '').replace(' | Notion', '').trim();
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
      // 刷新列表缓冲
      if (listBuffer.items.length > 0) {
        blocks.push({ type: listBuffer.type, items: listBuffer.items });
        listBuffer = { type: null, items: [] };
      }

      const block = parseNotionBlock(el, blockType, links, depth);
      if (block) blocks.push(block);
    }
  }

  // 刷新末尾的列表
  if (listBuffer.items.length > 0) {
    blocks.push({ type: listBuffer.type, items: listBuffer.items });
  }

  return blocks;
}

function getNotionBlockType(el) {
  if (!el || !el.className) return null;
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
  ];

  for (const [cls_check, type] of typeMap) {
    if (cls.includes(cls_check)) return type;
  }
  return null;
}

function parseNotionBlock(el, blockType, links, depth) {
  switch (blockType) {
    case 'h1':
    case 'h2':
    case 'h3':
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

    case 'column_list':
      return parseNotionColumnList(el, links, depth);

    default:
      return null;
  }
}

// 提取 Notion 块内的富文本内容（保留加粗、斜体、代码、链接）
function extractNotionRichText(blockEl, links) {
  // 找到真正的文字容器
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

    if (tag === 'br') {
      html += '<br>';
      continue;
    }

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
      // 检测 Notion 的内联样式
      const isBold =
        style.includes('font-weight:600') ||
        style.includes('font-weight: 600') ||
        child.classList.contains('notion-bold');
      const isItalic =
        style.includes('font-style:italic') ||
        style.includes('font-style: italic') ||
        child.classList.contains('notion-italic');
      const isStrike =
        style.includes('line-through') ||
        child.classList.contains('notion-strikethrough');
      const isUnder =
        style.includes('underline') && !style.includes('line-through') ||
        child.classList.contains('notion-underline');

      let result = innerHtml;
      if (isBold) result = `<strong>${result}</strong>`;
      if (isItalic) result = `<em>${result}</em>`;
      if (isStrike) result = `<s>${result}</s>`;
      if (isUnder) result = `<u>${result}</u>`;
      html += result;
      continue;
    }

    // 其他元素递归处理
    html += innerHtml;
  }

  return html;
}

function parseNotionCodeBlock(el) {
  // 语言标签可能在不同位置
  const langEl =
    el.querySelector('.notion-code-block-language') ||
    el.querySelector('[aria-label]') ||
    el.querySelector('select');

  let language = 'plaintext';
  if (langEl) {
    language =
      langEl.getAttribute('aria-label') ||
      langEl.value ||
      langEl.textContent.trim() ||
      'plaintext';
  }

  // 代码内容
  const codeEl =
    el.querySelector('pre') ||
    el.querySelector('[spellcheck="false"]') ||
    el.querySelector('[contenteditable]');

  const code = codeEl ? codeEl.textContent : '';

  return { type: 'code', language, content: code };
}

function parseNotionCallout(el, links) {
  // 获取 Emoji 图标
  const iconEl =
    el.querySelector('.notion-record-icon') ||
    el.querySelector('[class*="icon"]');
  const icon = iconEl ? iconEl.textContent.trim() : '💡';

  // 获取文本内容（排除图标部分）
  const clone = el.cloneNode(true);
  const cloneIcon = clone.querySelector('.notion-record-icon') || clone.querySelector('[class*="icon"]');
  if (cloneIcon) cloneIcon.remove();

  const content = convertNodeToHtml(clone, links);

  return { type: 'callout', icon, content };
}

function parseNotionImage(el) {
  const imgEl = el.querySelector('img');
  if (!imgEl) return null;

  const src = imgEl.getAttribute('src') || '';
  const captionEl =
    el.querySelector('[placeholder="Add a caption"]') ||
    el.querySelector('[class*="caption"]');
  const caption = captionEl ? captionEl.textContent.trim() : '';

  return { type: 'image', url: src, caption };
}

function parseNotionVideo(el) {
  const videoEl = el.querySelector('video');
  const iframeEl = el.querySelector('iframe');

  let url = '';
  let thumbnailUrl = '';

  if (videoEl) {
    url = videoEl.getAttribute('src') || '';
    thumbnailUrl = videoEl.getAttribute('poster') || '';
  } else if (iframeEl) {
    url = iframeEl.getAttribute('src') || '';
  }

  // 获取缩略图
  const imgEl = el.querySelector('img');
  if (imgEl && !thumbnailUrl) {
    thumbnailUrl = imgEl.getAttribute('src') || '';
  }

  return { type: 'video', url, thumbnailUrl };
}

function parseNotionToggle(el, links, depth) {
  const summaryEl =
    el.querySelector('[contenteditable]') ||
    el.querySelector('[data-content-editable-leaf]');
  const summary = summaryEl ? convertNodeToHtml(summaryEl, links) : '';

  // 查找子内容容器
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
    const blocks = parseNotionBlocks(Array.from(col.children), links, depth + 1);
    columnBlocks.push(blocks);
  }

  return { type: 'column_list', columns: columnBlocks };
}

function parseNotionBookmark(el, links) {
  const linkEl = el.querySelector('a');
  if (!linkEl) return null;

  const url = linkEl.getAttribute('href') || '';
  const titleEl = el.querySelector('[class*="title"]') || el.querySelector('strong');
  const text = titleEl ? titleEl.textContent.trim() : url;

  if (url) {
    links.push({ text, url });
    return { type: 'bookmark', text, url, linkIndex: links.length };
  }

  return null;
}

function parseNotionListItem(el, listType, links, depth) {
  const content = extractNotionRichText(el, links);

  // 查找嵌套列表
  const nestedLists = el.querySelectorAll(
    ':scope .notion-bulleted_list-block, :scope .notion-numbered_list-block'
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

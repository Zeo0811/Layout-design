// WeChat 公众号 HTML 格式化器
// 样式直接从 style.js tech_black 主题（+ commonStyles）原值复用，零修改
// 迭代：正文加粗颜色改为 #407600

// ── 代码语法高亮色表（来自 codeBlockTheme.js defaultTheme，原值不改）────
const CODE_THEME = {
  'hljs-comment':           { color: '#697070' },
  'hljs-punctuation':       { color: '#444a' },
  'hljs-tag':               { color: '#444a' },
  'hljs-attribute':         { 'font-weight': '700' },
  'hljs-doctag':            { 'font-weight': '700' },
  'hljs-keyword':           { 'font-weight': '700' },
  'hljs-name':              { 'font-weight': '700' },
  'hljs-selector-tag':      { 'font-weight': '700' },
  'hljs-deletion':          { color: '#800' },
  'hljs-number':            { color: '#800' },
  'hljs-quote':             { color: '#800' },
  'hljs-selector-class':    { color: '#800' },
  'hljs-selector-id':       { color: '#800' },
  'hljs-string':            { color: '#800' },
  'hljs-template-tag':      { color: '#800' },
  'hljs-type':              { color: '#800' },
  'hljs-section':           { color: '#800', 'font-weight': '700' },
  'hljs-title':             { color: '#800', 'font-weight': '700' },
  'hljs-link':              { color: '#ab5656' },
  'hljs-operator':          { color: '#ab5656' },
  'hljs-regexp':            { color: '#ab5656' },
  'hljs-selector-attr':     { color: '#ab5656' },
  'hljs-selector-pseudo':   { color: '#ab5656' },
  'hljs-symbol':            { color: '#ab5656' },
  'hljs-template-variable': { color: '#ab5656' },
  'hljs-variable':          { color: '#ab5656' },
  'hljs-literal':           { color: '#695' },
  'hljs-addition':          { color: '#397300' },
  'hljs-built_in':          { color: '#397300' },
  'hljs-bullet':            { color: '#397300' },
  'hljs-code':              { color: '#397300' },
  'hljs-meta':              { color: '#1f7199' },
  'hljs-emphasis':          { 'font-style': 'italic' },
  'hljs-strong':            { 'font-weight': '700' },
};

// ── 样式状态 ─────────────────────────────────────────────────────────
const DEFAULT_STYLE_MAP = window.LayoutStyleSchema ? window.LayoutStyleSchema.getDefaultStyle() : {};
let ACTIVE_STYLE = JSON.parse(JSON.stringify(DEFAULT_STYLE_MAP));

function setFormatterStyle(styleMap) {
  if (window.LayoutStyleSchema) {
    ACTIVE_STYLE = window.LayoutStyleSchema.sanitizeStyle(styleMap || {});
  } else {
    ACTIVE_STYLE = Object.assign({}, styleMap || DEFAULT_STYLE_MAP);
  }
}

function runWithStyle(styleMap, fn) {
  if (!styleMap) return fn();
  const prev = ACTIVE_STYLE;
  setFormatterStyle(styleMap);
  try {
    return fn();
  } finally {
    ACTIVE_STYLE = prev;
  }
}

// ── 主入口 ───────────────────────────────────────────────────────────────

function formatToWechat(parsedData) {
  if (!parsedData || !parsedData.blocks) {
    return '<p style="color:red">解析数据为空，请重试</p>';
  }
  const { blocks, links = [] } = parsedData;
  let html = '';
  for (const block of blocks) html += renderBlock(block, links, 0);
  if (links.length > 0) html += renderFootnotes(links);
  return `<section style="${ACTIVE_STYLE.wrapper}">${html}</section>`;
}

// ── Block 渲染 ────────────────────────────────────────────────────────────

function renderBlock(block, links, depth) {
  if (!block) return '';
  switch (block.type) {
    case 'h1': return `<section style="${ACTIVE_STYLE.h1}">${pi(block.content)}</section>`;
    case 'h2': return `<section style="${ACTIVE_STYLE.h2}">${pi(block.content)}</section>`;
    case 'h3': return `<section style="${ACTIVE_STYLE.h3}">${pi(block.content)}</section>`;
    case 'h4': return `<section style="${ACTIVE_STYLE.h4}">${pi(block.content)}</section>`;
    case 'h5': return `<section style="${ACTIVE_STYLE.h5}">${pi(block.content)}</section>`;
    case 'h6': return `<section style="${ACTIVE_STYLE.h6}">${pi(block.content)}</section>`;

    case 'paragraph': {
      const text = (block.content || '').trim();
      if (!text) return '<br>';
      return `<p style="${ACTIVE_STYLE.p}">${pi(block.content)}</p>`;
    }

    case 'quote':
      return `<section style="${ACTIVE_STYLE.blockquote_wrapper}"><p style="${ACTIVE_STYLE.blockquote_text}">${pi(block.content)}</p></section>`;

    case 'callout':
      return renderCallout(block);

    case 'code':
      return renderCodeBlock(block);

    case 'divider':
      return `<section style="${ACTIVE_STYLE.hr}"></section>`;

    case 'bulleted_list':
      return renderList(block.items, false, depth);

    case 'numbered_list':
      return renderList(block.items, true, depth);

    case 'image':
      return renderImage(block);

    case 'video':
      return renderVideo(block);

    case 'toggle':
      return renderToggle(block, links, depth);

    case 'bookmark':
      // a（tech_black）：color:#222222; border-bottom:1px solid #222222
      return `<p style="${ACTIVE_STYLE.p}">🔗 <a href="${escAttr(block.url)}" style="text-decoration:none;color:#222222;border-bottom:1px solid #222222;word-break:break-all;">${escHtml(block.text || block.url)}</a><sup style="color:#222222;font-size:.7em;font-weight:bold;line-height:0;">[${block.linkIndex}]</sup></p>`;

    case 'todo':
      if (block.checked) {
        return `<p style="${ACTIVE_STYLE.p}">✅ <span style="text-decoration:line-through;color:#aaaaaa;">${pi(block.content)}</span></p>`;
      }
      return `<p style="${ACTIVE_STYLE.p}">☐ ${pi(block.content)}</p>`;

    case 'table':
      return renderTable(block);

    case 'embed':
      return `<section style="${ACTIVE_STYLE.embed_wrapper}"><p style="${ACTIVE_STYLE.embed_label}">📎 ${escHtml(block.title || '嵌入内容')}</p>${block.url ? `<p style="${ACTIVE_STYLE.embed_link}">${escHtml(block.url)}</p>` : ''}</section>`;

    case 'column_list':
      if (!block.columns) return '';
      return block.columns.map(col => col.map(b => renderBlock(b, links, depth)).join('')).join('');

    default:
      return '';
  }
}

// ── Callout（对标 section.styled-callout 结构）───────────────────────────
// 外层：section.styled-callout
// 内层头部：section.header-wrapper > section.styled-callout-header（图标+厚左边框）
// 内层内容：section.wechat-callout-block

function renderCallout(block) {
  const icon = block.icon || '💡';
  return (
    `<section style="${ACTIVE_STYLE.callout_wrapper}">` +
      `<section>` +
        `<section style="${ACTIVE_STYLE.callout_header}">${icon}</section>` +
      `</section>` +
      `<section style="${ACTIVE_STYLE.callout_content}">${pi(block.content)}</section>` +
    `</section>`
  );
}

// ── 代码块（含 hljs 语法高亮，内联 style）───────────────────────────────

function applyHljsStyles(html) {
  return html.replace(/<span class="([^"]+)">/g, (_, classStr) => {
    const styles = {};
    for (const cls of classStr.split(' ')) {
      if (CODE_THEME[cls]) Object.assign(styles, CODE_THEME[cls]);
    }
    const s = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';');
    return s ? `<span style="${s}">` : '<span>';
  });
}

function renderCodeBlock(block) {
  const rawLang = (block.language || '').toLowerCase().trim();
  const lang    = (rawLang === 'plaintext' || rawLang === 'plain text') ? '' : rawLang;
  const rawCode = block.content || '';

  let codeHtml;
  try {
    if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
      codeHtml = applyHljsStyles(hljs.highlight(rawCode, { language: lang }).value);
    } else if (typeof hljs !== 'undefined') {
      codeHtml = applyHljsStyles(hljs.highlightAuto(rawCode).value);
    } else {
      codeHtml = escHtml(rawCode);
    }
  } catch (_) {
    codeHtml = escHtml(rawCode);
  }

  const dot = (color) => `<section style="width:10px;height:10px;border-radius:50%;background-color:${color};font-size:0;line-height:0;overflow:hidden;">&nbsp;</section>`;
  const topBar = `<section style="display:flex;flex-direction:row;align-items:center;column-gap:6px;margin-bottom:4px;">${dot('#ed6c60')}${dot('#f7c151')}${dot('#64c856')}</section>`;
  const langBar = lang ? `<div style="${ACTIVE_STYLE.code_lang_bar}">${escHtml(lang)}</div>` : '';
  return `<section style="${ACTIVE_STYLE.code_wrapper}">${topBar}${langBar}<pre style="${ACTIVE_STYLE.code_pre}"><code style="${ACTIVE_STYLE.code_text}">${codeHtml}</code></pre></section>`;
}

// ── 列表（微信公众号不支持 ul/ol/li 及 list-style-type，改用 p + 手动标记）────

function renderList(items, isOrdered, depth) {
  if (!items || items.length === 0) return '';
  const indent = depth > 0 ? `padding-left: ${depth * 1.5}em;` : '';
  const baseStyle = `${ACTIVE_STYLE.li_p || ACTIVE_STYLE.p || ''} ${indent}`;
  const markerStyle = `display: inline-block; min-width: 1.5em; margin-right: 0.3em;`;

  let html = '';
  items.forEach((item, index) => {
    const marker = isOrdered ? `${index + 1}.` : '•';
    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) nested += renderBlock(child, [], depth + 1);
    }
    html += `<p style="${baseStyle}"><span style="${markerStyle}">${marker}</span>${pi(item.content)}</p>${nested}`;
  });
  return html;
}

// ── 图片 ──────────────────────────────────────────────────────────────────

function renderImage(block) {
  const src = block.base64 || block.url;
  if (!src) return '';
  const cap = block.caption ? `<p style="${ACTIVE_STYLE.img_caption}">${escHtml(block.caption)}</p>` : '';
  return `<section style="${ACTIVE_STYLE.img_wrapper}"><img src="${escAttr(src)}" style="${ACTIVE_STYLE.img}" alt="${escAttr(block.caption || '图片')}" />${cap}</section>`;
}

// ── 视频 ─────────────────────────────────────────────────────────────────

function renderVideo(block) {
  if (block.thumbnailUrl) {
    return `<section style="${ACTIVE_STYLE.img_wrapper}"><img src="${escAttr(block.thumbnailUrl)}" style="${ACTIVE_STYLE.img}" alt="视频封面" /><p style="${ACTIVE_STYLE.img_caption}">📹 视频内容请前往原文查看</p></section>`;
  }
  return `<section style="${ACTIVE_STYLE.video_wrapper}"><p style="${ACTIVE_STYLE.video_label}">📹 视频内容请前往原文查看</p></section>`;
}

// ── Toggle ────────────────────────────────────────────────────────────────

function renderToggle(block, links, depth) {
  // 嵌套 toggle（depth > 0）不再显示三角和黑色左边框，避免与外层 toggle_content 的灰线重叠
  const summaryHtml = depth === 0
    ? `<section style="${ACTIVE_STYLE.toggle_summary}">▶ ${pi(block.content)}</section>`
    : `<p style="${ACTIVE_STYLE.p}">${pi(block.content)}</p>`;
  let html = summaryHtml;
  if (block.children && block.children.length > 0) {
    html += `<section style="${ACTIVE_STYLE.toggle_content}">${block.children.map(b => renderBlock(b, links, depth + 1)).join('')}</section>`;
  }
  return html;
}

// ── 表格 ─────────────────────────────────────────────────────────────────

function renderTable(block) {
  if (!block.rows || block.rows.length === 0) return '';
  let rows = '';
  block.rows.forEach((row, ri) => {
    const isHeader = row.isHeader || ri === 0;
    const cells = (row.cells || []).map(cell => {
      const style = isHeader ? ACTIVE_STYLE.th : (ri % 2 === 0 ? ACTIVE_STYLE.td_even : ACTIVE_STYLE.td);
      return `<td style="${style}">${pi(cell)}</td>`;
    }).join('');
    rows += `<tr>${cells}</tr>`;
  });
  return `<section style="${ACTIVE_STYLE.table_wrapper}"><table style="${ACTIVE_STYLE.table}">${rows}</table></section>`;
}

// ── 脚注 ─────────────────────────────────────────────────────────────────

function renderFootnotes(links) {
  const items = links.map((link, i) =>
    `<p style="${ACTIVE_STYLE.footnote_item}"><span style="${ACTIVE_STYLE.footnote_num}">[${i + 1}]</span>${escHtml(link.text)}：<span style="color:#888888">${escHtml(link.url)}</span></p>`
  ).join('');
  return `<section style="${ACTIVE_STYLE.footnotes_wrapper}"><p style="${ACTIVE_STYLE.footnotes_title}">参考资料</p>${items}</section>`;
}

// ── 内联样式处理 ──────────────────────────────────────────────────────────
// p_span（tech_black）：color:#222222; word-break:break-all; border-bottom:1px solid #222222
// a（tech_black）：text-decoration:none; color:#222222; border-bottom:1px solid #222222

function pi(html) {
  if (!html) return '';
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g,
      `<strong style="${ACTIVE_STYLE.strong}">$1</strong>`)
    .replace(/<em>([\s\S]*?)<\/em>/g,
      `<em style="${ACTIVE_STYLE.em}">$1</em>`)
    .replace(/<code>([\s\S]*?)<\/code>/g,
      `<code style="${ACTIVE_STYLE.code_inline}">$1</code>`)
    .replace(/<s>([\s\S]*?)<\/s>/g,
      `<s style="${ACTIVE_STYLE.s}">$1</s>`)
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      `<a href="$1" style="text-decoration:none;color:#222222;border-bottom:1px solid #222222;word-break:break-all;">$2</a>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g,
      `<sup style="font-size:.7em;color:#222222;font-weight:bold;line-height:0;vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── 分段格式化（用于分段复制，避免大内容卡内存）────────────────────────────
// 返回 n 个 HTML 字符串数组，每段独立可粘贴；footnotes 仅保留在最后一段

function splitFormatToWechat(parsedData, n) {
  if (!parsedData || !parsedData.blocks || parsedData.blocks.length === 0) return [];
  const { blocks, links = [] } = parsedData;
  const size = Math.ceil(blocks.length / n);
  const result = [];

  for (let i = 0; i < blocks.length; i += size) {
    const chunk = blocks.slice(i, i + size);
    const isLast = i + size >= blocks.length;
    let html = '';
    for (const block of chunk) html += renderBlock(block, links, 0);
    if (isLast && links.length > 0) html += renderFootnotes(links);
    if (html.trim()) result.push(`<section style="${ACTIVE_STYLE.wrapper}">${html}</section>`);
  }

  return result;
}

// ── 对外 API ────────────────────────────────────────────────────────────

window.LayoutFormatter = {
  format(parsedData, styleMap) {
    return runWithStyle(styleMap, () => formatToWechat(parsedData));
  },
  split(parsedData, n, styleMap) {
    return runWithStyle(styleMap, () => splitFormatToWechat(parsedData, n));
  },
  setStyle: setFormatterStyle,
  getDefaultStyle() {
    return window.LayoutStyleSchema ? window.LayoutStyleSchema.getDefaultStyle() : JSON.parse(JSON.stringify(DEFAULT_STYLE_MAP));
  },
  getActiveStyle() {
    return JSON.parse(JSON.stringify(ACTIVE_STYLE));
  },
};

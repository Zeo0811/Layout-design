// WeChat 公众号 HTML 格式化器 —— 科技黑主题
// 完全对标参考扩展 tech_black 样式，含语法高亮

// ── 字体 ─────────────────────────────────────────────────────────────────
const FONT = "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif";
const MONO = 'Operator Mono, Consolas, Monaco, Menlo, monospace';

// ── 颜色（科技黑单色系）──────────────────────────────────────────────────
const C = {
  fg0:   '#222222',
  fg1:   '#555555',
  fg2:   '#888888',
  sep:   'rgba(0,0,0,.15)',
  bg1:   '#f5f5f5',
  bg2:   '#FFFFFF',
};

// ── 代码语法高亮颜色表（来自参考 codeBlockTheme.js defaultTheme）───────
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

// ── 内联样式定义（绝对 px，微信兼容）────────────────────────────────────
const S = {
  // 外层容器
  wrapper: `font-family: ${FONT}; font-size: 15px; color: ${C.fg0}; line-height: 1.75; letter-spacing: 0.1em; word-wrap: break-word; hyphens: auto;`,

  // 标题
  h1: `display: block; font-size: 24px; font-weight: bold; color: ${C.fg0}; margin: 80px auto 40px auto; padding: 0 1em; text-align: center; border-bottom: 8px solid ${C.fg0}; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h2: `display: block; font-size: 20px; font-weight: bold; color: ${C.fg0}; margin: 40px auto; padding: 0 0.2em; text-align: center; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h3: `display: block; font-size: 17px; font-weight: bold; color: ${C.fg0}; margin: 40px 0; text-align: left; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h4: `display: block; font-size: 16px; font-weight: bold; color: ${C.fg0}; margin: 1em 0 .5em; font-family: ${FONT};`,
  h5: `display: block; font-size: 15px; font-weight: bold; color: ${C.fg0}; margin: .8em 0 .4em; font-family: ${FONT};`,
  h6: `display: block; font-size: 14px; font-weight: bold; color: ${C.fg1}; margin: .7em 0 .35em; font-family: ${FONT};`,

  // 段落
  p: `font-size: 15px; line-height: 1.75; color: rgb(63,63,63); margin: 10px 0; letter-spacing: 0.1em; white-space: pre-line; font-family: ${FONT};`,

  // 行内格式
  strong:      `font-weight: 600; color: ${C.fg0};`,
  em:          `font-style: italic;`,
  code_inline: `background: rgba(135,131,120,.15); padding: 0.2em 0.4em; border-radius: 4px; font-family: ${MONO}; font-size: 85%; color: ${C.fg0};`,
  s:           `text-decoration: line-through; color: ${C.fg2};`,

  // 引用：8px 左边框 + 灰色背景
  blockquote_wrapper: `display: block; overflow: auto; border-left: 8px solid ${C.fg0}; background-color: ${C.bg1}; padding: 10px; margin: 20px 0; hyphens: auto; text-align: left; font-family: ${FONT};`,
  blockquote_text:    `font-size: 15px; line-height: 1.75; color: ${C.fg1}; margin: 0; letter-spacing: 0.1em;`,

  // Callout：白底 + 右/底虚线
  callout_wrapper: `display: flex; gap: 10px; align-items: flex-start; background-color: ${C.bg2}; border-bottom: 1px dashed ${C.fg0}; border-right: 1px dashed ${C.fg0}; font-size: 15px; white-space: normal; margin: 20px 0; color: rgba(0,0,0,.9); font-family: ${FONT}; line-height: 1.75; padding: 12px;`,
  callout_icon:    `font-size: 17px; flex-shrink: 0; line-height: 1.5;`,
  callout_content: `font-size: 15px; line-height: 1.75; color: #3f3f3f; flex: 1; padding: 0 12px 15px; letter-spacing: 0.1em;`,

  // 代码块：浅色背景 + 阴影（对标 commonStyles.pre）
  code_wrapper:  `display: block; font-size: 15px; color: #333; position: relative; background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 5px; box-shadow: rgba(0,0,0,.3) 0px 2px 10px; overflow: auto; font-family: ${MONO}; margin: 20px 10px;`,
  code_lang_bar: `font-size: 11px; color: #999; font-family: ${MONO}; padding: 6px 10px 4px; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid #f0f0f0;`,
  code_pre:      `margin: 0; padding: 10px; overflow-x: auto; background: transparent;`,
  code_text:     `font-family: ${MONO}; font-size: 14px; line-height: 1.65; white-space: pre; word-break: normal; display: block; color: #333;`,

  // 分割线
  hr: `border: none; border-top: 1px solid #797979; margin: 15px 0; border-style: solid; border-width: 1px 0 0; border-color: #797979;`,

  // 列表
  ul: `padding-left: 1.5em; margin: 10px 0; font-size: 15px; line-height: 1.75; font-family: ${FONT}; color: rgb(63,63,63);`,
  ol: `padding-left: 1.5em; margin: 10px 0; font-size: 15px; line-height: 1.75; font-family: ${FONT}; color: rgb(63,63,63);`,
  li: `font-size: 15px; line-height: 1.75; color: rgb(63,63,63); margin: 0; font-family: ${FONT}; letter-spacing: 0.1em; list-style-position: outside;`,

  // 图片
  img_wrapper: `margin: 15px 0; text-align: center;`,
  img:         `max-width: 100%; height: auto; border-radius: 10px; display: inline-block;`,
  img_caption: `font-size: 12px; color: ${C.fg2}; margin-top: 5px; text-align: center;`,

  // 视频
  video_wrapper: `margin: 1em 0; background: #111; border-radius: 8px; padding: 28px 20px; text-align: center;`,
  video_label:   `color: rgba(255,255,255,.45); font-size: 14px;`,

  // Toggle
  toggle_summary: `font-size: 15px; font-weight: bold; color: ${C.fg0}; margin: 12px 0 5px; padding-left: 15px; border-left: 3px solid ${C.fg0}; font-family: ${FONT};`,
  toggle_content: `padding-left: 15px; border-left: 2px solid ${C.sep}; margin-left: 4px;`,

  // 表格
  table_wrapper: `overflow-x: auto; margin: 1em 0;`,
  table:         `border-collapse: collapse; width: 100%; font-size: 15px; line-height: 1.6; font-family: ${FONT};`,
  th:            `background: rgba(0,0,0,.05); padding: 7px 13px; border: 1px solid ${C.sep}; font-weight: bold; text-align: left; color: ${C.fg0};`,
  td:            `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0};`,
  td_even:       `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0}; background: rgba(0,0,0,.02);`,

  // 嵌入
  embed_wrapper: `margin: 1em 0; border: 1px solid rgba(0,0,0,.1); padding: 11px 15px;`,
  embed_label:   `font-size: 12px; color: ${C.fg2}; margin-bottom: 4px;`,
  embed_link:    `font-size: 13px; color: ${C.fg0}; border-bottom: 1px solid ${C.fg0}; word-break: break-all; text-decoration: none;`,

  // 脚注
  footnotes_wrapper: `margin-top: 30px; padding-top: 15px; border-top: 1px solid ${C.sep};`,
  footnotes_title:   `font-size: 12px; font-weight: bold; color: ${C.fg2}; margin-bottom: .6em; text-transform: uppercase; letter-spacing: 1px;`,
  footnote_item:     `font-size: 12px; color: ${C.fg1}; line-height: 1.7; margin: .3em 0; word-break: break-all;`,
  footnote_num:      `color: ${C.fg0}; font-weight: bold; margin-right: 4px;`,
};

// ── 主入口 ───────────────────────────────────────────────────────────────

function formatToWechat(parsedData) {
  if (!parsedData || !parsedData.blocks) {
    return '<p style="color:red">解析数据为空，请重试</p>';
  }
  const { blocks, links = [] } = parsedData;
  let html = '';
  for (const block of blocks) {
    html += renderBlock(block, links, 0);
  }
  if (links.length > 0) {
    html += renderFootnotes(links);
  }
  return `<section style="${S.wrapper}">${html}</section>`;
}

// ── Block 渲染 ────────────────────────────────────────────────────────────

function renderBlock(block, links, depth) {
  if (!block) return '';
  switch (block.type) {
    case 'h1': return `<section style="${S.h1}">${pi(block.content)}</section>`;
    case 'h2': return `<section style="${S.h2}">${pi(block.content)}</section>`;
    case 'h3': return `<section style="${S.h3}">${pi(block.content)}</section>`;
    case 'h4': return `<section style="${S.h4}">${pi(block.content)}</section>`;
    case 'h5': return `<section style="${S.h5}">${pi(block.content)}</section>`;
    case 'h6': return `<section style="${S.h6}">${pi(block.content)}</section>`;
    case 'paragraph': {
      const text = (block.content || '').trim();
      if (!text) return '<br>';
      return `<p style="${S.p}">${pi(block.content)}</p>`;
    }
    case 'quote':
      return `<section style="${S.blockquote_wrapper}"><p style="${S.blockquote_text}">${pi(block.content)}</p></section>`;
    case 'callout':
      return renderCallout(block);
    case 'code':
      return renderCodeBlock(block);
    case 'divider':
      return `<section style="${S.hr}"></section>`;
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
      return `<p style="${S.p}">🔗 <a href="${escAttr(block.url)}" style="color:${C.fg0};text-decoration:none;border-bottom:1px solid ${C.fg0};">${escHtml(block.text || block.url)}</a><sup style="color:${C.fg0};font-size:.7em;font-weight:bold;line-height:0;">[${block.linkIndex}]</sup></p>`;
    case 'todo':
      return `<p style="${S.p}">${block.checked ? '✅' : '☐'} ${pi(block.content)}</p>`;
    case 'table':
      return renderTable(block);
    case 'embed':
      return `<section style="${S.embed_wrapper}"><p style="${S.embed_label}">📎 ${escHtml(block.title || '嵌入内容')}</p>${block.url ? `<p style="${S.embed_link}">${escHtml(block.url)}</p>` : ''}</section>`;
    case 'column_list':
      if (!block.columns) return '';
      return block.columns.map(col => col.map(b => renderBlock(b, links, depth)).join('')).join('');
    default:
      return '';
  }
}

// ── Callout ───────────────────────────────────────────────────────────────

function renderCallout(block) {
  const icon = block.icon || '💡';
  return `<section style="${S.callout_wrapper}"><span style="${S.callout_icon}">${icon}</span><section style="${S.callout_content}">${pi(block.content)}</section></section>`;
}

// ── 代码块（含语法高亮）──────────────────────────────────────────────────

// 将 highlight.js 输出的 class-based span 转换为内联 style
function applyHljsStyles(html) {
  return html.replace(/<span class="([^"]+)">/g, (match, classStr) => {
    const styles = {};
    for (const cls of classStr.split(' ')) {
      if (CODE_THEME[cls]) Object.assign(styles, CODE_THEME[cls]);
    }
    const styleStr = Object.entries(styles).map(([k, v]) => `${k}:${v}`).join(';');
    return styleStr ? `<span style="${styleStr}">` : '<span>';
  });
}

function renderCodeBlock(block) {
  const rawLang = (block.language || '').toLowerCase().trim();
  const lang    = rawLang === 'plaintext' || rawLang === 'plain text' ? '' : rawLang;
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
  } catch (e) {
    codeHtml = escHtml(rawCode);
  }

  const langBar = lang ? `<div style="${S.code_lang_bar}">${escHtml(lang)}</div>` : '';
  return `<section style="${S.code_wrapper}">${langBar}<pre style="${S.code_pre}"><code style="${S.code_text}">${codeHtml}</code></pre></section>`;
}

// ── 列表 ─────────────────────────────────────────────────────────────────

function renderList(items, isOrdered, depth) {
  if (!items || items.length === 0) return '';
  const tag   = isOrdered ? 'ol' : 'ul';
  const style = isOrdered ? S.ol : S.ul;

  let html = '';
  items.forEach((item, index) => {
    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) nested += renderBlock(child, [], depth + 1);
    }
    html += `<li style="${S.li} list-style-type:${isOrdered ? 'decimal' : 'disc'};">${pi(item.content)}${nested}</li>`;
  });
  return `<${tag} style="${style}">${html}</${tag}>`;
}

// ── 图片 ──────────────────────────────────────────────────────────────────

function renderImage(block) {
  const src = block.base64 || block.url;
  if (!src) return '';
  const cap = block.caption ? `<p style="${S.img_caption}">${escHtml(block.caption)}</p>` : '';
  return `<section style="${S.img_wrapper}"><img src="${escAttr(src)}" style="${S.img}" alt="${escAttr(block.caption || '图片')}" />${cap}</section>`;
}

// ── 视频 ─────────────────────────────────────────────────────────────────

function renderVideo(block) {
  if (block.thumbnailUrl) {
    return `<section style="${S.img_wrapper}"><img src="${escAttr(block.thumbnailUrl)}" style="${S.img}" alt="视频封面" /><p style="${S.img_caption}">📹 视频内容请前往原文查看</p></section>`;
  }
  return `<section style="${S.video_wrapper}"><p style="${S.video_label}">📹 视频内容请前往原文查看</p></section>`;
}

// ── Toggle ────────────────────────────────────────────────────────────────

function renderToggle(block, links, depth) {
  let html = `<section style="${S.toggle_summary}">▶ ${pi(block.content)}</section>`;
  if (block.children && block.children.length > 0) {
    html += `<section style="${S.toggle_content}">${block.children.map(b => renderBlock(b, links, depth + 1)).join('')}</section>`;
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
      const style = isHeader ? S.th : (ri % 2 === 0 ? S.td_even : S.td);
      return `<td style="${style}">${pi(cell)}</td>`;
    }).join('');
    rows += `<tr>${cells}</tr>`;
  });
  return `<section style="${S.table_wrapper}"><table style="${S.table}">${rows}</table></section>`;
}

// ── 脚注 ─────────────────────────────────────────────────────────────────

function renderFootnotes(links) {
  const items = links.map((link, i) =>
    `<p style="${S.footnote_item}"><span style="${S.footnote_num}">[${i + 1}]</span>${escHtml(link.text)}：<span style="color:${C.fg2}">${escHtml(link.url)}</span></p>`
  ).join('');
  return `<section style="${S.footnotes_wrapper}"><p style="${S.footnotes_title}">参考资料</p>${items}</section>`;
}

// ── 内联样式处理 ──────────────────────────────────────────────────────────

function pi(html) {
  if (!html) return '';
  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, `<strong style="${S.strong}">$1</strong>`)
    .replace(/<em>([\s\S]*?)<\/em>/g,         `<em style="${S.em}">$1</em>`)
    .replace(/<code>([\s\S]*?)<\/code>/g,     `<code style="${S.code_inline}">$1</code>`)
    .replace(/<s>([\s\S]*?)<\/s>/g,           `<s style="${S.s}">$1</s>`)
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      `<a href="$1" style="text-decoration:none;color:${C.fg0};border-bottom:1px solid ${C.fg0};">$2</a>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g,
      `<sup style="font-size:.7em;color:${C.fg0};font-weight:bold;line-height:0;vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

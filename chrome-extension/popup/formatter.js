// WeChat 公众号 HTML 格式化器
// 将解析后的 JSON 结构转换为带内联样式的微信公众号兼容 HTML
// 样式值对应微信文章页面 CSS 变量（weui）

// ── 字体（与微信文章完全一致）────────────────────────────────────────────
const FONT = 'PingFang SC, system-ui, -apple-system, BlinkMacSystemFont, "Helvetica Neue", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", Arial, sans-serif';

// ── 颜色（取自 weui CSS 变量实际值）────────────────────────────────────
const C = {
  fg0:    'rgba(0, 0, 0, .9)',    // --weui-FG-0   主文字
  fg1:    'rgba(0, 0, 0, .55)',   // --weui-FG-1   次文字
  fg2:    'rgba(0, 0, 0, .3)',    // --weui-FG-2   弱文字
  brand:  '#07C160',              // --weui-BRAND  微信绿
  brand90:'#06AE56',              // --weui-BRAND-90
  link:   '#576B95',              // --weui-LINK   链接色
  sep:    'rgba(0, 0, 0, .1)',    // --weui-SEPARATOR-0
  bg1:    '#F7F7F7',              // --weui-BG-1
  bg2:    '#FFFFFF',              // --weui-BG-2
};

// ── 内联样式定义 ─────────────────────────────────────────────────────────
const S = {
  wrapper: `font-family: ${FONT}; font-size: 17px; color: ${C.fg0}; line-height: 1.6; letter-spacing: .034em; word-wrap: break-word; hyphens: auto;`,

  // 标题：h1 左边框 / h2 底线 / h3 细左边框 / h4-h6 纯粗体
  h1: `display: block; font-size: 1.35em; font-weight: bold; color: ${C.fg0}; margin: 1.4em 0 .7em; padding-left: 14px; border-left: 5px solid ${C.brand}; line-height: 1.4;`,
  h2: `display: block; font-size: 1.2em; font-weight: bold; color: ${C.fg0}; margin: 1.2em 0 .6em; padding-bottom: 5px; border-bottom: 2px solid rgba(7,193,96,.25); line-height: 1.4;`,
  h3: `display: block; font-size: 1.1em; font-weight: bold; color: ${C.fg0}; margin: 1em 0 .5em; padding-left: 10px; border-left: 3px solid rgba(7,193,96,.5); line-height: 1.4;`,
  h4: `display: block; font-size: 1em; font-weight: bold; color: ${C.fg0}; margin: .9em 0 .45em;`,
  h5: `display: block; font-size: .95em; font-weight: bold; color: ${C.fg0}; margin: .8em 0 .4em;`,
  h6: `display: block; font-size: .9em; font-weight: bold; color: ${C.fg1}; margin: .7em 0 .35em;`,

  p: `font-size: 1em; line-height: 1.75; color: ${C.fg0}; margin: .75em 0;`,

  strong:      `font-weight: bold; color: ${C.fg0};`,
  em:          `font-style: italic;`,
  code_inline: `background: rgba(0,0,0,.05); padding: 2px 6px; border-radius: 4px; font-family: "Courier New", Courier, monospace; font-size: .85em; color: #e83e8c;`,
  s:           `text-decoration: line-through; color: ${C.fg2};`,

  blockquote_wrapper: `border-left: 4px solid ${C.brand}; background: rgba(0,0,0,.025); border-radius: 0 6px 6px 0; padding: 10px 16px; margin: 1em 0;`,
  blockquote_text:    `font-size: .95em; line-height: 1.7; color: ${C.fg1}; margin: 0; font-style: italic;`,

  callout_wrapper: `background: rgba(7,193,96,.06); border: 1px solid rgba(7,193,96,.22); border-radius: 8px; padding: 12px 16px; margin: 1em 0; display: flex; gap: 10px; align-items: flex-start;`,
  callout_icon:    `font-size: 1.15em; flex-shrink: 0; line-height: 1.5;`,
  callout_content: `font-size: .95em; line-height: 1.75; color: ${C.fg0}; flex: 1;`,

  code_wrapper:  `background: #1e1e1e; border-radius: 8px; margin: 1em 0; overflow: hidden;`,
  code_lang_bar: `background: #2d2d2d; padding: 5px 14px; font-size: .75em; color: rgba(255,255,255,.45); font-family: monospace; letter-spacing: .5px;`,
  code_pre:      `margin: 0; padding: 12px 16px; overflow-x: auto;`,
  code_text:     `font-family: "Courier New", Courier, monospace; font-size: .82em; line-height: 1.65; color: #cdd6f4; white-space: pre-wrap; word-break: break-all; display: block;`,

  hr: `border: none; border-top: 1px solid ${C.sep}; margin: 1.5em 0;`,

  ul: `padding-left: 0; margin: .75em 0; list-style: none;`,
  ol: `padding-left: 0; margin: .75em 0; list-style: none;`,
  li: `font-size: 1em; line-height: 1.75; color: ${C.fg0}; margin: .3em 0; padding-left: 1.4em; position: relative; display: block;`,

  img_wrapper: `margin: 1em 0; text-align: center;`,
  img:         `max-width: 100%; height: auto; border-radius: 6px; display: inline-block;`,
  img_caption: `font-size: .8em; color: ${C.fg2}; margin-top: 5px; text-align: center;`,

  video_wrapper: `margin: 1em 0; background: #111; border-radius: 8px; padding: 28px 20px; text-align: center;`,
  video_label:   `color: rgba(255,255,255,.45); font-size: .9em;`,

  toggle_summary: `font-size: 1em; font-weight: bold; color: ${C.fg0}; margin: .8em 0 .4em; padding-left: 1em; border-left: 3px solid rgba(0,0,0,.18);`,
  toggle_content: `padding-left: 1em; border-left: 2px solid ${C.sep}; margin-left: 4px;`,

  table_wrapper: `overflow-x: auto; margin: 1em 0; border-radius: 6px; border: 1px solid ${C.sep};`,
  table:         `border-collapse: collapse; width: 100%; font-size: .9em; line-height: 1.6;`,
  th:            `background: rgba(0,0,0,.03); padding: 8px 13px; border: 1px solid ${C.sep}; font-weight: bold; text-align: left; color: ${C.fg0};`,
  td:            `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0};`,
  td_even:       `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0}; background: rgba(0,0,0,.02);`,

  embed_wrapper: `margin: 1em 0; background: rgba(0,0,0,.025); border: 1px solid rgba(0,0,0,.08); border-radius: 8px; padding: 11px 15px;`,
  embed_label:   `font-size: .8em; color: ${C.fg2}; margin-bottom: 4px;`,
  embed_link:    `font-size: .85em; color: ${C.link}; word-break: break-all;`,

  footnotes_wrapper: `margin-top: 2em; padding-top: 1em; border-top: 1px solid ${C.sep};`,
  footnotes_title:   `font-size: .78em; font-weight: bold; color: ${C.fg2}; margin-bottom: .6em; text-transform: uppercase; letter-spacing: 1px;`,
  footnote_item:     `font-size: .78em; color: ${C.fg1}; line-height: 1.7; margin: .3em 0; word-break: break-all;`,
  footnote_num:      `color: ${C.brand}; font-weight: bold; margin-right: 4px;`,
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
      return `<section style="${S.callout_wrapper}"><span style="${S.callout_icon}">${block.icon || '💡'}</span><div style="${S.callout_content}">${pi(block.content)}</div></section>`;

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
      return `<p style="${S.p}">🔗 <a href="${escAttr(block.url)}" style="color:${C.brand}">${escHtml(block.text || block.url)}</a><sup style="color:${C.brand};font-size:.7em">[${block.linkIndex}]</sup></p>`;

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

// ── 代码块 ────────────────────────────────────────────────────────────────

function renderCodeBlock(block) {
  const lang = (block.language || 'plaintext').toLowerCase();
  const displayLang = lang === 'plaintext' ? '' : lang;
  const code = escHtml(block.content || '');
  return `<section style="${S.code_wrapper}">${displayLang ? `<div style="${S.code_lang_bar}">${escHtml(displayLang)}</div>` : ''}<div style="${S.code_pre}"><code style="${S.code_text}">${code}</code></div></section>`;
}

// ── 列表 ─────────────────────────────────────────────────────────────────

function renderList(items, isOrdered, depth) {
  if (!items || items.length === 0) return '';

  let itemsHtml = '';
  items.forEach((item, index) => {
    const bullet = isOrdered
      ? `<span style="position:absolute;left:0;color:${C.brand};font-weight:bold;">${index + 1}.</span>`
      : `<span style="position:absolute;left:6px;color:${C.brand};font-weight:bold;">•</span>`;

    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        nested += renderBlock(child, [], depth + 1);
      }
    }

    itemsHtml += `<section style="${S.li}">${bullet}${pi(item.content)}${nested}</section>`;
  });

  return `<section style="${isOrdered ? S.ol : S.ul}">${itemsHtml}</section>`;
}

// ── 图片（优先 base64）────────────────────────────────────────────────────

function renderImage(block) {
  const src = block.base64 || block.url;
  if (!src) return '';
  return `<section style="${S.img_wrapper}"><img src="${escAttr(src)}" style="${S.img}" alt="${escAttr(block.caption || '图片')}" />${block.caption ? `<p style="${S.img_caption}">${escHtml(block.caption)}</p>` : ''}</section>`;
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

  let tableHtml = '';
  block.rows.forEach((row, rowIndex) => {
    const isHeader = row.isHeader || rowIndex === 0;
    const cells = (row.cells || []).map(cell => {
      const style = isHeader ? S.th : (rowIndex % 2 === 0 ? S.td_even : S.td);
      return `<td style="${style}">${pi(cell)}</td>`;
    }).join('');
    tableHtml += `<tr>${cells}</tr>`;
  });

  return `<section style="${S.table_wrapper}"><table style="${S.table}">${tableHtml}</table></section>`;
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
    .replace(/<em>([\s\S]*?)<\/em>/g, `<em style="${S.em}">$1</em>`)
    .replace(/<code>([\s\S]*?)<\/code>/g, `<code style="${S.code_inline}">$1</code>`)
    .replace(/<s>([\s\S]*?)<\/s>/g, `<s style="${S.s}">$1</s>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g, `<sup style="font-size:.7em;color:${C.brand};vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

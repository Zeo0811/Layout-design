// WeChat 公众号 HTML 格式化器
// 将解析后的 JSON 结构转换为带内联样式的微信公众号兼容 HTML
// 样式值对应微信文章页面 CSS 变量（weui）

// ── 字体（科技黑主题：衬线字体）──────────────────────────────────────────
const FONT = 'Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, "PingFang SC", Cambria, Cochin, Georgia, Times, "Times New Roman", serif';

// ── 颜色（科技黑：以 #222222 为核心，极简黑白配色）──────────────────────
const C = {
  fg0:    '#222222',              // 主文字 / 核心强调色
  fg1:    '#555555',              // 次文字
  fg2:    '#888888',              // 弱文字
  brand:  '#222222',              // 科技黑主色
  brand90:'#333333',
  link:   '#222222',              // 链接色（黑色+下划线）
  sep:    'rgba(0, 0, 0, .15)',   // 分隔线
  bg1:    '#f5f5f5',              // 浅灰背景
  bg2:    '#FFFFFF',              // 白色背景
};

// ── 内联样式定义（科技黑主题）───────────────────────────────────────────
// 全部使用绝对 px 值（基准 15px），避免 em 在微信编辑器或插件预览中因
// 父级上下文不同而解析错误，确保字号字体等样式与主题定义完全一致。
const S = {
  wrapper: `font-family: ${FONT}; font-size: 15px; color: ${C.fg0}; line-height: 1.75; letter-spacing: 0.5px; word-wrap: break-word; hyphens: auto;`,

  // 标题：h1 居中+底部粗线 / h2 居中 / h3 左对齐 / h4-h6 纯粗体
  h1: `display: block; font-family: ${FONT}; font-size: 21px; font-weight: bold; color: #222222; text-align: center; padding: 0 21px; border-bottom: 8px solid #222222; line-height: 1.5; margin: 29px 0 15px;`,
  h2: `display: block; font-family: ${FONT}; font-size: 18px; font-weight: bold; color: #222222; text-align: center; padding: 0 4px; line-height: 1.5; margin: 22px 0 11px;`,
  h3: `display: block; font-family: ${FONT}; font-size: 17px; font-weight: bold; color: #222222; text-align: left; line-height: 1.5; margin: 17px 0 9px;`,
  h4: `display: block; font-family: ${FONT}; font-size: 15px; font-weight: bold; color: #222222; margin: 14px 0 7px;`,
  h5: `display: block; font-family: ${FONT}; font-size: 14px; font-weight: bold; color: #222222; margin: 11px 0 6px;`,
  h6: `display: block; font-family: ${FONT}; font-size: 14px; font-weight: bold; color: #555555; margin: 10px 0 5px;`,

  p: `font-family: ${FONT}; font-size: 15px; line-height: 1.75; color: #222222; margin: 11px 0;`,

  strong:      `font-weight: bold; color: #222222;`,
  em:          `font-style: italic;`,
  code_inline: `background: rgba(0,0,0,.06); padding: 2px 6px; border-radius: 4px; font-family: "Courier New", Courier, monospace; font-size: 13px; color: #222222;`,
  s:           `text-decoration: line-through; color: #888888;`,

  blockquote_wrapper: `border-left: 8px solid #222222; background: #f5f5f5; padding: 10px; margin: 20px 0;`,
  blockquote_text:    `font-family: ${FONT}; font-size: 14px; line-height: 1.7; color: #555555; margin: 0; font-style: italic;`,

  callout_wrapper: `background: #fff; border-bottom: 1px dashed #222222; border-right: 1px dashed #222222; padding: 12px 16px; margin: 15px 0; display: flex; gap: 10px; align-items: flex-start;`,
  callout_icon:    `font-size: 17px; flex-shrink: 0; line-height: 1.5;`,
  callout_content: `font-family: ${FONT}; font-size: 14px; line-height: 1.75; color: #222222; flex: 1;`,

  code_wrapper:  `background: #1e1e1e; border-radius: 8px; margin: 15px 0; overflow: hidden;`,
  code_lang_bar: `background: #2d2d2d; padding: 5px 14px; font-size: 11px; color: rgba(255,255,255,.45); font-family: monospace; letter-spacing: 0.5px;`,
  code_pre:      `margin: 0; padding: 12px 16px; overflow-x: auto;`,
  code_text:     `font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.65; color: #cdd6f4; white-space: pre-wrap; word-break: break-all; display: block;`,

  hr: `border: none; border-top: 1px solid rgba(0,0,0,.15); margin: 23px 0;`,

  ul: `padding-left: 0; margin: 11px 0; list-style: none;`,
  ol: `padding-left: 0; margin: 11px 0; list-style: none;`,
  li: `font-family: ${FONT}; font-size: 15px; line-height: 1.75; color: #222222; margin: 5px 0; padding-left: 21px; position: relative; display: block;`,

  img_wrapper: `margin: 15px 0; text-align: center;`,
  img:         `max-width: 100%; height: auto; border-radius: 10px; display: inline-block;`,
  img_caption: `font-family: ${FONT}; font-size: 12px; color: #888888; margin-top: 5px; text-align: center;`,

  video_wrapper: `margin: 15px 0; background: #111; border-radius: 8px; padding: 28px 20px; text-align: center;`,
  video_label:   `color: rgba(255,255,255,.45); font-size: 14px;`,

  toggle_summary: `font-family: ${FONT}; font-size: 15px; font-weight: bold; color: #222222; margin: 12px 0 6px; padding-left: 15px; border-left: 3px solid rgba(0,0,0,.3);`,
  toggle_content: `padding-left: 15px; border-left: 2px solid rgba(0,0,0,.15); margin-left: 4px;`,

  table_wrapper: `overflow-x: auto; margin: 15px 0; border: 1px solid rgba(0,0,0,.15);`,
  table:         `border-collapse: collapse; width: 100%; font-size: 14px; line-height: 1.6;`,
  th:            `background: rgba(0,0,0,.05); padding: 8px 13px; border: 1px solid rgba(0,0,0,.15); font-weight: bold; text-align: left; color: #222222;`,
  td:            `padding: 7px 13px; border: 1px solid rgba(0,0,0,.15); color: #222222;`,
  td_even:       `padding: 7px 13px; border: 1px solid rgba(0,0,0,.15); color: #222222; background: rgba(0,0,0,.02);`,

  embed_wrapper: `margin: 15px 0; background: rgba(0,0,0,.025); border: 1px solid rgba(0,0,0,.1); padding: 11px 15px;`,
  embed_label:   `font-size: 12px; color: #888888; margin-bottom: 4px;`,
  embed_link:    `font-size: 13px; color: #222222; word-break: break-all; border-bottom: 1px solid #222222; text-decoration: none;`,

  footnotes_wrapper: `margin-top: 30px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,.15);`,
  footnotes_title:   `font-family: ${FONT}; font-size: 12px; font-weight: bold; color: #888888; margin-bottom: 7px; text-transform: uppercase; letter-spacing: 1px;`,
  footnote_item:     `font-family: ${FONT}; font-size: 12px; color: #555555; line-height: 1.7; margin: 4px 0; word-break: break-all;`,
  footnote_num:      `color: #222222; font-weight: bold; margin-right: 4px;`,
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
      return `<p style="${S.p}">🔗 <a href="${escAttr(block.url)}" style="color:${C.brand}">${escHtml(block.text || block.url)}</a><sup style="color:${C.brand};font-size:11px">[${block.linkIndex}]</sup></p>`;

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
    .replace(/<sup>\[(\d+)\]<\/sup>/g, `<sup style="font-size:11px;color:${C.brand};vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

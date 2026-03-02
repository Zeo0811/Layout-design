// WeChat 公众号 HTML 格式化器 —— 科技黑主题
// 完全对标参考扩展 tech_black 样式，支持所有模块

// ── 字体 ─────────────────────────────────────────────────────────────────
const FONT = "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif";
const MONO = 'Operator Mono, Consolas, Monaco, Menlo, monospace';

// ── 颜色（科技黑单色系）──────────────────────────────────────────────────
const C = {
  fg0:   '#222222',              // 主文字
  fg1:   '#555555',              // 次文字
  fg2:   '#888888',              // 弱文字
  brand: '#222222',              // 品牌色（黑）
  sep:   'rgba(0, 0, 0, .15)',   // 分隔线
  bg1:   '#f5f5f5',              // 浅灰背景
  bg2:   '#FFFFFF',              // 白色背景
};

// ── 内联样式定义（绝对 px，微信兼容）────────────────────────────────────
const S = {
  // 外层容器：15px 基础字号
  wrapper: `font-family: ${FONT}; font-size: 15px; color: ${C.fg0}; line-height: 1.75; letter-spacing: 0.1em; word-wrap: break-word; hyphens: auto;`,

  // 标题：h1 居中+8px 下边框 / h2 居中无装饰 / h3 左对齐无边框
  h1: `display: block; font-size: 24px; font-weight: bold; color: ${C.fg0}; margin: 80px auto 40px auto; padding: 0 1em; text-align: center; border-bottom: 8px solid ${C.fg0}; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h2: `display: block; font-size: 20px; font-weight: bold; color: ${C.fg0}; margin: 40px auto; padding: 0 0.2em; text-align: center; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h3: `display: block; font-size: 17px; font-weight: bold; color: ${C.fg0}; margin: 40px 0; text-align: left; line-height: 1.5; width: fit-content; font-family: ${FONT};`,
  h4: `display: block; font-size: 16px; font-weight: bold; color: ${C.fg0}; margin: 1em 0 .5em; font-family: ${FONT};`,
  h5: `display: block; font-size: 15px; font-weight: bold; color: ${C.fg0}; margin: .8em 0 .4em; font-family: ${FONT};`,
  h6: `display: block; font-size: 14px; font-weight: bold; color: ${C.fg1}; margin: .7em 0 .35em; font-family: ${FONT};`,

  // 段落：15px，行高 1.75，rgb(63,63,63) 接近 #3f3f3f
  p: `font-size: 15px; line-height: 1.75; color: rgb(63,63,63); margin: 10px 0; letter-spacing: 0.1em; white-space: pre-line; font-family: ${FONT};`,

  // 行内格式
  strong:      `font-weight: 600; color: ${C.fg0};`,
  em:          `font-style: italic;`,
  code_inline: `background: rgba(135,131,120,.15); padding: 0.2em 0.4em; border-radius: 4px; font-family: ${MONO}; font-size: 85%; color: ${C.fg0};`,
  s:           `text-decoration: line-through; color: ${C.fg2};`,

  // 引用：8px 左边框 #222222，灰色背景
  blockquote_wrapper: `display: block; overflow: auto; border-left: 8px solid ${C.fg0}; background-color: ${C.bg1}; padding: 10px; margin: 20px 0; hyphens: auto; text-align: left; font-family: ${FONT};`,
  blockquote_text:    `font-size: 15px; line-height: 1.75; color: ${C.fg1}; margin: 0; letter-spacing: 0.1em;`,

  // Callout：白色背景，右侧+底部虚线边框
  callout_wrapper: `display: flex; gap: 10px; align-items: flex-start; background-color: ${C.bg2}; border-bottom: 1px dashed ${C.fg0}; border-right: 1px dashed ${C.fg0}; font-size: 15px; white-space: normal; margin: 20px 0; color: rgba(0,0,0,.9); font-family: ${FONT}; line-height: 1.75; padding: 12px;`,
  callout_icon:    `font-size: 17px; flex-shrink: 0; line-height: 1.5;`,
  callout_header:  `width: 90%; padding: 0 10px; border-style: solid; border-width: 1px 0 0 10px; border-color: ${C.fg0};`,
  callout_content: `font-size: 15px; line-height: 1.75; color: ${C.fg0}; flex: 1; padding: 0 12px 15px; letter-spacing: 0.1em; color: #3f3f3f;`,

  // 代码块
  code_wrapper:  `background: #1e1e1e; border-radius: 8px; margin: 20px 10px; overflow: hidden;`,
  code_lang_bar: `background: #2d2d2d; padding: 5px 14px; font-size: 11px; color: rgba(255,255,255,.45); font-family: ${MONO}; letter-spacing: .5px;`,
  code_pre:      `margin: 0; padding: 12px 16px; overflow-x: auto; background: #1e1e1e;`,
  code_text:     `font-family: ${MONO}; font-size: 12px; line-height: 1.65; color: #cdd6f4; white-space: pre-wrap; word-break: break-all; display: block;`,

  // 分割线
  hr: `border: none; border-top: 1px solid #797979; margin: 15px 0; border-style: solid; border-width: 1px 0 0; border-color: #797979;`,

  // 列表
  ul: `padding-left: 1.5em; margin: 10px 0; font-size: 15px; line-height: 1.75; font-family: ${FONT}; color: rgb(63,63,63);`,
  ol: `padding-left: 1.5em; margin: 10px 0; font-size: 15px; line-height: 1.75; font-family: ${FONT}; color: rgb(63,63,63);`,
  li: `font-size: 15px; line-height: 1.75; color: rgb(63,63,63); margin: 0; padding-left: 0; font-family: ${FONT}; letter-spacing: 0.1em; list-style-position: outside;`,

  // 图片：border-radius 10px
  img_wrapper: `margin: 15px 0; text-align: center;`,
  img:         `max-width: 100%; height: auto; border-radius: 10px; display: inline-block;`,
  img_caption: `font-size: 12px; color: ${C.fg2}; margin-top: 5px; text-align: center;`,

  // 视频
  video_wrapper: `margin: 1em 0; background: #111; border-radius: 8px; padding: 28px 20px; text-align: center;`,
  video_label:   `color: rgba(255,255,255,.45); font-size: 14px;`,

  // Toggle 折叠
  toggle_summary: `font-size: 15px; font-weight: bold; color: ${C.fg0}; margin: 12px 0 5px; padding-left: 15px; border-left: 3px solid ${C.fg0}; font-family: ${FONT};`,
  toggle_content: `padding-left: 15px; border-left: 2px solid ${C.sep}; margin-left: 4px;`,

  // 表格
  table_wrapper: `overflow-x: auto; margin: 1em 0;`,
  table:         `border-collapse: collapse; width: 100%; font-size: 15px; line-height: 1.6; font-family: ${FONT};`,
  th:            `background: rgba(0,0,0,.05); padding: 7px 13px; border: 1px solid ${C.sep}; font-weight: bold; text-align: left; color: ${C.fg0};`,
  td:            `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0};`,
  td_even:       `padding: 7px 13px; border: 1px solid ${C.sep}; color: ${C.fg0}; background: rgba(0,0,0,.02);`,

  // 嵌入链接
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

// ── Callout（带图标的提示框）─────────────────────────────────────────────

function renderCallout(block) {
  const icon = block.icon || '💡';
  const content = pi(block.content);
  return `<section style="${S.callout_wrapper}"><span style="${S.callout_icon}">${icon}</span><section style="${S.callout_content}">${content}</section></section>`;
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

  const tag = isOrdered ? 'ol' : 'ul';
  const style = isOrdered ? S.ol : S.ul;
  const listStyleType = isOrdered ? 'decimal' : 'disc';

  let itemsHtml = '';
  items.forEach((item, index) => {
    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        nested += renderBlock(child, [], depth + 1);
      }
    }
    itemsHtml += `<li style="${S.li} list-style-type: ${isOrdered ? 'decimal' : 'disc'};">${pi(item.content)}${nested}</li>`;
  });

  return `<${tag} style="${style}">${itemsHtml}</${tag}>`;
}

// ── 图片 ──────────────────────────────────────────────────────────────────

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
    const cells = (row.cells || []).map((cell, cellIndex) => {
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
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, `<a href="$1" style="text-decoration:none;color:${C.fg0};border-bottom:1px solid ${C.fg0};">$2</a>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g, `<sup style="font-size:.7em;color:${C.fg0};font-weight:bold;line-height:0;vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

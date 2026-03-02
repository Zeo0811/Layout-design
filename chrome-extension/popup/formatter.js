// WeChat 公众号 HTML 格式化器
// 将解析后的 JSON 结构转换为带内联样式的微信公众号兼容 HTML

// ── 主题定义 ─────────────────────────────────────────────────────────────

const THEMES = {
  wechat: {
    name: '微信绿',
    primaryColor: '#07C160',
    textColor: '#333333',
    mutedColor: '#888888',
    bgCode: '#1e1e1e',
    bgCallout: '#f7f9fc',
    borderCallout: '#d0e4f7',
    bgQuote: '#f5f5f5',
  },
  blue: {
    name: '商务蓝',
    primaryColor: '#1677FF',
    textColor: '#333333',
    mutedColor: '#888888',
    bgCode: '#1a2035',
    bgCallout: '#f0f5ff',
    borderCallout: '#adc6ff',
    bgQuote: '#f5f7ff',
  },
  purple: {
    name: '优雅紫',
    primaryColor: '#7C3AED',
    textColor: '#2D2D2D',
    mutedColor: '#888888',
    bgCode: '#1e1e2e',
    bgCallout: '#f5f3ff',
    borderCallout: '#c4b5fd',
    bgQuote: '#f8f5ff',
  },
};

// ── 样式构建（微信公众号文章宽度约 677px）───────────────────────────────

function buildStyles(t) {
  return {
    wrapper: `font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; color: ${t.textColor}; line-height: 1.75; word-break: break-word;`,

    h1: `display: block; font-size: 22px; font-weight: bold; color: #111; margin: 28px 0 14px; padding-left: 14px; border-left: 5px solid ${t.primaryColor}; line-height: 1.4;`,
    h2: `display: block; font-size: 19px; font-weight: bold; color: #1a1a1a; margin: 22px 0 12px; padding-bottom: 6px; border-bottom: 2px solid ${t.primaryColor}33;`,
    h3: `display: block; font-size: 17px; font-weight: bold; color: #222; margin: 18px 0 10px; padding-left: 10px; border-left: 3px solid ${t.primaryColor}88;`,
    h4: `display: block; font-size: 15px; font-weight: bold; color: #333; margin: 14px 0 8px;`,
    h5: `display: block; font-size: 14px; font-weight: bold; color: #444; margin: 12px 0 6px;`,
    h6: `display: block; font-size: 13px; font-weight: bold; color: #555; margin: 10px 0 5px;`,

    p: `font-size: 15px; line-height: 1.85; color: ${t.textColor}; margin: 10px 0;`,

    strong: `font-weight: bold; color: #111;`,
    em: `font-style: italic;`,
    code_inline: `background: #f5f2f0; padding: 2px 6px; border-radius: 4px; font-family: "Courier New", Courier, monospace; font-size: 13px; color: #e83e8c;`,
    s: `text-decoration: line-through; color: #999;`,

    blockquote_wrapper: `border-left: 4px solid ${t.primaryColor}; background: ${t.bgQuote}; border-radius: 0 6px 6px 0; padding: 12px 18px; margin: 14px 0;`,
    blockquote_text: `font-size: 14px; line-height: 1.8; color: #555; margin: 0; font-style: italic;`,

    callout_wrapper: `background: ${t.bgCallout}; border: 1px solid ${t.borderCallout}; border-radius: 8px; padding: 14px 18px; margin: 14px 0; display: flex; gap: 10px; align-items: flex-start;`,
    callout_icon: `font-size: 20px; flex-shrink: 0; line-height: 1.5;`,
    callout_content: `font-size: 14px; line-height: 1.75; color: ${t.textColor}; flex: 1;`,

    code_wrapper: `background: ${t.bgCode}; border-radius: 8px; margin: 14px 0; overflow: hidden;`,
    code_lang_bar: `background: #2d2d2d; padding: 6px 14px; font-size: 12px; color: #888; font-family: monospace; letter-spacing: 0.5px;`,
    code_pre: `margin: 0; padding: 14px 16px; overflow-x: auto;`,
    code_text: `font-family: "Courier New", Courier, monospace; font-size: 13px; line-height: 1.65; color: #cdd6f4; white-space: pre-wrap; word-break: break-all; display: block;`,

    hr: `border: none; border-top: 1px dashed #ddd; margin: 24px 0;`,

    ul: `padding-left: 0; margin: 10px 0; list-style: none;`,
    ol: `padding-left: 0; margin: 10px 0; list-style: none;`,
    li: `font-size: 15px; line-height: 1.85; color: ${t.textColor}; margin: 5px 0; padding-left: 22px; position: relative; display: block;`,

    img_wrapper: `margin: 16px 0; text-align: center;`,
    img: `max-width: 100%; height: auto; border-radius: 6px; display: inline-block;`,
    img_caption: `font-size: 12px; color: #999; margin-top: 6px; text-align: center;`,

    video_wrapper: `margin: 16px 0; background: #111; border-radius: 8px; padding: 30px 20px; text-align: center;`,
    video_label: `color: #aaa; font-size: 14px;`,

    toggle_summary: `font-size: 15px; font-weight: bold; color: #222; margin: 12px 0 6px; padding-left: 18px; border-left: 3px solid #ccc;`,
    toggle_content: `padding-left: 16px; border-left: 2px solid #eee; margin-left: 4px;`,

    table_wrapper: `overflow-x: auto; margin: 14px 0; border-radius: 8px; border: 1px solid #e0e0e0;`,
    table: `border-collapse: collapse; width: 100%; font-size: 14px; line-height: 1.6;`,
    th: `background: #f7f7f7; padding: 9px 14px; border: 1px solid #e0e0e0; font-weight: bold; text-align: left; color: #333; font-size: 13px;`,
    td: `padding: 8px 14px; border: 1px solid #e0e0e0; color: ${t.textColor}; font-size: 14px;`,
    td_even: `padding: 8px 14px; border: 1px solid #e0e0e0; color: ${t.textColor}; font-size: 14px; background: #fafafa;`,

    embed_wrapper: `margin: 14px 0; background: #f7f7f7; border: 1px solid #e5e5e5; border-radius: 8px; padding: 14px 18px;`,
    embed_label: `font-size: 12px; color: #999; margin-bottom: 4px;`,
    embed_link: `font-size: 13px; color: ${t.primaryColor}; word-break: break-all;`,

    footnotes_wrapper: `margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e5e5;`,
    footnotes_title: `font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;`,
    footnote_item: `font-size: 12px; color: #666; line-height: 1.7; margin: 5px 0; word-break: break-all;`,
    footnote_num: `color: ${t.primaryColor}; font-weight: bold; margin-right: 4px;`,
  };
}

// ── 主入口 ───────────────────────────────────────────────────────────────

function formatToWechat(parsedData, themeName) {
  if (!parsedData || !parsedData.blocks) {
    return '<p style="color:red">解析数据为空，请重试</p>';
  }

  const theme = THEMES[themeName] || THEMES.wechat;
  const S = buildStyles(theme);
  const { blocks, links = [] } = parsedData;
  let html = '';

  for (const block of blocks) {
    html += renderBlock(block, links, 0, S, theme);
  }

  if (links.length > 0) {
    html += renderFootnotes(links, S, theme);
  }

  return `<section style="${S.wrapper}">${html}</section>`;
}

// ── Block 渲染 ────────────────────────────────────────────────────────────

function renderBlock(block, links, depth, S, theme) {
  if (!block) return '';

  switch (block.type) {
    case 'h1':
      return `<section style="${S.h1}">${processInline(block.content, S, theme)}</section>`;
    case 'h2':
      return `<section style="${S.h2}">${processInline(block.content, S, theme)}</section>`;
    case 'h3':
      return `<section style="${S.h3}">${processInline(block.content, S, theme)}</section>`;
    case 'h4':
      return `<section style="${S.h4}">${processInline(block.content, S, theme)}</section>`;
    case 'h5':
      return `<section style="${S.h5}">${processInline(block.content, S, theme)}</section>`;
    case 'h6':
      return `<section style="${S.h6}">${processInline(block.content, S, theme)}</section>`;

    case 'paragraph': {
      const text = (block.content || '').trim();
      if (!text) return '<br>';
      return `<p style="${S.p}">${processInline(block.content, S, theme)}</p>`;
    }

    case 'quote':
      return `<section style="${S.blockquote_wrapper}"><p style="${S.blockquote_text}">${processInline(block.content, S, theme)}</p></section>`;

    case 'callout':
      return renderCallout(block, S, theme);

    case 'code':
      return renderCodeBlock(block, S);

    case 'divider':
      return `<section style="${S.hr}"></section>`;

    case 'bulleted_list':
      return renderList(block.items, 'ul', depth, S, theme);

    case 'numbered_list':
      return renderList(block.items, 'ol', depth, S, theme);

    case 'image':
      return renderImage(block, S);

    case 'video':
      return renderVideo(block, S);

    case 'toggle':
      return renderToggle(block, links, depth, S, theme);

    case 'bookmark':
      return `<p style="${S.p}">🔗 <a href="${escAttr(block.url)}" style="color:${theme.primaryColor}">${escHtml(block.text || block.url)}</a><sup style="color:${theme.primaryColor};font-size:11px">[${block.linkIndex}]</sup></p>`;

    case 'todo':
      return `<p style="${S.p}">${block.checked ? '✅' : '☐'} ${processInline(block.content, S, theme)}</p>`;

    case 'table':
      return renderTable(block, S, theme);

    case 'embed':
      return renderEmbed(block, S, theme);

    case 'column_list':
      if (!block.columns) return '';
      return block.columns.map(col => col.map(b => renderBlock(b, links, depth, S, theme)).join('')).join('');

    default:
      return '';
  }
}

// ── Callout ───────────────────────────────────────────────────────────────

function renderCallout(block, S, theme) {
  return `<section style="${S.callout_wrapper}"><span style="${S.callout_icon}">${block.icon || '💡'}</span><div style="${S.callout_content}">${processInline(block.content, S, theme)}</div></section>`;
}

// ── 代码块 ────────────────────────────────────────────────────────────────

function renderCodeBlock(block, S) {
  const lang = (block.language || 'plaintext').toLowerCase();
  const displayLang = lang === 'plaintext' ? '' : lang;
  const code = escHtml(block.content || '');

  return `<section style="${S.code_wrapper}">${displayLang ? `<div style="${S.code_lang_bar}">${escHtml(displayLang)}</div>` : ''}<div style="${S.code_pre}"><code style="${S.code_text}">${code}</code></div></section>`;
}

// ── 列表 ─────────────────────────────────────────────────────────────────

function renderList(items, listType, depth, S, theme) {
  if (!items || items.length === 0) return '';
  const isOrdered = listType === 'ol';
  let itemsHtml = '';

  items.forEach((item, index) => {
    const bullet = isOrdered
      ? `<span style="position:absolute;left:0;color:${theme.primaryColor};font-weight:bold;">${index + 1}.</span>`
      : `<span style="position:absolute;left:6px;color:${theme.primaryColor};font-weight:bold;">•</span>`;

    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        nested += renderBlock(child, [], depth + 1, S, theme);
      }
    }

    itemsHtml += `<section style="${S.li}">${bullet}${processInline(item.content, S, theme)}${nested}</section>`;
  });

  return `<section style="${isOrdered ? S.ol : S.ul}">${itemsHtml}</section>`;
}

// ── 图片（优先使用 base64，降级到原始 URL）──────────────────────────────

function renderImage(block, S) {
  const src = block.base64 || block.url;
  if (!src) return '';

  return `<section style="${S.img_wrapper}"><img src="${escAttr(src)}" style="${S.img}" alt="${escAttr(block.caption || '图片')}" />${block.caption ? `<p style="${S.img_caption}">${escHtml(block.caption)}</p>` : ''}</section>`;
}

// ── 视频 ─────────────────────────────────────────────────────────────────

function renderVideo(block, S) {
  if (block.thumbnailUrl) {
    return `<section style="${S.img_wrapper}"><img src="${escAttr(block.thumbnailUrl)}" style="${S.img}" alt="视频封面" /><p style="${S.img_caption}">📹 视频内容请前往原文查看</p></section>`;
  }
  return `<section style="${S.video_wrapper}"><p style="${S.video_label}">📹 视频内容请前往原文查看</p></section>`;
}

// ── Toggle ────────────────────────────────────────────────────────────────

function renderToggle(block, links, depth, S, theme) {
  let html = `<section style="${S.toggle_summary}">▶ ${processInline(block.content, S, theme)}</section>`;
  if (block.children && block.children.length > 0) {
    const childHtml = block.children.map(b => renderBlock(b, links, depth + 1, S, theme)).join('');
    html += `<section style="${S.toggle_content}">${childHtml}</section>`;
  }
  return html;
}

// ── 表格 ─────────────────────────────────────────────────────────────────

function renderTable(block, S, theme) {
  if (!block.rows || block.rows.length === 0) return '';

  let tableHtml = '';
  block.rows.forEach((row, rowIndex) => {
    const isHeader = row.isHeader || rowIndex === 0;
    let cells = '';
    (row.cells || []).forEach(cell => {
      const cellStyle = isHeader ? S.th : (rowIndex % 2 === 0 ? S.td_even : S.td);
      cells += `<td style="${cellStyle}">${processInline(cell, S, theme)}</td>`;
    });
    tableHtml += `<tr>${cells}</tr>`;
  });

  return `<section style="${S.table_wrapper}"><table style="${S.table}">${tableHtml}</table></section>`;
}

// ── 嵌入/数据库块 ─────────────────────────────────────────────────────────

function renderEmbed(block, S, theme) {
  const title = block.title || '嵌入内容';
  const url = block.url || '';
  return `<section style="${S.embed_wrapper}"><p style="${S.embed_label}">📎 ${escHtml(title)}</p>${url ? `<p style="${S.embed_link}">${escHtml(url)}</p>` : ''}</section>`;
}

// ── 脚注 ─────────────────────────────────────────────────────────────────

function renderFootnotes(links, S, theme) {
  const items = links.map((link, i) => {
    const num = i + 1;
    return `<p style="${S.footnote_item}"><span style="${S.footnote_num}">[${num}]</span>${escHtml(link.text)}：<span style="color:#999">${escHtml(link.url)}</span></p>`;
  }).join('');

  return `<section style="${S.footnotes_wrapper}"><p style="${S.footnotes_title}">参考资料</p>${items}</section>`;
}

// ── 内联样式处理 ──────────────────────────────────────────────────────────

function processInline(html, S, theme) {
  if (!html) return '';
  const primary = (theme && theme.primaryColor) || '#07C160';
  const strongStyle = (S && S.strong) || 'font-weight:bold;color:#111;';
  const emStyle = (S && S.em) || 'font-style:italic;';
  const codeStyle = (S && S.code_inline) || 'background:#f5f2f0;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;color:#e83e8c;';
  const sStyle = (S && S.s) || 'text-decoration:line-through;color:#999;';

  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, `<strong style="${strongStyle}">$1</strong>`)
    .replace(/<em>([\s\S]*?)<\/em>/g, `<em style="${emStyle}">$1</em>`)
    .replace(/<code>([\s\S]*?)<\/code>/g, `<code style="${codeStyle}">$1</code>`)
    .replace(/<s>([\s\S]*?)<\/s>/g, `<s style="${sStyle}">$1</s>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g, `<sup style="font-size:11px;color:${primary};vertical-align:super;">[$1]</sup>`);
}

// ── 工具函数 ─────────────────────────────────────────────────────────────

function escHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

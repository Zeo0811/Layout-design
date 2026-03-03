// WeChat 公众号 HTML 格式化器
// 将解析后的 JSON 结构转换为带内联样式的、微信公众号兼容的 HTML

// ── 样式定义（微信公众号文章宽度约 677px）──────────────────────────────

const THEME = {
  primaryColor: '#07C160',    // 微信绿
  textColor: '#333333',
  mutedColor: '#888888',
  bgCode: '#1e1e1e',
  bgCallout: '#f7f9fc',
  borderCallout: '#d0e4f7',
  bgQuote: '#f5f5f5',
  borderQuote: '#07C160',
};

const S = {
  wrapper: `font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif; color: ${THEME.textColor}; line-height: 1.75; word-break: break-word;`,

  h1: `display: block; font-size: 22px; font-weight: bold; color: #111; margin: 28px 0 14px; padding-left: 14px; border-left: 5px solid ${THEME.primaryColor}; line-height: 1.4;`,
  h2: `display: block; font-size: 19px; font-weight: bold; color: #1a1a1a; margin: 22px 0 12px; padding-bottom: 6px; border-bottom: 2px solid #f0f0f0;`,
  h3: `display: block; font-size: 17px; font-weight: bold; color: #222; margin: 18px 0 10px;`,

  p: `font-size: 15px; line-height: 1.85; color: ${THEME.textColor}; margin: 10px 0;`,

  strong: `font-weight: bold; color: #111;`,
  em: `font-style: italic;`,
  code_inline: `background: #f5f2f0; padding: 2px 6px; border-radius: 4px; font-family: "Courier New", Courier, monospace; font-size: 13px; color: #e83e8c;`,
  s: `text-decoration: line-through; color: #999;`,

  blockquote_wrapper: `border-left: 4px solid ${THEME.primaryColor}; background: ${THEME.bgQuote}; border-radius: 0 6px 6px 0; padding: 12px 18px; margin: 14px 0;`,
  blockquote_text: `font-size: 14px; line-height: 1.8; color: #555; margin: 0; font-style: italic;`,

  callout_wrapper: `background: ${THEME.bgCallout}; border: 1px solid ${THEME.borderCallout}; border-radius: 8px; padding: 14px 18px; margin: 14px 0; display: flex; gap: 10px; align-items: flex-start;`,
  callout_icon: `font-size: 20px; flex-shrink: 0; line-height: 1.5;`,
  callout_content: `font-size: 14px; line-height: 1.75; color: ${THEME.textColor}; flex: 1;`,

  code_wrapper: `background: ${THEME.bgCode}; border-radius: 8px; margin: 14px 0; overflow: hidden;`,
  code_lang_bar: `background: #2d2d2d; padding: 6px 14px; font-size: 12px; color: #888; font-family: monospace; letter-spacing: 0.5px;`,
  code_pre: `margin: 0; padding: 14px 16px; overflow-x: auto;`,
  code_text: `font-family: "Courier New", Courier, monospace; font-size: 13px; line-height: 1.65; color: #cdd6f4; white-space: pre-wrap; word-break: break-all; display: block;`,

  hr: `border: none; border-top: 1px dashed #ddd; margin: 24px 0;`,

  ul: `padding-left: 0; margin: 10px 0; list-style: none;`,
  ol: `padding-left: 0; margin: 10px 0; list-style: none;`,
  li: `font-size: 15px; line-height: 1.85; color: ${THEME.textColor}; margin: 5px 0; padding-left: 22px; position: relative; display: block;`,
  li_bullet: `content: "•"; position: absolute; left: 6px; color: ${THEME.primaryColor}; font-weight: bold;`,

  img_wrapper: `margin: 16px 0; text-align: center;`,
  img: `max-width: 100%; height: auto; border-radius: 6px; display: inline-block;`,
  img_caption: `font-size: 12px; color: #999; margin-top: 6px; text-align: center;`,

  video_wrapper: `margin: 16px 0; background: #111; border-radius: 8px; padding: 30px 20px; text-align: center;`,
  video_label: `color: #aaa; font-size: 14px;`,

  toggle_summary: `font-size: 15px; font-weight: bold; color: #222; margin: 12px 0 6px; padding-left: 18px; border-left: 3px solid #ccc;`,
  toggle_content: `padding-left: 16px; border-left: 2px solid #eee; margin-left: 4px;`,

  footnotes_wrapper: `margin-top: 36px; padding-top: 16px; border-top: 1px solid #e5e5e5;`,
  footnotes_title: `font-size: 13px; font-weight: bold; color: #aaa; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;`,
  footnote_item: `font-size: 12px; color: #666; line-height: 1.7; margin: 5px 0; word-break: break-all;`,
  footnote_num: `color: ${THEME.primaryColor}; font-weight: bold; margin-right: 4px;`,
  footnote_link: `color: #555; text-decoration: none;`,
};

// ── 主入口 ──────────────────────────────────────────────────────────────

function formatToWechat(parsedData) {
  if (!parsedData || !parsedData.blocks) {
    return '<p style="color:red">解析数据为空，请重试</p>';
  }

  const { blocks, links = [] } = parsedData;
  let html = '';

  for (const block of blocks) {
    html += renderBlock(block, links, 0);
  }

  // 添加脚注
  if (links.length > 0) {
    html += renderFootnotes(links);
  }

  return `<section style="${S.wrapper}">${html}</section>`;
}

// ── Block 渲染 ───────────────────────────────────────────────────────────

function renderBlock(block, links, depth) {
  if (!block) return '';

  switch (block.type) {
    case 'h1':
      return `<section style="${S.h1}">${processInlineStyle(block.content)}</section>`;

    case 'h2':
      return `<section style="${S.h2}">${processInlineStyle(block.content)}</section>`;

    case 'h3':
      return `<section style="${S.h3}">${processInlineStyle(block.content)}</section>`;

    case 'paragraph': {
      const text = (block.content || '').trim();
      if (!text) return '<br>';
      return `<p style="${S.p}">${processInlineStyle(block.content)}</p>`;
    }

    case 'quote':
      return `
        <section style="${S.blockquote_wrapper}">
          <p style="${S.blockquote_text}">${processInlineStyle(block.content)}</p>
        </section>`;

    case 'callout':
      return renderCallout(block);

    case 'code':
      return renderCodeBlock(block);

    case 'divider':
      return `<section style="${S.hr}"></section>`;

    case 'bulleted_list':
      return renderList(block.items, 'ul', depth);

    case 'numbered_list':
      return renderList(block.items, 'ol', depth);

    case 'image':
      return renderImage(block);

    case 'video':
      return renderVideo(block);

    case 'toggle':
      return renderToggle(block, links, depth);

    case 'bookmark':
      return `<p style="${S.p}">🔗 <a href="${escAttr(block.url)}" style="color:${THEME.primaryColor}">${escHtml(block.text)}</a><sup style="color:${THEME.primaryColor};font-size:11px">[${block.linkIndex}]</sup></p>`;

    case 'todo':
      return `<p style="${S.p}">${block.checked ? '✅' : '☐'} ${processInlineStyle(block.content)}</p>`;

    case 'column_list':
      if (!block.columns) return '';
      return block.columns.map(col => col.map(b => renderBlock(b, links, depth)).join('')).join('');

    default:
      return '';
  }
}

// ── Callout ──────────────────────────────────────────────────────────────

function renderCallout(block) {
  return `
    <section style="${S.callout_wrapper}">
      <span style="${S.callout_icon}">${block.icon || '💡'}</span>
      <div style="${S.callout_content}">${processInlineStyle(block.content)}</div>
    </section>`;
}

// ── 代码块 ───────────────────────────────────────────────────────────────

function renderCodeBlock(block) {
  const lang = (block.language || 'plaintext').toLowerCase();
  const displayLang = lang === 'plaintext' ? '' : lang;
  const code = escHtml(block.content || '');

  return `
    <section style="${S.code_wrapper}">
      ${displayLang ? `<div style="${S.code_lang_bar}">${escHtml(displayLang)}</div>` : ''}
      <div style="${S.code_pre}"><code style="${S.code_text}">${code}</code></div>
    </section>`;
}

// ── 列表 ────────────────────────────────────────────────────────────────

function renderList(items, listType, depth) {
  if (!items || items.length === 0) return '';

  const isOrdered = listType === 'ol';
  const listStyle = isOrdered ? S.ol : S.ul;
  let itemsHtml = '';

  items.forEach((item, index) => {
    const bullet = isOrdered
      ? `<span style="position:absolute;left:0;color:${THEME.primaryColor};font-weight:bold;">${index + 1}.</span>`
      : `<span style="position:absolute;left:6px;color:${THEME.primaryColor};font-weight:bold;">•</span>`;

    let nested = '';
    if (item.children && item.children.length > 0) {
      // 递归渲染子列表
      for (const child of item.children) {
        nested += renderBlock(child, [], depth + 1);
      }
    }

    itemsHtml += `
      <section style="${S.li}">
        ${bullet}
        ${processInlineStyle(item.content)}
        ${nested}
      </section>`;
  });

  return `<section style="${listStyle}">${itemsHtml}</section>`;
}

// ── 图片 ────────────────────────────────────────────────────────────────

function renderImage(block) {
  if (!block.url) return '';

  return `
    <section style="${S.img_wrapper}">
      <img src="${escAttr(block.url)}" style="${S.img}" alt="${escAttr(block.caption || '图片')}" />
      ${block.caption ? `<p style="${S.img_caption}">${escHtml(block.caption)}</p>` : ''}
    </section>`;
}

// ── 视频 ────────────────────────────────────────────────────────────────

function renderVideo(block) {
  if (block.thumbnailUrl) {
    return `
      <section style="${S.img_wrapper}">
        <img src="${escAttr(block.thumbnailUrl)}" style="${S.img}" alt="视频封面" />
        <p style="${S.img_caption}">📹 视频内容请前往原文查看</p>
      </section>`;
  }

  return `
    <section style="${S.video_wrapper}">
      <p style="${S.video_label}">📹 视频内容请前往原文查看</p>
    </section>`;
}

// ── Toggle / 折叠块 ──────────────────────────────────────────────────────

function renderToggle(block, links, depth) {
  let html = `<section style="${S.toggle_summary}">▶ ${processInlineStyle(block.content)}</section>`;

  if (block.children && block.children.length > 0) {
    let childHtml = block.children.map(b => renderBlock(b, links, depth + 1)).join('');
    html += `<section style="${S.toggle_content}">${childHtml}</section>`;
  }

  return html;
}

// ── 脚注 ────────────────────────────────────────────────────────────────

function renderFootnotes(links) {
  let items = links.map((link, i) => {
    const num = i + 1;
    const displayUrl = link.url.length > 60 ? link.url.slice(0, 60) + '…' : link.url;
    return `
      <p style="${S.footnote_item}">
        <span style="${S.footnote_num}">[${num}]</span>
        ${escHtml(link.text)}：<span style="color:#999">${escHtml(link.url)}</span>
      </p>`;
  }).join('');

  return `
    <section style="${S.footnotes_wrapper}">
      <p style="${S.footnotes_title}">参考资料</p>
      ${items}
    </section>`;
}

// ── 内联样式处理 ─────────────────────────────────────────────────────────
// 对 parser 输出的 HTML 字符串中的 <strong>/<em>/<code> 等标签附加内联样式

function processInlineStyle(html) {
  if (!html) return '';

  return html
    .replace(/<strong>([\s\S]*?)<\/strong>/g, `<strong style="${S.strong}">$1</strong>`)
    .replace(/<em>([\s\S]*?)<\/em>/g, `<em style="${S.em}">$1</em>`)
    .replace(/<code>([\s\S]*?)<\/code>/g, `<code style="${S.code_inline}">$1</code>`)
    .replace(/<s>([\s\S]*?)<\/s>/g, `<s style="${S.s}">$1</s>`)
    .replace(/<sup>\[(\d+)\]<\/sup>/g, `<sup style="font-size:11px;color:${THEME.primaryColor};vertical-align:super;">[$1]</sup>`);
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

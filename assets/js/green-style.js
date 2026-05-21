(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GreenStyle = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_LINES = 8;

  // 贪心断行：中文按单字符累加，超过 maxWidth 即换行；支持 \n；行数封顶
  function wrapHeadingLines(text, maxWidth, measureFn) {
    if (!String(text)) return [];
    const out = [];
    const paragraphs = String(text).split('\n');
    for (const para of paragraphs) {
      if (para === '') { out.push(''); continue; }
      let line = '';
      for (const ch of para) {
        const trial = line + ch;
        if (line && measureFn(trial) > maxWidth) {
          out.push(line);
          line = ch;
        } else {
          line = trial;
        }
      }
      if (line) out.push(line);
    }
    if (out.length > MAX_LINES) {
      const kept = out.slice(0, MAX_LINES);
      kept[MAX_LINES - 1] = kept[MAX_LINES - 1].replace(/.$/u, '') + '…';
      return kept;
    }
    return out;
  }

  const HEADING_FONT = "'可画大丰收SC'";
  const BODY_FONT = "'HarmonyOS Sans SC','PingFang SC',-apple-system,BlinkMacSystemFont,sans-serif";
  const GREEN = '#327847';
  const GREEN_DIM = '#53715C';
  const GRAY = '#808080';

  const HEADING_SPECS = {
    1: { fontSize: 40, lineHeight: 56, color: GREEN, marginTop: 36, marginBottom: 20 },
    2: { fontSize: 32, lineHeight: 46, color: GREEN, marginTop: 32, marginBottom: 16 },
    3: { fontSize: 25, lineHeight: 38, color: GREEN, marginTop: 28, marginBottom: 14 },
    4: { fontSize: 19, lineHeight: 30, color: GREEN, marginTop: 22, marginBottom: 10 },
    5: { fontSize: 16, lineHeight: 26, color: GREEN, marginTop: 18, marginBottom: 8  },
    6: { fontSize: 15, lineHeight: 24, color: GREEN, marginTop: 16, marginBottom: 8  },
  };

  const CONTENT_WIDTH = 560;
  const RENDER_SCALE = 3;

  const GREEN_TOKENS = {
    __headingMode: 'image',
    wrapper:            `font-family:${BODY_FONT};font-size:15px;color:#000000;line-height:1.6;letter-spacing:0.1em;word-wrap:break-word;`,
    h1: `display:block;font-family:${HEADING_FONT};font-size:40px;font-weight:normal;color:${GREEN};text-align:left;margin:36px 0 20px 0;line-height:1.4;`,
    h2: `display:block;font-family:${HEADING_FONT};font-size:32px;font-weight:normal;color:${GREEN};text-align:left;margin:32px 0 16px 0;line-height:1.4;`,
    h3: `display:block;font-family:${HEADING_FONT};font-size:25px;font-weight:normal;color:${GREEN};text-align:left;margin:28px 0 14px 0;line-height:1.5;`,
    h4: `display:block;font-family:${HEADING_FONT};font-size:19px;font-weight:normal;color:${GREEN};text-align:left;margin:22px 0 10px 0;line-height:1.5;`,
    h5: `display:block;font-family:${HEADING_FONT};font-size:16px;font-weight:normal;color:${GREEN};text-align:left;margin:18px 0 8px 0;line-height:1.5;`,
    h6: `display:block;font-family:${HEADING_FONT};font-size:15px;font-weight:normal;color:${GREEN};text-align:left;margin:16px 0 8px 0;line-height:1.5;`,
    p:                  `text-align:justify;line-height:1.6;font-family:${BODY_FONT};margin:0;padding-bottom:1em;letter-spacing:0.1em;white-space:pre-line;color:#000000;font-size:15px;`,
    strong:             `word-break:break-all;font-weight:600;color:${GREEN};`,
    em:                 `font-style:italic;`,
    code_inline:        `background:rgba(50,120,71,.10);border-radius:4px;font-size:85%;padding:0.2em 0.4em;color:${GREEN};font-family:Consolas,Monaco,monospace;`,
    s:                  `text-decoration:line-through;color:#888888;`,
    blockquote_wrapper: `text-align:left;display:block;overflow:auto;padding:10px 14px;margin:20px 0;border-left:3px solid ${GREEN};background-color:#f4f7f4;font-family:${BODY_FONT};line-height:1.6;`,
    blockquote_text:    `text-align:left;line-height:1.6;font-family:${BODY_FONT};margin:0;letter-spacing:0.1em;color:${GREEN};font-size:15px;`,
    callout_wrapper:    `font-size:15px;white-space:normal;margin:20px 0;color:#000000;font-family:${BODY_FONT};line-height:1.6;letter-spacing:0.1em;background-color:#f4f9f5;border:1px solid ${GREEN};border-radius:8px;padding:16px 20px;`,
    callout_content:    ``,
    code_wrapper:       `margin:20px 10px;display:block;font-size:15px;padding:10px;color:#333;position:relative;background-color:#fafafa;border:1px solid #f0f0f0;border-radius:5px;white-space:pre;box-shadow:rgba(0,0,0,.3) 0px 2px 10px;overflow:auto;font-family:Consolas,Monaco,monospace;`,
    code_lang_bar:      `font-size:11px;color:${GREEN};font-family:Consolas,Monaco,monospace;padding-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #f0f0f0;margin-bottom:8px;`,
    code_pre:           `margin:0;padding:0;overflow-x:auto;background:transparent;`,
    code_text:          `font-family:Consolas,Monaco,monospace;font-size:14px;line-height:1.65;white-space:pre;word-break:normal;display:block;color:#333;`,
    hr:                 `border-style:solid;border-width:1px 0 0;border-color:${GREEN_DIM};margin:24px 0;`,
    ul:                 `padding-left:1.5em;font-size:15px;line-height:1.5;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 8px;`,
    ol:                 `padding-left:1.5em;font-size:15px;line-height:1.5;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 8px;`,
    li_ul:              `font-size:15px;line-height:1.5;font-family:${BODY_FONT};list-style-position:outside;list-style-type:disc;color:${GREEN};`,
    li_ol:              `font-size:15px;line-height:1.5;font-family:${BODY_FONT};list-style-position:outside;list-style-type:decimal;color:${GREEN};`,
    li_p:               `font-family:inherit;vertical-align:baseline;margin:8px 0;color:#000000;`,
    img_wrapper:        `margin:15px 0;text-align:center;`,
    img:                `max-width:100%;height:auto;border-radius:8px;display:inline-block;`,
    img_caption:        `font-size:12px;color:${GRAY};margin-top:6px;text-align:center;`,
    video_wrapper:      `margin:1em 0;background:#111;border-radius:8px;padding:28px 20px;text-align:center;`,
    video_label:        `color:rgba(255,255,255,.45);font-size:14px;`,
    toggle_summary:     `font-size:15px;font-weight:bold;color:#000000;margin:12px 0 5px;padding-left:15px;border-left:3px solid ${GREEN};font-family:${BODY_FONT};`,
    toggle_content:     `padding-left:15px;border-left:2px solid rgba(50,120,71,.20);margin-left:4px;`,
    table_wrapper:      `overflow-x:auto;margin:1em 0;`,
    table:              `border-collapse:collapse;width:100%;font-size:15px;line-height:1.6;font-family:${BODY_FONT};`,
    th:                 `background:rgba(50,120,71,.08);padding:7px 13px;border:1px solid rgba(50,120,71,.25);font-weight:bold;text-align:left;color:${GREEN};`,
    td:                 `padding:7px 13px;border:1px solid rgba(50,120,71,.20);color:#000000;`,
    td_even:            `padding:7px 13px;border:1px solid rgba(50,120,71,.20);color:#000000;background:rgba(50,120,71,.03);`,
    embed_wrapper:      `margin:1em 0;border:1px solid rgba(50,120,71,.25);border-radius:8px;padding:11px 15px;`,
    embed_label:        `font-size:12px;color:${GRAY};margin-bottom:4px;`,
    embed_link:         `font-size:13px;text-decoration:none;color:${GREEN};word-break:break-all;`,
    footnotes_wrapper:  `margin-top:30px;padding-top:15px;border-top:1px solid rgba(50,120,71,.25);`,
    footnotes_title:    `font-size:12px;font-weight:bold;color:${GRAY};margin-bottom:.6em;text-transform:uppercase;letter-spacing:1px;`,
    footnote_item:      `font-size:11px;color:#555555;line-height:1.7;margin:.3em 0;word-break:break-all;`,
    footnote_num:       `color:${GREEN};font-weight:bold;margin-right:4px;`,
    todo_check:         `word-break:break-all;font-weight:600;color:${GREEN};`,
    callout_default_icon: '',
    video_label_text:     '📹 视频内容请前往原文查看',
    embed_icon_char:      '📎',
    todo_done_icon:       '✅',
    todo_pending_icon:    '☐',
    toggle_arrow_char:    '▶',
    bookmark_icon_char:   '🔗',
    code_dot1:            '#ed6c60',
    code_dot2:            '#f7c151',
    code_dot3:            '#64c856',
  };

  function _defaultCanvasFactory() {
    if (typeof document !== 'undefined' && document.createElement)
      return document.createElement('canvas');
    throw new Error('no canvas available');
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 渲染单个标题为 <img>（PNG, retina）
  function renderHeadingImage(text, level, opts) {
    opts = opts || {};
    const spec = HEADING_SPECS[level] || HEADING_SPECS[3];
    const scale = opts.scale ?? RENDER_SCALE;
    const contentWidth = opts.contentWidth ?? CONTENT_WIDTH;
    const fontFamily = opts.fontFamily ?? HEADING_FONT;
    const factory = opts.canvasFactory ?? _defaultCanvasFactory;

    const canvas = factory();
    const ctx = canvas.getContext('2d');
    const fontStr = `${spec.fontSize}px ${fontFamily}`;
    ctx.font = fontStr;

    const lines = wrapHeadingLines(text, contentWidth, (s) => ctx.measureText(s).width);

    // 注意：量行宽必须在给 canvas.width 赋值之前完成——赋值会重置上下文状态（含 font）
    let logicalW = 0;
    for (const ln of lines) logicalW = Math.max(logicalW, ctx.measureText(ln).width);
    logicalW = Math.min(Math.ceil(logicalW) + 2, contentWidth);
    const logicalH = lines.length * spec.lineHeight;

    // 空标题：lines 为 [] → logicalW/H 为 0 → 渲染 1px 占位、<img> 宽 0，预览中不可见（预期行为）
    canvas.width = Math.max(1, Math.round(logicalW * scale));
    canvas.height = Math.max(1, Math.round(logicalH * scale));

    const c = canvas.getContext('2d');
    if (typeof c.scale === 'function') c.scale(scale, scale);
    c.font = fontStr;
    c.fillStyle = spec.color;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    lines.forEach((ln, i) => {
      const y = i * spec.lineHeight + (spec.lineHeight - spec.fontSize) / 2;
      c.fillText(ln, 0, y);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const style = [
      'display:block',
      `width:${logicalW}px`,
      'max-width:100%',
      'height:auto',
      `margin:${spec.marginTop}px 0 ${spec.marginBottom}px`,
    ].join(';');
    return `<img src="${dataUrl}" style="${style};" alt="${escapeAttr(text)}" />`;
  }

  return { wrapHeadingLines, MAX_LINES, HEADING_SPECS, GREEN_TOKENS, CONTENT_WIDTH, RENDER_SCALE, HEADING_FONT, renderHeadingImage };
});

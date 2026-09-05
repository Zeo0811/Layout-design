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

  // 标题字体已与正文统一；「可画大丰收SC」保留给「引言」灰标等装饰性文字
  const DISPLAY_FONT = "'可画大丰收SC'";
  const BODY_FONT = "'HarmonyOS Sans SC','PingFang SC',-apple-system,BlinkMacSystemFont,sans-serif";
  // 微信公众号「默认」正文样式（取自 mp.weixin.qq.com 阅读页与编辑器默认字体 span 的实际取值）
  const WX_BODY_FONT = "mp-quote,'PingFang SC',system-ui,-apple-system,BlinkMacSystemFont,'Helvetica Neue','Hiragino Sans GB','Microsoft YaHei UI','Microsoft YaHei',Arial,sans-serif";
  const WX_BODY_SIZE = '15px';
  const WX_BODY_COLOR = 'rgb(51,51,51)';
  const WX_BODY_LS = '0.034em';
  const WX_BODY_LH = '1.6';        // wrapper 用无单位，随后代字号缩放
  const WX_BODY_P_LH = '1.6em';    // 正文段落用 em，复刻参考文章
  const WX_BODY_GAP = '30px';      // 块间距：每块只给下边距，相邻两块恒为 30px
  const LATIN_FONT = "'PingFang SC',-apple-system,BlinkMacSystemFont,sans-serif"; // PART 水印 / 序号 / 星号
  const GREEN = '#327848';
  const GREEN_DIM = '#327848';
  const GRAY = '#808080';
  const WATERMARK = '#B1B1B1';

  // 各级标题的画布构成（逻辑 px）。deco 决定装饰类型：
  //   none → 纯标题；part → 背景 PART 水印 + 下划线；num → 序号 + 右延横线；star → 左侧星号
  const HEADING_SPECS = {
    1: { fontSize: 40, lineHeight: 46, color: GREEN, align: 'left',   deco: 'none', marginTop: 34, marginBottom: 18 },
    2: { fontSize: 33, lineHeight: 38, color: GREEN, align: 'left',   deco: 'part', marginTop: 40, marginBottom: 18,
         wmSize: 63, ruleWeight: 2 },
    3: { fontSize: 23, lineHeight: 27, color: GREEN, align: 'left',   deco: 'num',  marginTop: 32, marginBottom: 14,
         numSize: 27, ruleWeight: 2 },
    4: { fontSize: 19, lineHeight: 22, color: GREEN, align: 'left',   deco: 'star', marginTop: 24, marginBottom: 10,
         starSize: 30 },
    5: { fontSize: 16, lineHeight: 19, color: GREEN, align: 'center', deco: 'none', marginTop: 20, marginBottom: 8  },
    6: { fontSize: 15, lineHeight: 18, color: GREEN, align: 'center', deco: 'none', marginTop: 16, marginBottom: 8  },
  };

  const CONTENT_WIDTH = 560;
  const RENDER_SCALE = 3;

  const GREEN_TOKENS = {
    __headingMode: 'image',
    __variant: 'green',
    wrapper:            `font-family:${WX_BODY_FONT};font-size:${WX_BODY_SIZE};color:${WX_BODY_COLOR};line-height:${WX_BODY_LH};letter-spacing:${WX_BODY_LS};word-wrap:break-word;`,
    h1: `display:block;font-family:${WX_BODY_FONT};font-size:40px;font-weight:normal;color:${GREEN};text-align:left;margin:36px 0 20px 0;line-height:1.4;`,
    h2: `display:block;font-family:${WX_BODY_FONT};font-size:32px;font-weight:normal;color:${GREEN};text-align:left;margin:32px 0 16px 0;line-height:1.4;`,
    h3: `display:block;font-family:${WX_BODY_FONT};font-size:25px;font-weight:normal;color:${GREEN};text-align:left;margin:28px 0 14px 0;line-height:1.5;`,
    h4: `display:block;font-family:${WX_BODY_FONT};font-size:19px;font-weight:normal;color:${GREEN};text-align:left;margin:22px 0 10px 0;line-height:1.5;`,
    h5: `display:block;font-family:${WX_BODY_FONT};font-size:16px;font-weight:normal;color:${GREEN};text-align:left;margin:18px 0 8px 0;line-height:1.5;`,
    h6: `display:block;font-family:${WX_BODY_FONT};font-size:15px;font-weight:normal;color:${GREEN};text-align:left;margin:16px 0 8px 0;line-height:1.5;`,
    p:                  `text-align:justify;line-height:${WX_BODY_P_LH};font-family:${WX_BODY_FONT};margin:0;padding-bottom:${WX_BODY_GAP};letter-spacing:${WX_BODY_LS};white-space:pre-line;color:${WX_BODY_COLOR};font-size:${WX_BODY_SIZE};`,
    strong:             `word-break:break-all;font-weight:600;color:${GREEN};`,
    em:                 `font-style:italic;`,
    code_inline:        `background:rgba(50,120,72,.10);border-radius:4px;font-size:85%;padding:0.2em 0.4em;color:${GREEN};font-family:Consolas,Monaco,monospace;`,
    s:                  `text-decoration:line-through;color:#888888;`,
    // 引用：左上绿色引号挂在左侧留白，正文缩进 42px、绿色加粗、两端对齐、字距 0.17em、行高 1.1
    blockquote_wrapper: `position:relative;text-align:left;display:block;margin:0 0 30px;padding:4px 0 4px 42px;font-family:${WX_BODY_FONT};`,
    blockquote_mark:    `position:absolute;left:0;top:0;width:27px;height:auto;display:block;`,
    blockquote_text:    `text-align:justify;line-height:1.11;font-family:${WX_BODY_FONT};margin:0;letter-spacing:0.1em;color:${GREEN};font-size:15px;font-weight:600;`,
    // Callout：左侧 7px #327848 竖条 + 绿色加粗、左对齐正文、字距 0.1em、行高 1.27、缩进 22px（无底色/无描边）
    callout_wrapper:    `text-align:left;font-size:15px;white-space:normal;margin:0 0 30px;color:${GREEN};font-family:${WX_BODY_FONT};line-height:1.35;letter-spacing:0.1em;font-weight:600;border-left:7px solid #327848;padding:2px 0 2px 22px;`,
    callout_content:    ``,
    // 引言：大丰收「引言」灰标 + 绿色↘箭头（render 内 SVG）+ 绿色两端对齐正文，行高 1.27（无边框）
    intro_wrapper:      `margin:0 0 30px;font-family:${WX_BODY_FONT};`,
    intro_head:         `display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px;`,
    intro_arrow:        `font-size:38px;line-height:1;color:${GREEN};`,
    intro_text:         `text-align:justify;line-height:1.27;font-family:${WX_BODY_FONT};margin:0;letter-spacing:0.1em;color:${GREEN};font-size:15px;`,
    code_wrapper:       `margin:0 10px 30px;display:block;font-size:15px;padding:10px;color:#333;position:relative;background-color:#fafafa;border:1px solid #f0f0f0;border-radius:5px;white-space:pre;box-shadow:rgba(0,0,0,.3) 0px 2px 10px;overflow:auto;font-family:Consolas,Monaco,monospace;`,
    code_lang_bar:      `font-size:11px;color:${GREEN};font-family:Consolas,Monaco,monospace;padding-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #f0f0f0;margin-bottom:8px;`,
    code_pre:           `margin:0;padding:0;overflow-x:auto;background:transparent;`,
    code_text:          `font-family:Consolas,Monaco,monospace;font-size:14px;line-height:1.65;white-space:pre;word-break:normal;display:block;color:#333;`,
    hr:                 `border-style:solid;border-width:1px 0 0;border-color:${GREEN_DIM};margin:0 0 30px;`,
    hr_wrapper:         `margin:0 0 30px;text-align:center;line-height:0;`,
    ol_row:             `display:flex;align-items:baseline;margin:0 0 30px 0;`,
    ol_num:             `flex:none;font-family:${LATIN_FONT};font-size:18px;font-weight:600;color:${GREEN};line-height:1.5;margin-right:12px;`,
    ol_text:            `flex:1;font-size:15px;line-height:1.27;letter-spacing:0.1em;color:${GREEN};font-family:${BODY_FONT};margin:0;`,
    ul:                 `padding-left:1.5em;font-size:15px;line-height:1.27;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 30px;`,
    ol:                 `padding-left:1.5em;font-size:15px;line-height:1.27;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 30px;`,
    li_ul:              `font-size:15px;line-height:1.27;font-family:${BODY_FONT};list-style-position:outside;list-style-type:disc;color:${GREEN};`,
    li_ol:              `font-size:15px;line-height:1.27;font-family:${BODY_FONT};list-style-position:outside;list-style-type:decimal;color:${GREEN};`,
    li_p:               `font-family:inherit;vertical-align:baseline;margin:0 0 6px 0;color:${GREEN};letter-spacing:0.1em;`,
    todo_item:          `display:flex;align-items:center;column-gap:8px;color:${GREEN};font-family:${BODY_FONT};font-size:15px;line-height:1.27;letter-spacing:0.1em;margin:4px 0;`,
    img_wrapper:        `margin:0 0 30px;text-align:center;`,
    img:                `max-width:100%;height:auto;display:inline-block;`,
    img_caption:        `font-size:11px;color:${GRAY};margin-top:6px;text-align:center;letter-spacing:0.1em;line-height:1.83;`,
    video_wrapper:      `margin:0 0 30px;background:#111;border-radius:8px;padding:28px 20px;text-align:center;`,
    video_label:        `color:rgba(255,255,255,.45);font-size:14px;`,
    toggle_summary:     `font-size:15px;font-weight:bold;color:#000000;margin:12px 0 6px;font-family:${BODY_FONT};letter-spacing:0.1em;`,
    toggle_content:     `padding-left:14px;border-left:2px solid ${GREEN};margin-left:2px;`,
    toggle_text:        `text-align:left;line-height:1.27;font-family:${BODY_FONT};margin:0;letter-spacing:0.1em;color:${GREEN};font-size:15px;`,
    table_wrapper:      `overflow-x:auto;margin:0 0 30px;`,
    table:              `border-collapse:collapse;width:100%;font-size:15px;line-height:1.6;font-family:${BODY_FONT};`,
    th:                 `background:rgba(50,120,72,.08);padding:7px 13px;border:1px solid rgba(50,120,72,.25);font-weight:bold;text-align:left;color:${GREEN};`,
    td:                 `padding:7px 13px;border:1px solid rgba(50,120,72,.20);color:#000000;`,
    td_even:            `padding:7px 13px;border:1px solid rgba(50,120,72,.20);color:#000000;background:rgba(50,120,72,.03);`,
    embed_wrapper:      `margin:0 0 30px;border:1px solid rgba(50,120,72,.25);border-radius:8px;padding:11px 15px;`,
    embed_label:        `font-size:14px;font-weight:600;color:${GREEN};margin-bottom:4px;letter-spacing:0.1em;`,
    embed_link:         `font-size:13px;text-decoration:none;color:${GREEN};word-break:break-all;letter-spacing:0.1em;`,
    footnotes_wrapper:  `margin-top:30px;padding-top:15px;border-top:1px solid rgba(50,120,72,.25);`,
    footnotes_title:    `font-size:11px;font-weight:400;color:${GRAY};margin-bottom:.6em;letter-spacing:0.1em;line-height:1.94; text-align: left;`,
    footnote_item:      `font-size:11px;color:${GREEN};line-height:1.94;margin:.3em 0;letter-spacing:0.1em;word-break:break-all; text-align: left;`,
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

  function _twoDigit(n) { return String(n == null ? 1 : n).padStart(2, '0'); }

  // 画多行标题文字（大丰收）。align: 'left' 从 xLeft 起；'center' 以 W 居中
  function _drawTitle(c, lines, font, color, fontSize, lineHeight, yTop, align, W, xLeft) {
    c.font = font; c.fillStyle = color; c.textBaseline = 'top';
    lines.forEach((ln, i) => {
      const y = yTop + i * lineHeight + (lineHeight - fontSize) / 2;
      if (align === 'center') { c.textAlign = 'center'; c.fillText(ln, W / 2, y); }
      else { c.textAlign = 'left'; c.fillText(ln, xLeft || 0, y); }
    });
  }

  // 按级别构成布局。用 mctx 测量，返回 { height, draw(c) }。draw 在 canvas 重置后执行，自行设置字体。
  function _composeHeading(mctx, spec, text, W, fontFamily, seq) {
    const titleFont = `${spec.fontSize}px ${fontFamily}`;
    const lh = spec.lineHeight, fs = spec.fontSize, color = spec.color, align = spec.align;
    const padTop = Math.round(fs * 0.12);

    if (spec.deco === 'part') {
      const wm = 'PART ' + _twoDigit(seq);
      const wmFont = `600 ${spec.wmSize}px ${LATIN_FONT}`;
      const titleTop = Math.round(spec.wmSize * 0.5);          // 标题压在水印下半部
      mctx.font = titleFont;
      const lines = wrapHeadingLines(text, W, (s) => mctx.measureText(s).width);
      const titleBottom = titleTop + lines.length * lh;
      const ruleY = titleBottom + 12;
      const height = ruleY + spec.ruleWeight + 8;
      return { height, draw(c) {
        c.font = wmFont; c.fillStyle = WATERMARK; c.textBaseline = 'top'; c.textAlign = 'left';
        c.fillText(wm, 0, 0);
        _drawTitle(c, lines, titleFont, color, fs, lh, titleTop, 'left', W, 0);
        c.fillStyle = color; c.fillRect(0, ruleY, W, spec.ruleWeight);
      } };
    }

    if (spec.deco === 'num') {
      const numStr = _twoDigit(seq);
      const numFont = `600 ${spec.numSize}px ${LATIN_FONT}`;
      mctx.font = numFont;
      const numW = Math.ceil(mctx.measureText(numStr).width);
      const ruleX = numW + 14, ruleY = Math.round(spec.numSize * 0.5);
      const titleTop = spec.numSize + 12;
      mctx.font = titleFont;
      const lines = wrapHeadingLines(text, W, (s) => mctx.measureText(s).width);
      const height = titleTop + lines.length * lh + Math.round(fs * 0.2);
      return { height, draw(c) {
        c.font = numFont; c.fillStyle = color; c.textBaseline = 'top'; c.textAlign = 'left';
        c.fillText(numStr, 0, 0);
        c.fillRect(ruleX, ruleY, Math.max(0, W - ruleX), spec.ruleWeight);
        _drawTitle(c, lines, titleFont, color, fs, lh, titleTop, 'left', W, 0);
      } };
    }

    if (spec.deco === 'star') {
      const starFont = `600 ${spec.starSize}px ${LATIN_FONT}`;
      mctx.font = starFont;
      const starW = Math.ceil(mctx.measureText('*').width);
      const titleX = starW + 12;
      mctx.font = titleFont;
      const lines = wrapHeadingLines(text, W - titleX, (s) => mctx.measureText(s).width);
      const height = padTop + lines.length * lh + Math.round(fs * 0.2);
      return { height, draw(c) {
        // 星号顶端与标题首行对齐
        c.font = starFont; c.fillStyle = color; c.textBaseline = 'top'; c.textAlign = 'left';
        c.fillText('*', 0, padTop - Math.round(spec.starSize * 0.06));
        _drawTitle(c, lines, titleFont, color, fs, lh, padTop, 'left', W, titleX);
      } };
    }

    // deco === 'none'（H1 / H5 / H6）
    mctx.font = titleFont;
    const lines = wrapHeadingLines(text, W, (s) => mctx.measureText(s).width);
    const height = padTop + lines.length * lh + Math.round(fs * 0.2);
    return { height, draw(c) {
      _drawTitle(c, lines, titleFont, color, fs, lh, padTop, align, W, 0);
    } };
  }

  // 渲染单个标题为 <img>（PNG, retina），整块构成（标题 + 装饰）画进一张图
  function renderHeadingImage(text, level, opts) {
    opts = opts || {};
    const spec = HEADING_SPECS[level] || HEADING_SPECS[3];
    const scale = opts.scale ?? RENDER_SCALE;
    const W = opts.contentWidth ?? CONTENT_WIDTH;
    const fontFamily = opts.fontFamily ?? WX_BODY_FONT;
    const factory = opts.canvasFactory ?? _defaultCanvasFactory;
    const seq = opts.seq ?? 1;

    const canvas = factory();
    const mctx = canvas.getContext('2d');

    // 注意：所有测量必须在给 canvas.width 赋值之前完成——赋值会重置上下文状态
    const layout = _composeHeading(mctx, spec, text, W, fontFamily, seq);

    canvas.width = Math.max(1, Math.round(W * scale));
    canvas.height = Math.max(1, Math.round(layout.height * scale));

    const c = canvas.getContext('2d');
    if (typeof c.scale === 'function') c.scale(scale, scale);
    layout.draw(c);

    const dataUrl = canvas.toDataURL('image/png');
    // 不写死 width（微信对固定宽处理非确定性，连相同图都给 460/560）；只 max-width:100% 让微信按 data-w 统一铺到正文宽
    const style = `display:block;max-width:100%;height:auto;margin:${spec.marginTop}px 0 ${spec.marginBottom}px`;
    return `<img src="${dataUrl}" style="${style};" alt="${escapeAttr(text)}" />`;
  }

  // 渲染一段大丰收文字为 <img>（无装饰，可指定字号/颜色/对齐），用于「引言」等标签
  function renderTextImage(text, opts) {
    opts = opts || {};
    const size = opts.size ?? 22;
    const color = opts.color ?? GREEN;
    const align = opts.align ?? 'left';
    const lineHeight = opts.lineHeight ?? Math.round(size * 1.35);
    const scale = opts.scale ?? RENDER_SCALE;
    const W = opts.contentWidth ?? CONTENT_WIDTH;
    const fontFamily = opts.fontFamily ?? DISPLAY_FONT;
    const factory = opts.canvasFactory ?? _defaultCanvasFactory;

    const canvas = factory();
    const mctx = canvas.getContext('2d');
    const font = `${size}px ${fontFamily}`;
    mctx.font = font;
    const lines = wrapHeadingLines(text, W, (s) => mctx.measureText(s).width);
    let tw = 0;
    for (const ln of lines) tw = Math.max(tw, mctx.measureText(ln).width);
    const boxW = opts.width ?? Math.min(Math.ceil(tw) + 2, W);
    const padTop = Math.round(size * 0.12);
    const h = padTop + lines.length * lineHeight + Math.round(size * 0.2);

    canvas.width = Math.max(1, Math.round(boxW * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const c = canvas.getContext('2d');
    if (typeof c.scale === 'function') c.scale(scale, scale);
    _drawTitle(c, lines, font, color, size, lineHeight, padTop, align, boxW, 0);

    const style = `display:inline-block;width:${boxW}px;max-width:100%;height:auto;vertical-align:middle;`;
    return `<img src="${canvas.toDataURL('image/png')}" style="${style}" alt="${escapeAttr(text)}" />`;
  }

  // 引用引号矢量真路径（Figma node 23:185，98×80 填充）
  const QUOTE_PATH = 'M96.3706 0L96.3706 15.5752C89.8527 17.6991 84.4988 21.4749 80.3088 27.1386C76.1188 32.3304 74.2565 37.9941 74.2565 43.6578C75.4204 42.9498 77.2827 42.7139 80.076 42.7139C84.9644 42.7139 89.1544 44.3658 92.8789 47.9056C96.1378 51.4454 98 55.9292 98 61.3569C98 66.7847 96.1378 71.2684 92.4133 74.8083C88.6889 78.1121 84.0333 80 78.4466 80C71.9287 80 66.8076 77.1681 62.6176 71.9764C58.4276 66.7847 56.5653 59.941 56.5653 51.9174C56.5653 39.174 60.057 28.3186 67.2732 19.115C74.2565 9.6755 84.0333 3.30383 96.3706 0ZM39.8052 0L39.8052 15.5752C33.2874 17.6991 28.1663 21.4749 23.9762 27.1386C19.7862 32.3304 17.6912 37.9941 17.6912 43.6578C18.8551 42.9498 20.7173 42.7139 23.5107 42.7139C28.3991 42.7139 32.5891 44.3658 36.0808 47.9056C39.5725 51.4454 41.4347 55.9292 41.4347 61.3569C41.4347 66.7847 39.5725 71.2684 36.0808 74.8083C32.3563 78.1121 27.4679 80 21.8812 80C15.3634 80 10.2423 77.1681 6.28504 71.9764C2.09501 66.7847 0 59.941 0 51.9174C0 39.174 3.49169 28.3186 10.7078 19.115C17.6912 9.6755 27.4679 3.30383 39.8052 0Z';

  // 整块渲染「引用」为 PNG（引号矢量 + 绿色加粗换行文字 + 逐行两端对齐），保证微信里与 Figma 一致
  function renderQuoteImage(text, opts) {
    opts = opts || {};
    const scale = opts.scale ?? RENDER_SCALE;
    const W = opts.contentWidth ?? CONTENT_WIDTH;
    const factory = opts.canvasFactory ?? _defaultCanvasFactory;
    const fontFamily = opts.bodyFont ?? WX_BODY_FONT;
    const fontSize = opts.fontSize ?? 15;
    const lineHeight = opts.lineHeight ?? 16;   // Figma 60/55≈1.09 → 16px
    const baseLS = fontSize * 0.17;          // 引用字距 0.17em
    const indent = opts.indent ?? 42;        // 正文相对左缘缩进（Figma 155 设计px ÷3.67）
    const markW = opts.markW ?? 27;          // 引号 98 设计px ÷3.67
    const markH = markW * 80 / 98;
    const color = GREEN;
    const textW = W - indent;

    const canvas = factory();
    const mctx = canvas.getContext('2d');
    const fontStr = `600 ${fontSize}px ${fontFamily}`;
    mctx.font = fontStr;
    if ('letterSpacing' in mctx) mctx.letterSpacing = baseLS + 'px';
    const lines = wrapHeadingLines(text, textW, (s) => mctx.measureText(s).width);

    const textTop = 6;   // 首行与引号大致并齐（引号略高）
    const height = Math.ceil(Math.max(markH + 4, textTop + lines.length * lineHeight) + 6);
    canvas.width = Math.max(1, Math.round(W * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const c = canvas.getContext('2d');
    if (typeof c.scale === 'function') c.scale(scale, scale);
    // 引号矢量
    if (typeof Path2D !== 'undefined') {
      c.save(); c.translate(0, 2); c.scale(markW / 98, markW / 98);
      c.fillStyle = color; c.fill(new Path2D(QUOTE_PATH)); c.restore();
    }
    // 文字（逐行两端对齐：非末行按需加大字距铺满 textW）
    c.fillStyle = color; c.textBaseline = 'top'; c.textAlign = 'left';
    lines.forEach((ln, i) => {
      let ls = baseLS;
      if ('letterSpacing' in c) c.letterSpacing = ls + 'px';
      c.font = fontStr;
      const w = c.measureText(ln).width;
      const isLast = i === lines.length - 1;
      if (!isLast && ln.length > 1 && 'letterSpacing' in c) {
        const extra = (textW - w) / (ln.length - 1);
        if (extra > 0 && extra < fontSize) { ls = baseLS + extra; c.letterSpacing = ls + 'px'; }
      }
      c.fillText(ln, indent, textTop + i * lineHeight);
    });
    if ('letterSpacing' in c) c.letterSpacing = '0px';

    const style = `display:block;width:${W}px;max-width:100%;height:auto;margin:0 0 30px;`;
    return `<img src="${canvas.toDataURL('image/png')}" style="${style}" alt="${escapeAttr(text)}" />`;
  }

  // 引言箭头矢量真路径（Figma node 23:277/278，viewBox 139×133）
  const ARROW_PATH_1 = 'M131.25 125L131.25 132.5L138.75 132.5L138.75 125L131.25 125ZM131.25 0L123.75 0L123.75 125L131.25 125L138.75 125L138.75 0L131.25 0ZM131.25 125L131.25 117.5L0 117.5L0 125L0 132.5L131.25 132.5L131.25 125Z';
  const ARROW_PATH_2 = 'M0 0L-5.23871 5.36711L113.511 121.276L118.75 115.909L123.989 110.542L5.23871 -5.36711L0 0Z';

  // 整块渲染「引言」为 PNG（箭头矢量 + 大丰收「引言」灰标 + 绿色正文逐行两端对齐），保证微信与 Figma 一致
  function renderIntroImage(text, opts) {
    opts = opts || {};
    const scale = opts.scale ?? RENDER_SCALE;
    const W = opts.contentWidth ?? CONTENT_WIDTH;
    const factory = opts.canvasFactory ?? _defaultCanvasFactory;
    const bodyFont = opts.bodyFont ?? WX_BODY_FONT;
    const fontSize = opts.fontSize ?? 15;
    const lineHeight = opts.lineHeight ?? 19;   // Figma 70/55≈1.27
    const baseLS = fontSize * 0.1;
    const arrowW = 36, arrowH = arrowW * 133 / 139;   // Figma 131 设计px ÷3.67
    const labelSize = 33;                              // Figma 120 设计px ÷3.67

    const canvas = factory();
    const mctx = canvas.getContext('2d');
    const bodyStr = `${fontSize}px ${bodyFont}`;
    mctx.font = bodyStr;
    if ('letterSpacing' in mctx) mctx.letterSpacing = baseLS + 'px';
    const lines = wrapHeadingLines(text, W, (s) => mctx.measureText(s).width);

    const headH = Math.max(arrowH, labelSize) + 4;
    const bodyTop = headH + 14;
    const height = Math.ceil(bodyTop + lines.length * lineHeight + 6);
    canvas.width = Math.max(1, Math.round(W * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const c = canvas.getContext('2d');
    if (typeof c.scale === 'function') c.scale(scale, scale);
    // 箭头（左上，绿色）
    if (typeof Path2D !== 'undefined') {
      c.save(); c.scale(arrowW / 139, arrowW / 139); c.fillStyle = GREEN;
      c.fill(new Path2D(ARROW_PATH_1));
      c.save(); c.translate(12, 9); c.fill(new Path2D(ARROW_PATH_2)); c.restore();
      c.restore();
    }
    // 大丰收「引言」灰标（右上，底对齐箭头）
    c.font = `${labelSize}px ${DISPLAY_FONT}`; c.fillStyle = '#808080';
    c.textBaseline = 'alphabetic'; c.textAlign = 'right';
    if ('letterSpacing' in c) c.letterSpacing = '0px';
    c.fillText('引言', W, Math.max(arrowH, labelSize));
    // 正文（绿色，逐行两端对齐）
    c.fillStyle = GREEN; c.textBaseline = 'top'; c.textAlign = 'left'; c.font = bodyStr;
    lines.forEach((ln, i) => {
      let ls = baseLS;
      if ('letterSpacing' in c) c.letterSpacing = ls + 'px';
      c.font = bodyStr;
      const w = c.measureText(ln).width;
      const isLast = i === lines.length - 1;
      if (!isLast && ln.length > 1 && 'letterSpacing' in c) {
        const extra = (W - w) / (ln.length - 1);
        if (extra > 0 && extra < fontSize) { ls = baseLS + extra; c.letterSpacing = ls + 'px'; }
      }
      c.fillText(ln, 0, bodyTop + i * lineHeight);
    });
    if ('letterSpacing' in c) c.letterSpacing = '0px';

    const style = `display:block;width:${W}px;max-width:100%;height:auto;margin:0 0 30px;`;
    return `<img src="${canvas.toDataURL('image/png')}" style="${style}" alt="${escapeAttr(text)}" />`;
  }

  return { wrapHeadingLines, MAX_LINES, HEADING_SPECS, GREEN_TOKENS, CONTENT_WIDTH, RENDER_SCALE, HEADING_FONT: WX_BODY_FONT, DISPLAY_FONT, LATIN_FONT, renderHeadingImage, renderTextImage, renderQuoteImage, renderIntroImage };
});

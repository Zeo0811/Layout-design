(function () {
  const FONT = "Optima-Regular, Optima, PingFangSC-light, PingFangTC-light, 'PingFang SC', Cambria, Cochin, Georgia, Times, 'Times New Roman', serif";
  const MONO = 'Operator Mono, Consolas, Monaco, Menlo, monospace';

  const DEFAULT_STYLE = {
    wrapper: `font-family: ${FONT}; font-size: 15px; color: rgb(63,63,63); line-height: 1.75; letter-spacing: 0.1em; word-wrap: break-word;`,
    h1: `display: block; line-height: 1.5; font-size: 24px; font-family: ${FONT}; font-weight: bold; margin: 80px auto 40px auto; width: fit-content; color: #407600; text-align: center; padding: 0 1em; border-bottom: 8px solid #407600;`,
    h2: `display: block; line-height: 1.5; font-family: ${FONT}; font-size: 20px; font-weight: bold; margin: 40px auto; width: fit-content; color: #222222; text-align: center; padding: 0 0.2em;`,
    h3: `display: block; line-height: 1.5; font-family: ${FONT}; font-size: 17px; font-weight: bold; margin: 40px 0; width: fit-content; color: #222222; text-align: left;`,
    h4: `display: block; line-height: 1.5; font-family: ${FONT}; font-size: 16px; font-weight: bold; margin: 1em 0 .5em; color: #222222;`,
    h5: `display: block; line-height: 1.5; font-family: ${FONT}; font-size: 15px; font-weight: bold; margin: .8em 0 .4em; color: #222222;`,
    h6: `display: block; line-height: 1.5; font-family: ${FONT}; font-size: 14px; font-weight: bold; margin: .7em 0 .35em; color: #555555;`,
    p: `text-align: left; line-height: 26px; font-family: ${FONT}; margin: 10px 0; letter-spacing: 0.1em; white-space: pre-line; color: rgb(63,63,63); font-size: 15px;`,
    strong: `word-break: break-all; font-weight: 600; color: #407600;`,
    em: `font-style: italic;`,
    code_inline: `background: rgba(135,131,120,.15); border-radius: 4px; font-size: 85%; padding: 0.2em 0.4em; color: #222222; font-family: ${MONO};`,
    s: `text-decoration: line-through; color: #888888;`,
    blockquote_wrapper: `line-height: 26px; word-spacing: normal; hyphens: auto; text-align: left; outline: 0; max-width: 100%; border-top: none; border-right: none; border-bottom: none; display: block; overflow: auto; padding: 10px; margin: 20px 0; border-left: 8px solid #222222; background-color: #f5f5f5; font-family: ${FONT};`,
    blockquote_text: `text-align: left; line-height: 26px; font-family: ${FONT}; margin: 0; letter-spacing: 0.1em; color: rgb(63,63,63); font-size: 15px;`,
    callout_wrapper: `font-size: 15px; white-space: normal; margin: 20px 0; color: rgba(0,0,0,.9); font-family: ${FONT}; line-height: 26px; background-color: #fff; border-bottom: 1px dashed #222222; border-right: 1px dashed #222222;`,
    callout_header: `width: 90%; padding-right: 10px; padding-left: 10px; border-style: solid; border-width: 1px 0 0 10px; border-color: #222222;`,
    callout_content: `padding: 0 12px 15px; color: #3f3f3f; letter-spacing: 0.1em;`,
    code_wrapper: `margin: 20px 10px; display: block; font-size: 15px; padding: 10px; color: #333; position: relative; background-color: #fafafa; border: 1px solid #f0f0f0; border-radius: 5px; white-space: pre; box-shadow: rgba(0,0,0,.3) 0px 2px 10px; overflow: auto; font-family: ${MONO};`,
    code_lang_bar: `font-size: 11px; color: #999; font-family: ${MONO}; padding-bottom: 6px; letter-spacing: 0.5px; text-transform: uppercase; border-bottom: 1px solid #f0f0f0; margin-bottom: 8px;`,
    code_pre: `margin: 0; padding: 0; overflow-x: auto; background: transparent;`,
    code_text: `font-family: ${MONO}; font-size: 14px; line-height: 1.65; white-space: pre; word-break: normal; display: block; color: #333;`,
    hr: `border-style: solid; border-width: 1px 0 0; border-color: #797979; margin: 15px 0;`,
    ul: `padding-left: 1.5em; font-size: 15px; line-height: 1.75; font-family: ${FONT}; vertical-align: baseline; white-space: normal; color: rgb(63,63,63); margin-bottom: 8px; margin-top: 0;`,
    ol: `padding-left: 1.5em; font-size: 15px; line-height: 26px; font-family: ${FONT}; vertical-align: baseline; white-space: normal; color: rgb(63,63,63); margin-bottom: 8px; margin-top: 0;`,
    li_ul: `font-size: 15px; line-height: 26px; font-family: ${FONT}; list-style-position: outside; list-style-type: disc;`,
    li_ol: `font-size: 15px; line-height: 1.75; font-family: ${FONT}; list-style-position: outside; list-style-type: decimal;`,
    li_p: `font-family: inherit; vertical-align: baseline; margin: 10px 0;`,
    todo_check: `word-break: break-all; font-weight: 600; color: #407600;`,
    img_wrapper: `margin: 15px 0; text-align: center;`,
    img: `max-width: 100%; height: auto; border-radius: 10px; display: inline-block;`,
    img_caption: `font-size: 12px; color: #888888; margin-top: 5px; text-align: center;`,
    video_wrapper: `margin: 1em 0; background: #111; border-radius: 8px; padding: 28px 20px; text-align: center;`,
    video_label: `color: rgba(255,255,255,.45); font-size: 14px;`,
    toggle_summary: `font-size: 15px; font-weight: bold; color: #222222; margin: 12px 0 5px; padding-left: 15px; border-left: 3px solid #222222; font-family: ${FONT};`,
    toggle_content: `padding-left: 15px; border-left: 2px solid rgba(0,0,0,.15); margin-left: 4px;`,
    table_wrapper: `overflow-x: auto; margin: 1em 0;`,
    table: `border-collapse: collapse; width: 100%; font-size: 15px; line-height: 1.6; font-family: ${FONT};`,
    th: `background: rgba(0,0,0,.05); padding: 7px 13px; border: 1px solid rgba(0,0,0,.15); font-weight: bold; text-align: left; color: #222222;`,
    td: `padding: 7px 13px; border: 1px solid rgba(0,0,0,.15); color: #222222;`,
    td_even: `padding: 7px 13px; border: 1px solid rgba(0,0,0,.15); color: #222222; background: rgba(0,0,0,.02);`,
    embed_wrapper: `margin: 1em 0; border: 1px solid rgba(0,0,0,.1); padding: 11px 15px;`,
    embed_label: `font-size: 12px; color: #888888; margin-bottom: 4px;`,
    embed_link: `font-size: 13px; text-decoration: none; color: #222222; border-bottom: 1px solid #222222; word-break: break-all;`,
    footnotes_wrapper: `margin-top: 30px; padding-top: 15px; border-top: 1px solid rgba(0,0,0,.15);`,
    footnotes_title: `font-size: 12px; font-weight: bold; color: #888888; margin-bottom: .6em; text-transform: uppercase; letter-spacing: 1px;`,
    footnote_item: `font-size: 12px; color: #555555; line-height: 1.7; margin: .3em 0; word-break: break-all;`,
    footnote_num: `color: #222222; font-weight: bold; margin-right: 4px;`,
  };

  const STYLE_FIELDS = [
    { key: 'wrapper', label: '页面容器', group: '基础' },
    { key: 'h1', label: 'H1 标题', group: '标题' },
    { key: 'h2', label: 'H2 标题', group: '标题' },
    { key: 'h3', label: 'H3 标题', group: '标题' },
    { key: 'h4', label: 'H4 标题', group: '标题' },
    { key: 'h5', label: 'H5 标题', group: '标题' },
    { key: 'h6', label: 'H6 标题', group: '标题' },
    { key: 'p', label: '正文段落', group: '正文' },
    { key: 'strong', label: '加粗', group: '行内' },
    { key: 'em', label: '斜体', group: '行内' },
    { key: 's', label: '删除线', group: '行内' },
    { key: 'code_inline', label: '行内代码', group: '行内' },
    { key: 'blockquote_wrapper', label: '引用容器', group: '引用' },
    { key: 'blockquote_text', label: '引用文本', group: '引用' },
    { key: 'callout_wrapper', label: 'Callout 容器', group: 'Callout' },
    { key: 'callout_header', label: 'Callout 头部', group: 'Callout' },
    { key: 'callout_content', label: 'Callout 内容', group: 'Callout' },
    { key: 'code_wrapper', label: '代码块容器', group: '代码' },
    { key: 'code_lang_bar', label: '代码语言栏', group: '代码' },
    { key: 'code_pre', label: '代码 pre', group: '代码' },
    { key: 'code_text', label: '代码字体', group: '代码' },
    { key: 'hr', label: '分割线', group: '其他' },
    { key: 'ul', label: '无序列表', group: '列表' },
    { key: 'ol', label: '有序列表', group: '列表' },
    { key: 'li_ul', label: '无序列表项', group: '列表' },
    { key: 'li_ol', label: '有序列表项', group: '列表' },
    { key: 'li_p', label: '列表正文', group: '列表' },
    { key: 'todo_check', label: '待办勾选', group: '其他' },
    { key: 'img_wrapper', label: '图片容器', group: '媒体' },
    { key: 'img', label: '图片', group: '媒体' },
    { key: 'img_caption', label: '图片描述', group: '媒体' },
    { key: 'video_wrapper', label: '视频容器', group: '媒体' },
    { key: 'video_label', label: '视频占位', group: '媒体' },
    { key: 'toggle_summary', label: '折叠标题', group: '折叠块' },
    { key: 'toggle_content', label: '折叠内容', group: '折叠块' },
    { key: 'table_wrapper', label: '表格容器', group: '表格' },
    { key: 'table', label: '表格', group: '表格' },
    { key: 'th', label: '表头', group: '表格' },
    { key: 'td', label: '表格单元', group: '表格' },
    { key: 'td_even', label: '表格间隔行', group: '表格' },
    { key: 'embed_wrapper', label: '嵌入容器', group: '嵌入' },
    { key: 'embed_label', label: '嵌入标题', group: '嵌入' },
    { key: 'embed_link', label: '嵌入链接', group: '嵌入' },
    { key: 'footnotes_wrapper', label: '脚注容器', group: '脚注' },
    { key: 'footnotes_title', label: '脚注标题', group: '脚注' },
    { key: 'footnote_item', label: '脚注项', group: '脚注' },
    { key: 'footnote_num', label: '脚注编号', group: '脚注' },
  ];

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function sanitizeStyle(partial) {
    const base = clone(DEFAULT_STYLE);
    const target = {};
    STYLE_FIELDS.forEach((field) => {
      target[field.key] = (partial && partial[field.key]) || base[field.key] || '';
    });
    return target;
  }

  window.LayoutStyleSchema = {
    STORAGE_KEY: 'LD_CUSTOM_STYLES_V1',
    DEFAULT_STYLE_ID: 'ld_default',
    DEFAULT_STYLE_NAME: '十字路口专用默认样式',
    fonts: { FONT, MONO },
    fields: STYLE_FIELDS,
    getDefaultStyle: () => clone(DEFAULT_STYLE),
    sanitizeStyle,
  };
})();

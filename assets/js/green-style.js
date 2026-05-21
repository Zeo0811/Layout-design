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

  return { wrapHeadingLines, MAX_LINES };
});

(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.renderGreenArticle = api.renderGreenArticle; root.GreenFmt = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // h2/h3 递增计数器（全局简单递增；renderGreenArticle 每次新建）
  function makeSeqCounter() {
    const n = { h2: 0, h3: 0 };
    return { next(type) { n[type] = (n[type] || 0) + 1; return n[type]; } };
  }

  return { makeSeqCounter };
});

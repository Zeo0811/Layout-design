const test = require('node:test');
const assert = require('node:assert');
const { makeSeqCounter } = require('./formatter-green.js');

test('h2 顺序递增、h3 全局递增', () => {
  const c = makeSeqCounter();
  assert.strictEqual(c.next('h2'), 1);
  assert.strictEqual(c.next('h3'), 1);
  assert.strictEqual(c.next('h3'), 2);
  assert.strictEqual(c.next('h2'), 2);
  assert.strictEqual(c.next('h3'), 3);
});

test('其他类型不影响 h2 计数', () => {
  const c = makeSeqCounter();
  c.next('h2');
  assert.strictEqual(c.next('h2'), 2);
});

test('标题序号递增、首个quote走引言、第二个quote走引号、待办用勾图', () => {
  global.window = {
    GreenStyle: {
      renderHeadingImage: (t, lv, o) => `<img data-h="${lv}" data-seq="${(o && o.seq) || ''}">`,
      renderTextImage: (t) => `<img data-label="${t}">`,
      renderQuoteImage: (t) => `<img data-quote-img="${t}">`,
      renderIntroImage: (t) => `<img data-intro="${t}">`,
    },
    GREEN_DECOR: { quote: 'data:q', divider: 'data:d', todo_empty: 'data:e', todo_checked: 'data:c', arrow: 'data:arrow', intro_head: 'data:introhead' },
    S: { wrapper: '', p: '', blockquote_text: '', todo_item: '', intro_text: '' },
    pi: (x) => x || '', escHtml: (x) => x || '', escAttr: (x) => x || '',
  };
  delete require.cache[require.resolve('./formatter-green.js')];
  const { renderGreenArticle } = require('./formatter-green.js');
  const out = renderGreenArticle({ blocks: [
    { type: 'h2', content: '标题A' }, { type: 'h3', content: '子1' }, { type: 'h3', content: '子2' },
    { type: 'quote', content: '第一引用' }, { type: 'quote', content: '第二引用' },
    { type: 'todo', checked: true, content: '做完了' },
  ], links: [] });
  assert.match(out, /data-h="2"[^>]*data-seq="1"/);
  assert.match(out, /data-h="3"[^>]*data-seq="1"/);
  assert.match(out, /data-h="3"[^>]*data-seq="2"/);
  assert.match(out, /data:introhead/);       // 首个 quote → 引言块（头部整图）
  assert.match(out, /data:q/);               // 第二个 quote → 引号小图 + CSS 文字
  assert.match(out, /data:c/);               // 待办勾选
  delete global.window;
});

test('GreenStyle 缺失时标题退化为文字不崩', () => {
  global.window = { S: { wrapper:'', h2:'C' }, pi:x=>x||'', escHtml:x=>x||'', escAttr:x=>x||'', GREEN_DECOR:{} };
  delete require.cache[require.resolve('./formatter-green.js')];
  const { renderGreenArticle } = require('./formatter-green.js');
  const out = renderGreenArticle({ blocks:[{type:'h2',content:'标题X'}], links:[] });
  assert.match(out, /标题X/);
  assert.doesNotMatch(out, /<img/);
  delete global.window;
});

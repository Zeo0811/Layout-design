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

test('renderGreenArticle 标题走 GreenStyle、序号递增、引号用装饰图', () => {
  global.window = {
    GreenStyle: { renderHeadingImage: (t, lv, o) => `<img data-h="${lv}" data-seq="${(o && o.seq) || ''}">` },
    GREEN_DECOR: { quote: 'data:q', divider: 'data:d', todo_empty: 'data:e', todo_checked: 'data:c' },
    S: { wrapper: '', p: '', blockquote_text: '', todo_item: '' },
    pi: (x) => x || '', escHtml: (x) => x || '', escAttr: (x) => x || '',
  };
  delete require.cache[require.resolve('./formatter-green.js')];
  const { renderGreenArticle } = require('./formatter-green.js');
  const out = renderGreenArticle({ blocks: [
    { type: 'h2', content: '标题A' }, { type: 'h3', content: '子1' }, { type: 'h3', content: '子2' },
    { type: 'quote', content: '引用' }, { type: 'todo', checked: true, content: '做完了' },
  ], links: [] });
  assert.match(out, /data-h="2"[^>]*data-seq="1"/);
  assert.match(out, /data-h="3"[^>]*data-seq="1"/);
  assert.match(out, /data-h="3"[^>]*data-seq="2"/);
  assert.match(out, /data:q/);
  assert.match(out, /data:c/);
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

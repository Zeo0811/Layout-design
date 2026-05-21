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

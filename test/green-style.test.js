const test = require('node:test');
const assert = require('node:assert');
const { wrapHeadingLines } = require('../assets/js/green-style.js');

// 假测量：每个字符宽 10
const measure = (s) => s.length * 10;

test('短文本不换行', () => {
  assert.deepStrictEqual(wrapHeadingLines('你好世界', 100, measure), ['你好世界']);
});

test('超宽文本贪心断行', () => {
  // maxWidth=50 → 每行最多 5 个字符
  assert.deepStrictEqual(
    wrapHeadingLines('一二三四五六七八', 50, measure),
    ['一二三四五', '六七八']
  );
});

test('显式换行符强制断行', () => {
  assert.deepStrictEqual(
    wrapHeadingLines('上行\n下行', 1000, measure),
    ['上行', '下行']
  );
});

test('行数封顶为 8，末行加省略号', () => {
  const text = '字'.repeat(50); // maxWidth=10 → 每行 1 字 → 本应 50 行
  const lines = wrapHeadingLines(text, 10, measure);
  assert.strictEqual(lines.length, 8);
  assert.ok(lines[7].endsWith('…'));
});

test('空字符串返回空数组', () => {
  assert.deepStrictEqual(wrapHeadingLines('', 100, measure), []);
});

test('封顶时末行末字符为表情也不损坏（u 标志）', () => {
  // 9+ 行，每行 1 字，第 8 行内容为 😀，应被替换成 …（不残留半个代理对）
  const lines = wrapHeadingLines('一二三四五六七😀九十', 10, (s) => [...s].length * 10);
  assert.strictEqual(lines.length, 8);
  // 第 8 行应以 … 结尾，且不包含未配对的代理项
  assert.ok(lines[7].endsWith('…'));
  assert.strictEqual(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(lines[7]), false, '不应残留孤立高位代理');
});

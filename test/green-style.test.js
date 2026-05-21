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

const { HEADING_SPECS, GREEN_TOKENS } = require('../assets/js/green-style.js');

test('HEADING_SPECS 覆盖 1-6 级且为绿色', () => {
  for (let lv = 1; lv <= 6; lv++) {
    assert.ok(HEADING_SPECS[lv], `缺 level ${lv}`);
    assert.strictEqual(HEADING_SPECS[lv].color, '#327847');
    assert.ok(HEADING_SPECS[lv].fontSize > 0);
    assert.ok(HEADING_SPECS[lv].lineHeight >= HEADING_SPECS[lv].fontSize);
  }
  for (let lv = 1; lv < 6; lv++) {
    assert.ok(HEADING_SPECS[lv].fontSize >= HEADING_SPECS[lv + 1].fontSize);
  }
});

test('GREEN_TOKENS 为图片标题模式且关键键存在', () => {
  assert.strictEqual(GREEN_TOKENS.__headingMode, 'image');
  for (const k of ['wrapper', 'p', 'strong', 'blockquote_wrapper', 'blockquote_text',
                   'callout_wrapper', 'hr', 'ul', 'ol', 'li_ul', 'li_p',
                   'img', 'img_caption', 'footnote_num', 'embed_link']) {
    assert.ok(typeof GREEN_TOKENS[k] === 'string', `缺 token ${k}`);
  }
  assert.match(GREEN_TOKENS.strong, /#327847/);
  assert.match(GREEN_TOKENS.li_ul, /#327847/);
});

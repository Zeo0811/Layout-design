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

const { renderHeadingImage } = require('../assets/js/green-style.js');

function makeFakeCanvas() {
  const calls = { fillText: [], font: [], fillStyle: [], fillRect: [] };
  const ctx = {
    set font(v) { calls.font.push(v); }, get font() { return ''; },
    set fillStyle(v) { calls.fillStyle.push(v); },
    set textBaseline(v) {}, set textAlign(v) {},
    measureText(s) { return { width: s.length * 10 }; },
    fillText(s, x, y) { calls.fillText.push([s, x, y]); },
    fillRect(x, y, w, h) { calls.fillRect.push([x, y, w, h]); },
  };
  const canvas = {
    width: 0, height: 0,
    getContext() { return ctx; },
    toDataURL() { return 'data:image/png;base64,FAKE'; },
  };
  return { canvas, calls };
}

const drew = (calls, s) => calls.fillText.some((c) => c[0] === s);

test('renderHeadingImage 返回带假 dataURL 的 img', () => {
  const fake = makeFakeCanvas();
  const html = renderHeadingImage('一级标题', 1, { canvasFactory: () => fake.canvas });
  assert.match(html, /^<img\b/);
  assert.match(html, /data:image\/png;base64,FAKE/);
  assert.match(html, /max-width:100%/);
});

test('单行无装饰标题（H1）只画一行', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('短标题', 1, { canvasFactory: () => fake.canvas, contentWidth: 1000 });
  assert.strictEqual(fake.calls.fillText.length, 1);
});

test('H2 画出 PART 水印与下划线', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('二级标题', 2, { canvasFactory: () => fake.canvas, contentWidth: 1000 });
  assert.ok(drew(fake.calls, 'PART 01'), '应画出 PART 01 水印');
  assert.ok(drew(fake.calls, '二级标题'), '应画出标题');
  assert.strictEqual(fake.calls.fillRect.length, 1, '应画一条下划线');
});

test('H3 画出序号与横线', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('三级标题', 3, { canvasFactory: () => fake.canvas, contentWidth: 1000, seq: 1 });
  assert.ok(drew(fake.calls, '01'), '应画出序号 01');
  assert.ok(drew(fake.calls, '三级标题'));
  assert.strictEqual(fake.calls.fillRect.length, 1, '应画一条横线');
});

test('H4 画出左侧星号', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('四级标题', 4, { canvasFactory: () => fake.canvas, contentWidth: 1000 });
  assert.ok(drew(fake.calls, '*'), '应画出星号');
  assert.ok(drew(fake.calls, '四级标题'));
});

test('seq 参数决定 PART / 序号编号', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('x', 2, { canvasFactory: () => fake.canvas, contentWidth: 1000, seq: 3 });
  assert.ok(drew(fake.calls, 'PART 03'), 'seq=3 → PART 03');
});

const { renderTextImage } = require('../assets/js/green-style.js');

test('renderTextImage 画出指定文字、返回 inline-block img', () => {
  const fake = makeFakeCanvas();
  const html = renderTextImage('引言', { canvasFactory: () => fake.canvas, color: '#808080' });
  assert.match(html, /^<img\b/);
  assert.match(html, /display:inline-block/);
  assert.ok(drew(fake.calls, '引言'));
  assert.ok(fake.calls.fillStyle.includes('#808080'), '应使用指定颜色');
});

test('GREEN_TOKENS 含 __variant 与引言/引用新键', () => {
  assert.strictEqual(GREEN_TOKENS.__variant, 'green');
  for (const k of ['blockquote_mark', 'intro_wrapper', 'intro_head', 'intro_arrow', 'intro_text']) {
    assert.ok(typeof GREEN_TOKENS[k] === 'string', `缺 token ${k}`);
  }
  assert.match(GREEN_TOKENS.callout_wrapper, /#40A978/);
  assert.match(GREEN_TOKENS.blockquote_text, /font-weight:600/);
});

test('超宽标题按内容宽换行多次绘制', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('一二三四五六七八九十', 1, { canvasFactory: () => fake.canvas, contentWidth: 50 });
  assert.ok(fake.calls.fillText.length >= 2);
});

test('非法级别回退到 level 3 且不抛错', () => {
  const fake = makeFakeCanvas();
  const html = renderHeadingImage('x', 99, { canvasFactory: () => fake.canvas });
  assert.match(html, /^<img\b/);
});

test('有 scale 方法时按倍率缩放上下文', () => {
  const scaleCalls = [];
  const ctx = {
    set font(v) {}, get font() { return ''; },
    set fillStyle(v) {}, set textBaseline(v) {}, set textAlign(v) {},
    measureText(s) { return { width: s.length * 10 }; },
    fillText() {},
    scale(x, y) { scaleCalls.push([x, y]); },
  };
  const canvas = { width: 0, height: 0, getContext: () => ctx, toDataURL: () => 'data:image/png;base64,FAKE' };
  renderHeadingImage('标题', 1, { canvasFactory: () => canvas, scale: 2 });
  assert.deepStrictEqual(scaleCalls, [[2, 2]]);
});

// 列表排版：悬挂缩进、bullet 与文字间距、列表前后间距与段落一致
const test   = require('node:test');
const assert = require('node:assert');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const POPUP = path.join(__dirname, '..', 'chrome-extension', 'popup');

// formatter.js 是浏览器脚本，没有导出；在 vm 里跑，函数声明会挂到 context 上
const ctx = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(POPUP, 'formatter.js'), 'utf8'), ctx);
const { renderGreenList } = require(path.join(POPUP, 'formatter-green.js'));

const LONG = '这是一条很长的列表项，长到会在手机屏幕上自动折成两到三行';
const items = [{ content: '短的一项' }, { content: LONG }];
const pStyles = html => [...html.matchAll(/<p style="([^"]+)">/g)].map(m => m[1]);
const spanStyle = html => html.match(/<p [^>]*><span style="([^"]+)">/)[1];

// ── 默认模板 ──

test('默认 · 无序：悬挂缩进 1em，折行与首行文字对齐', () => {
  const h = ctx.renderList(items, false, 0);
  for (const s of pStyles(h)) {
    assert.ok(s.includes('padding-left: 1em') && s.includes('text-indent: -1em'), s);
  }
  const m = spanStyle(h);
  assert.ok(m.includes('width: 1em') && m.includes('text-indent: 0'), m);
  assert.ok(!m.includes('margin-right'), 'bullet 后不再额外加边距');
});

test('默认 · 有序：数字比圆点宽，用 1.3em', () => {
  const h = ctx.renderList(items, true, 0);
  assert.ok(pStyles(h)[0].includes('padding-left: 1.3em') && pStyles(h)[0].includes('text-indent: -1.3em'));
  assert.ok(spanStyle(h).includes('width: 1.3em'));
});

test('默认 · 嵌套每层多缩 1.5em', () => {
  const h = ctx.renderList(items, false, 1);
  assert.ok(pStyles(h)[0].includes('padding-left: 2.5em'));
});

test('默认 · 顶层列表收尾补到 30px（5 + 25），与段落间距一致', () => {
  const h = ctx.renderList(items, false, 0);
  assert.match(h, /^<section style="padding-bottom: 25px;">/);
  for (const s of pStyles(h)) assert.ok(s.includes('margin: 0 0 5px'), '只留下边距，列表开头不再多出 5px');
});

test('默认 · 嵌套列表不再套收尾 section', () => {
  assert.ok(!ctx.renderList(items, false, 1).startsWith('<section'));
});

// ── 十字路口绿 ──

test('绿 · 无序：行高与正文一致 1.6，悬挂缩进 1em', () => {
  const h = renderGreenList(items, false, 0, null, []);
  for (const s of pStyles(h)) {
    assert.ok(s.includes('line-height:1.6'), s);
    assert.ok(s.includes('padding-left:1em') && s.includes('text-indent:-1em'), s);
  }
  assert.ok(spanStyle(h).includes('width:1em') && spanStyle(h).includes('text-indent:0'));
});

test('绿 · 无序：收尾补到 30px（6 + 24）', () => {
  assert.match(renderGreenList(items, false, 0, null, []), /^<section style="padding-bottom:24px;">/);
  assert.ok(!renderGreenList(items, false, 1, null, []).startsWith('<section'));
});

test('绿 · 有序：行高也改成 1.6', () => {
  const h = renderGreenList(items, true, 0, null, []);
  assert.ok(!h.includes('line-height:1.27'));
  assert.ok(h.includes('line-height:1.6'));
});

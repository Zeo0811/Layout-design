// 链接里的加粗不能丢：Notion 里「先加链接再加粗」时 DOM 是 <a><span 加粗>…</span></a>，
// 解析器原来直接取 a.textContent，加粗被吃掉，成品里变成黑色细体。
const test   = require('node:test');
const assert = require('node:assert');
const fs     = require('node:fs');
const path   = require('node:path');
const vm     = require('node:vm');

const CONTENT = path.join(__dirname, '..', 'chrome-extension', 'content');

// 解析器只用到这几样 DOM 接口，搭个最小假 DOM，免得为测试引入 jsdom
const Node = { ELEMENT_NODE: 1, TEXT_NODE: 3 };
const text = s => ({ nodeType: 3, textContent: s, childNodes: [] });
const el = (tag, attrs, ...children) => ({
  nodeType: 1, tagName: tag.toUpperCase(), childNodes: children,
  getAttribute: k => (k in attrs ? attrs[k] : null),
  classList: { contains: c => (attrs.class || '').split(/\s+/).includes(c) },
  get textContent() { return children.map(c => c.textContent).join(''); },
});
const bold = (...c) => el('span', { style: 'font-weight:600' }, ...c);
const a    = (href, ...c) => el('a', { href }, ...c);
const root = (...c) => el('div', {}, ...c);

function load(file, fn) {
  const ctx = vm.createContext({ Node, console });
  vm.runInContext(fs.readFileSync(path.join(CONTENT, file), 'utf8'), ctx);
  return ctx[fn];
}

for (const [file, fn] of [['notion-parser.js', 'convertNodeToHtml'], ['feishu-parser.js', 'convertFeishuNodeToHtml']]) {
  const convert = load(file, fn);

  test(`${file}: 链接在外、加粗在里 → 保留加粗`, () => {
    const links = [];
    const h = convert(root(text('用了 '), a('https://b.example', bold(text('Claude Code'))), text(' 写代码')), links);
    assert.strictEqual(h, '用了 <strong>Claude Code</strong><sup>[1]</sup> 写代码');
    // links 里的对象建在 vm 沙箱里，原型不同，按 JSON 比
    assert.strictEqual(JSON.stringify(links), JSON.stringify([{ text: 'Claude Code', url: 'https://b.example' }]), '参考资料里仍是纯文本');
  });

  test(`${file}: 链接里只有部分加粗 → 只加粗那部分`, () => {
    const h = convert(root(a('https://c.example', text('官方文档的'), bold(text('安装章节')))), []);
    assert.strictEqual(h, '官方文档的<strong>安装章节</strong><sup>[1]</sup>');
  });

  test(`${file}: 加粗在外、链接在里 → 行为不变`, () => {
    const h = convert(root(bold(a('https://a.example', text('Claude Code')))), []);
    assert.strictEqual(h, '<strong>Claude Code<sup>[1]</sup></strong>');
  });

  test(`${file}: 普通链接 → 行为不变`, () => {
    assert.strictEqual(convert(root(a('https://d.example', text('官方文档'))), []), '官方文档<sup>[1]</sup>');
  });

  test(`${file}: 链接文字仍做转义`, () => {
    assert.strictEqual(convert(root(a('https://e.example', text('<x>'))), []), '&lt;x&gt;<sup>[1]</sup>');
  });
}

// 角标不能带下划线：Notion 里给带链接的文字加下划线时，解析结果是 <u>文字<sup>[1]</sup></u>，
// 下划线会一路画到角标上。inline-block 能截断父级 text-decoration 的传递。
test('formatter: 角标是 inline-block 且无下划线，挡住外层 <u>', () => {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'chrome-extension', 'popup', 'formatter.js'), 'utf8'), ctx);
  const h = ctx.pi('<u>Claude Code<sup>[1]</sup></u>');
  const sup = h.match(/<sup style="([^"]+)">\[1\]<\/sup>/)[1];
  assert.ok(sup.includes('display:inline-block'), sup);
  assert.ok(sup.includes('text-decoration:none'), sup);
  assert.ok(h.startsWith('<u>'), '文字本身的下划线保留');
});

// 公众号文章链接：不再渲染成「📄 公众号文章」卡片，就是句子里一个不带样式的 <a>，
// 粘进微信编辑器后由微信套上它自带的文章链接样式（小图标 + 蓝字）。
test('formatter: 公众号链接渲染成句内裸 <a>，不再是卡片', () => {
  const ctx = vm.createContext({ console });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'chrome-extension', 'popup', 'formatter.js'), 'utf8'), ctx);
  const url = 'https://mp.weixin.qq.com/s/abc?x=1&y=2';
  const ph = `__WX_CARD__${encodeURIComponent(url)}__WX_SEP__${encodeURIComponent('十字路口 × Table for Six')}__WX_END__`;
  const h = ctx.pi(`在${ph}联名活动`);
  assert.strictEqual(h, '在<a href="https://mp.weixin.qq.com/s/abc?x=1&y=2">十字路口 × Table for Six</a>联名活动');
});

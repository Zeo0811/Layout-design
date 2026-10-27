const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const code = fs.readFileSync(path.join(__dirname, '../chrome-extension/content/notion-parser.js'), 'utf8');
const formatter = fs.readFileSync(path.join(__dirname, '../chrome-extension/popup/formatter.js'), 'utf8');
const text = (id, value, type = 'text') => `<div data-block-id="${id}" data-block-type="${type}"><div data-content-editable-leaf>${value}</div></div>`;
function page(html) {
  const dom = new JSDOM(`<title>Article | Notion</title><div class="notion-page-content">${html}</div>`, { url: 'https://app.notion.com/p/team/article', runScripts: 'outside-only' });
  dom.window.eval(code + '\n' + formatter);
  dom.window.eval(fs.readFileSync(path.join(__dirname, '../chrome-extension/popup/formatter-green.js'), 'utf8'));
  return dom;
}
test('mixed direct and wrapped blocks preserve order and group adjacent list items', () => {
  const dom = page(text('a', 'First') + `<div><div>${text('b', 'One', 'bulleted_list')}${text('c', 'Two', 'bulleted_list')}</div></div>` + text('d', 'Last'));
  const r = dom.window.parseNotion();
  assert.deepEqual(Array.from(r.blocks, b => b.type), ['paragraph', 'bulleted_list', 'paragraph']);
  assert.equal(r.blocks[1].items.length, 2);
  assert.equal(r.blocks[2].content, 'Last');
  dom.window.close();
});
for (const caption of [
  '<div placeholder="Write a caption…">Image &amp; caption</div>',
  '<div id="caption" data-content-editable-leaf placeholder="添加图片说明">Image &amp; caption</div>',
  '<figcaption>Image &amp; caption</figcaption>',
]) {
  test(`caption survives extraction and rendering: ${caption}`, () => {
    const dom = page(`<div data-block-type="image"><figure aria-labelledby="caption"><img src="/image/test"></figure>${caption}</div>`);
    const image = dom.window.parseNotion().blocks[0];
    assert.equal(image.caption, 'Image & caption');
    assert.match(dom.window.renderImage(image), /<p[^>]*>Image &amp; caption<\/p>/);
    assert.match(dom.window.GreenFmt.renderGreenBlock(image, [], 0), /<p[^>]*>Image &amp; caption<\/p>/);
    dom.window.close();
  });
}
test('uncaptioned images do not invent captions', () => {
  const dom = page('<div data-block-type="image"><img src="/image/test"><div placeholder="Write a caption…"></div></div>');
  assert.equal(dom.window.parseNotion().blocks[0].caption, '');
  dom.window.close();
});
test('virtualized pages accumulate replaced blocks, deduplicate, and restore scroll position', async () => {
  const dom = page('<div data-virtual-item-slot></div>');
  const w = dom.window, area = w.document.querySelector('.notion-page-content');
  const scroller = area.parentElement;
  scroller.style.overflowY = 'auto';
  Object.defineProperty(scroller, 'clientHeight', { value: 500 });
  Object.defineProperty(scroller, 'scrollHeight', { value: 1500 });
  let scroll = 350;
  Object.defineProperty(scroller, 'scrollTop', {
    get: () => scroll,
    set: value => { scroll = value; const index = value < 350 ? 0 : value < 700 ? 1 : 2;
      area.innerHTML = `<div data-virtual-item-slot>${text(String(index), `Paragraph ${index}`)}</div>`;
    }
  });
  w.setTimeout = callback => { callback(); return 0; };
  const result = await w.collectNotionPage();
  assert.deepEqual(Array.from(result.blocks, b => b.content), ['Paragraph 0', 'Paragraph 1', 'Paragraph 2']);
  assert.equal(scroll, 350);
  w.close();
});
test('extension automatically injects on app.notion.com', () => {
  const manifest = require('../chrome-extension/manifest.json');
  assert.ok(manifest.content_scripts[0].matches.includes('https://*.notion.com/*'));
});

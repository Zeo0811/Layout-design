# 扩展集成「十字路口绿」Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Chrome 扩展 popup 里选「十字路口绿」后，真实 Notion/飞书 文档一键转出绿样式公众号 HTML（含大丰收标题图、装饰 base64 PNG），且老的「十字路口专用」样式逐字节不变。

**Architecture:** 所有绿渲染逻辑独立到新文件 `chrome-extension/popup/formatter-green.js`（`renderGreenArticle`）；`formatter.js` 仅在 `formatToWechat` 顶部加 1 行 green 分发，老代码原样不动。green-style.js 复用到扩展（标题图 canvas 渲染 + 装饰 PNG）。大丰收字体打包进扩展，popup 预加载。装饰件（引号/箭头/待办框/分割线）打包为 PNG，运行期 fetch→dataURL 缓存，转换时内联 base64（微信安全）。

**Tech Stack:** 原生 JS（扩展 MV3 popup）、Canvas 2D、`node:test`（纯逻辑）、headless Chrome（生成装饰 PNG）。

**Spec:** `docs/specs/2026-05-21-extension-green-integration.md`

**硬约束（贯穿全程）：** 老「十字路口专用」(#407600) 输出必须不变——所有 green 逻辑用 `S.__variant==='green'` 门控，集中在 formatter-green.js；formatter.js 仅加 1 行 if-green 早分发。

---

## File Structure

- `chrome-extension/popup/green-style.js`（**新建**，从根 `assets/js/green-style.js` 复制）— GREEN_TOKENS / HEADING_SPECS / renderHeadingImage 等，浏览器全局 `window.GreenStyle`。
- `chrome-extension/popup/formatter-green.js`（**新建**）— `window.renderGreenArticle(parsedData)` + 绿色各 block 渲染 + 序号计数 + 装饰缓存。**所有 green 逻辑只在这里。**
- `chrome-extension/popup/formatter.js`（**改 1 行**）— `formatToWechat` 顶部加 green 分发。
- `chrome-extension/popup/popup.html`（**改**）— 加 @font-face、按序引入 green-style.js / formatter-green.js。
- `chrome-extension/popup/popup.js`（**改**）— 模板下拉加「十字路口绿」内置项；`applyTemplate` 处理 green；初始化预加载字体 + 装饰。
- `chrome-extension/assets/fonts/`（**新建**）— `可画大丰收SC.ttf` + HarmonyOS 4 字重。
- `chrome-extension/assets/img/`（**新建**）— `divider1.png`、`quote.png`、`arrow.png`、`todo_empty.png`、`todo_checked.png`。
- `chrome-extension/popup/green-style.test.js`（**新建**）— node:test：序号计数 + green 分发选择。
- `test/extension-green.test.js`（根，可选合并）— 同上。

---

## Task 0: 分支

- [ ] **Step 1: 开分支**

Run:
```bash
cd /Users/zeoooo/Layout-design
git checkout -b feat/extension-green
git branch --show-current
```
Expected: `feat/extension-green`（基于 main，含第一轮成果）

> 不要 push（origin 有泄露 token）。

---

## Task 1: 打包字体 + 生成装饰 PNG + 复制 green-style.js

**Files:** Create `chrome-extension/assets/fonts/*`, `chrome-extension/assets/img/*`, `chrome-extension/popup/green-style.js`

- [ ] **Step 1: 复制字体到扩展**

Run:
```bash
cd /Users/zeoooo/Layout-design
mkdir -p chrome-extension/assets/fonts chrome-extension/assets/img
cp assets/fonts/可画大丰收SC.ttf chrome-extension/assets/fonts/
cp assets/fonts/HarmonyOS_Sans_SC_{Light,Regular,Medium,Bold}.ttf chrome-extension/assets/fonts/
cp assets/img/divider1.png chrome-extension/assets/img/
ls -la chrome-extension/assets/fonts chrome-extension/assets/img
```
Expected: 5 字体 + divider1.png。

- [ ] **Step 2: 生成引号/箭头/待办框 PNG（headless Chrome 渲染根 assets 的 SVG/构造）**

新建临时文件 `/tmp/gen_decor.html`（用根服务器的 quote.svg + 内联 arrow/todo SVG，渲染成可截图的元素），然后用 Chrome headless 分别截图。具体：

新建 `/tmp/gen_decor.html`:
```html
<!doctype html><body style="margin:0;background:transparent">
<div id="quote"></div>
<script>
const A={
 arrow:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="114" viewBox="0 0 139 133"><g fill="#327847"><path d="M131.25 125L131.25 132.5L138.75 132.5L138.75 125L131.25 125ZM131.25 0L123.75 0L123.75 125L131.25 125L138.75 125L138.75 0L131.25 0ZM131.25 125L131.25 117.5L0 117.5L0 125L0 132.5L131.25 132.5L131.25 125Z"/><path transform="translate(12,9)" d="M0 0L-5.23871 5.36711L113.511 121.276L118.75 115.909L123.989 110.542L5.23871 -5.36711L0 0Z"/></g></svg>',
 todo_empty:'<svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74"><rect x="2.5" y="2.5" width="69" height="69" fill="#fff" stroke="#327847" stroke-width="5"/></svg>',
 todo_checked:'<svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74"><rect x="2.5" y="2.5" width="69" height="69" fill="#fff" stroke="#327847" stroke-width="5"/><polyline points="15,39 30,55 59,21" fill="none" stroke="#40A978" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};
location.hash.slice(1) && (document.body.innerHTML=A[location.hash.slice(1)]);
</script></body>
```
渲染（引号用根项目已存的 `assets/img/quote.svg`，需服务器；这里直接对 quote.svg 转换）：
```bash
cd /Users/zeoooo/Layout-design
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# 引号：用 rsvg 或 Chrome 渲染 quote.svg
for k in arrow todo_empty todo_checked; do
  "$CHROME" --headless=new --disable-gpu --default-background-color=00000000 \
    --screenshot=/tmp/decor_$k.png --window-size=200,200 --hide-scrollbars \
    "file:///tmp/gen_decor.html#$k" 2>/dev/null
done
# 引号单独从 quote.svg 渲染（带透明背景）
"$CHROME" --headless=new --disable-gpu --default-background-color=00000000 \
  --screenshot=/tmp/decor_quote.png --window-size=120,100 --hide-scrollbars \
  "file://$PWD/assets/img/quote.svg" 2>/dev/null
ls -la /tmp/decor_*.png
```
然后裁掉透明边并入库（用 sips 裁切或直接用，Chrome 截图会含 window 尺寸的透明区，需裁剪到内容）。**实现者注意**：Chrome 全窗口截图含多余透明边，需用 `sips` 或 Python PIL 裁到 SVG 内容尺寸（arrow→120×114, todo→74×74, quote→98×80 比例）。裁剪脚本：
```bash
python3 - <<'PY'
from PIL import Image
import glob,os
for f in glob.glob('/tmp/decor_*.png'):
    im=Image.open(f).convert('RGBA'); bbox=im.getbbox()
    if bbox: im.crop(bbox).save(f.replace('/tmp/decor_','/Users/zeoooo/Layout-design/chrome-extension/assets/img/'))
    print(os.path.basename(f), im.crop(bbox).size if bbox else 'empty')
PY
ls chrome-extension/assets/img/
```
Expected: `chrome-extension/assets/img/{arrow,todo_empty,todo_checked,quote}.png` 生成（透明底，裁到内容）。
> 若无 PIL：`pip3 install Pillow` 或改用 `sips --cropToHeightWidth`。验证每张图是内容紧贴的透明 PNG。

- [ ] **Step 3: 复制 green-style.js 到扩展**

Run:
```bash
cp assets/js/green-style.js chrome-extension/popup/green-style.js
node -e "require('./chrome-extension/popup/green-style.js'); console.log('module OK')"
```
Expected: `module OK`

- [ ] **Step 4: 提交**

```bash
git add chrome-extension/assets chrome-extension/popup/green-style.js
git commit -m "chore: 扩展打包大丰收字体、装饰 PNG、green-style.js"
```
（提交信息后追加空行 + `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`）

---

## Task 2: 序号计数器 + green 分发判定（TDD，纯逻辑）

**职责：** 遍历 blocks 时为 h2/h3 生成递增编号；判定是否走 green。放进 formatter-green.js 的纯函数，node 可测。

**Files:** Create `chrome-extension/popup/formatter-green.js`, `chrome-extension/popup/green-style.test.js`

- [ ] **Step 1: 写失败测试** `chrome-extension/popup/green-style.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert');
const { makeSeqCounter } = require('./formatter-green.js');

test('h2 顺序递增、h3 在每个 h2 下/全局递增', () => {
  const c = makeSeqCounter();
  assert.strictEqual(c.next('h2'), 1);
  assert.strictEqual(c.next('h3'), 1);
  assert.strictEqual(c.next('h3'), 2);
  assert.strictEqual(c.next('h2'), 2);
  assert.strictEqual(c.next('h3'), 3); // 全局递增（简单计数）
});

test('其他类型不影响计数', () => {
  const c = makeSeqCounter();
  c.next('h2');
  assert.strictEqual(c.next('h2'), 2);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test chrome-extension/popup/green-style.test.js`
Expected: FAIL（Cannot find module / makeSeqCounter undefined）

- [ ] **Step 3: 最小实现** —— 新建 `chrome-extension/popup/formatter-green.js`，UMD 骨架 + 计数器：
```js
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test chrome-extension/popup/green-style.test.js`
Expected: PASS（2）

- [ ] **Step 5: 提交**

```bash
git add chrome-extension/popup/formatter-green.js chrome-extension/popup/green-style.test.js
git commit -m "feat: 扩展绿渲染序号计数器 makeSeqCounter + 测试"
```
（追加 Co-Authored-By 尾注）

---

## Task 3: formatter-green.js 绿色整篇渲染 `renderGreenArticle`

**职责：** 镜像 `formatToWechat` 的遍历，但产出绿样式 + 微信安全标记。复用 `S`（已被叠加 GREEN_TOKENS）、`window.GreenStyle`（标题图）、`window.GREEN_DECOR`（装饰 base64，Task 4 注入）、`pi/escHtml/escAttr`（formatter.js 全局）。

**Files:** Modify `chrome-extension/popup/formatter-green.js`

- [ ] **Step 1: 在 formatter-green.js 工厂内、`return` 前实现整篇渲染**

```js
  // 依赖（popup 全局）：S, pi, escHtml, escAttr, window.GreenStyle, window.GREEN_DECOR
  function _img(dataUrl, style, alt) {
    return `<img src="${dataUrl}" style="${style}" alt="${alt || ''}" />`;
  }

  function renderGreenBlock(block, links, depth, seq) {
    if (!block) return '';
    const G = (typeof window !== 'undefined' && window.GreenStyle) || {};
    const D = (typeof window !== 'undefined' && window.GREEN_DECOR) || {};
    const SS = (typeof window !== 'undefined' && window.S) || (typeof S !== 'undefined' ? S : {});
    const P = (typeof window !== 'undefined' && window.pi) ? window.pi : (typeof pi !== 'undefined' ? pi : (x)=>x);
    const EH = (typeof window !== 'undefined' && window.escHtml) ? window.escHtml : (typeof escHtml !== 'undefined' ? escHtml : (x)=>x);
    const EA = (typeof window !== 'undefined' && window.escAttr) ? window.escAttr : (typeof escAttr !== 'undefined' ? escAttr : (x)=>x);

    switch (block.type) {
      case 'h1': return G.renderHeadingImage(block.content || '', 1);
      case 'h2': return G.renderHeadingImage(block.content || '', 2, { seq: seq.next('h2') });
      case 'h3': return G.renderHeadingImage(block.content || '', 3, { seq: seq.next('h3') });
      case 'h4': return G.renderHeadingImage(block.content || '', 4);
      case 'h5': return G.renderHeadingImage(block.content || '', 5);
      case 'h6': return G.renderHeadingImage(block.content || '', 6);

      case 'paragraph': {
        const t = (block.content || '').replace(/​/g, '').trim();
        if (!t) return '<br>';
        return `<p style="${SS.p}">${P(block.content)}</p>`;
      }

      case 'quote':
        // 微信安全：引号 PNG 作块级 img，文字段紧随（不用 position:absolute）
        return `<section style="margin:22px 0;">`
          + _img(D.quote, 'width:27px;height:auto;display:block;margin-bottom:4px;', '引用')
          + `<p style="${SS.blockquote_text}">${P(block.content)}</p></section>`;

      case 'callout':
        return `<section style="${SS.callout_wrapper}">${P(block.content)}</section>`;

      case 'divider':
        return `<section style="margin:18px 0;text-align:center;line-height:0;">`
          + _img(D.divider, 'width:100%;display:block;', '分割线') + `</section>`;

      case 'bulleted_list':
        return renderGreenList(block.items, false, depth, seq);
      case 'numbered_list':
        return renderGreenList(block.items, true, depth, seq);

      case 'todo': {
        const box = block.checked ? D.todo_checked : D.todo_empty;
        return `<p style="${SS.todo_item}">`
          + _img(box, 'width:16px;height:16px;display:inline-block;vertical-align:-2px;margin-right:8px;', '')
          + P(block.content) + `</p>`;
      }

      case 'image': {
        const src = block.base64 || block.url; if (!src) return '';
        const cap = block.caption ? `<p style="${SS.img_caption}">${EH(block.caption)}</p>` : '';
        return `<section style="${SS.img_wrapper}"><img src="${EA(src)}" style="${SS.img}" alt="${EA(block.caption || '图片')}" />${cap}</section>`;
      }

      case 'embed':
        return `<section style="${SS.embed_wrapper}"><p style="${SS.embed_label}">📎 ${EH(block.title || '嵌入内容')}</p>${block.url ? `<p style="${SS.embed_link}">${EH(block.url)}</p>` : ''}</section>`;

      case 'toggle':
        return `<section style="${SS.toggle_summary}">▶ ${P(block.content || '')}</section>`
          + (block.children ? `<section style="${SS.toggle_content}">${block.children.map(b=>renderGreenBlock(b,links,depth+1,seq)).join('')}</section>` : '');

      case 'code':
      case 'video':
      case 'table':
      case 'bookmark':
      case 'column_list':
        // 复用老 formatter 的渲染（这些组件无绿专属设计；保持功能）
        return (typeof window !== 'undefined' && window.renderBlock) ? window.renderBlock(block, links, depth) : '';

      default: return '';
    }
  }

  // 微信安全列表：p + span 标记（无序绿点 / 有序 01 大号绿序号）
  function renderGreenList(items, isOrdered, depth, seq) {
    if (!items || !items.length) return '';
    const SS = (typeof window !== 'undefined' && window.S) || (typeof S !== 'undefined' ? S : {});
    const P = (typeof window !== 'undefined' && window.pi) ? window.pi : (x)=>x;
    const indent = depth > 0 ? `padding-left:${depth * 1.5}em;` : '';
    let html = '';
    items.forEach((item, i) => {
      let nested = '';
      if (item.children && item.children.length) for (const c of item.children) nested += renderGreenBlock(c, [], depth + 1, seq);
      if (isOrdered) {
        const num = String(i + 1).padStart(2, '0');
        html += `<section style="display:flex;align-items:baseline;margin:0 0 28px 0;${indent}">`
          + `<span style="flex:none;font-family:'PingFang SC',sans-serif;font-size:18px;font-weight:600;color:#327847;margin-right:12px;">${num}</span>`
          + `<p style="flex:1;font-size:15px;line-height:1.27;letter-spacing:0.1em;color:#327847;margin:0;">${P(item.content)}</p></section>${nested}`;
      } else {
        html += `<p style="font-size:15px;line-height:1.27;letter-spacing:0.1em;color:#327847;margin:0 0 6px 0;${indent}">`
          + `<span style="color:#327847;margin-right:0.5em;">•</span>${P(item.content)}</p>${nested}`;
      }
    });
    return html;
  }

  function renderGreenArticle(parsedData) {
    if (!parsedData || !parsedData.blocks) return '<p style="color:red">解析数据为空</p>';
    const { blocks, links = [] } = parsedData;
    const SS = (typeof window !== 'undefined' && window.S) || (typeof S !== 'undefined' ? S : {});
    const seq = makeSeqCounter();
    let start = 0;
    while (start < blocks.length) {
      const b = blocks[start];
      if (b.type === 'paragraph' && !(b.content || '').replace(/​/g, '').trim()) { start++; continue; }
      break;
    }
    let html = '';
    for (let i = start; i < blocks.length; i++) html += renderGreenBlock(blocks[i], links, 0, seq);
    if (links.length && typeof window !== 'undefined' && window.renderFootnotes) html += window.renderFootnotes(links);
    return `<section style="${SS.wrapper}">${html}</section>`;
  }
```
并把工厂 `return` 改为：
`return { makeSeqCounter, renderGreenArticle, renderGreenBlock, renderGreenList };`

- [ ] **Step 2: node 烟测（不依赖浏览器全局，注入桩）**

在 `green-style.test.js` 追加：
```js
test('renderGreenArticle 标题走 GreenStyle、缺依赖也不崩', () => {
  global.window = {
    GreenStyle: { renderHeadingImage: (t, lv, o) => `<img data-h="${lv}" data-seq="${o&&o.seq||''}">` },
    GREEN_DECOR: { quote: 'data:q', divider: 'data:d', todo_empty:'data:e', todo_checked:'data:c' },
    S: { wrapper:'', p:'', blockquote_text:'' },
    pi: x=>x, escHtml:x=>x, escAttr:x=>x,
  };
  const { renderGreenArticle } = require('./formatter-green.js');
  const out = renderGreenArticle({ blocks:[
    {type:'h2',content:'标题A'},{type:'h3',content:'子1'},{type:'h3',content:'子2'},
    {type:'paragraph',content:'正文'},{type:'quote',content:'引用'},
  ], links:[] });
  assert.match(out, /data-h="2"[^>]*data-seq="1"/);
  assert.match(out, /data-seq="1"/); // h3 第一个
  assert.match(out, /data-seq="2"/); // h3 第二个
  assert.match(out, /data:q/);       // 引号图
  delete global.window;
});
```

- [ ] **Step 3: 跑测试**

Run: `node --test chrome-extension/popup/green-style.test.js`
Expected: PASS（3）

- [ ] **Step 4: 提交**

```bash
git add chrome-extension/popup/formatter-green.js chrome-extension/popup/green-style.test.js
git commit -m "feat: 扩展绿色整篇渲染 renderGreenArticle（微信安全标记 + 标题图 + 装饰）"
```
（追加 Co-Authored-By 尾注）

---

## Task 4: formatter.js 分发 + popup 接入（字体/装饰预加载、模板项）

**Files:** Modify `chrome-extension/popup/formatter.js`、`popup.html`、`popup.js`

- [ ] **Step 1: formatter.js 顶部加 green 分发（仅 1 行 if，老逻辑不动）**

在 `formatToWechat` 函数体最前面（`if (!parsedData...)` 之前）插入：
```js
  if (typeof S !== 'undefined' && S.__variant === 'green' &&
      typeof window !== 'undefined' && window.renderGreenArticle) {
    return window.renderGreenArticle(parsedData);
  }
```
（其余 formatToWechat / renderBlock 全部保持原样。）

- [ ] **Step 2: popup.html 加 @font-face + 引入脚本**

在 `popup.html` `<head>` 内（`<link rel="stylesheet">` 附近）加：
```html
<style>
@font-face{font-family:'可画大丰收SC';src:url('../assets/fonts/可画大丰收SC.ttf') format('truetype');font-display:swap;}
@font-face{font-family:'HarmonyOS Sans SC';font-weight:400;src:url('../assets/fonts/HarmonyOS_Sans_SC_Regular.ttf') format('truetype');}
@font-face{font-family:'HarmonyOS Sans SC';font-weight:700;src:url('../assets/fonts/HarmonyOS_Sans_SC_Bold.ttf') format('truetype');}
</style>
```
并在 `<script src="formatter.js">` **之前**加 `<script src="green-style.js"></script>`，在 `formatter.js` **之后**加 `<script src="formatter-green.js"></script>`：
```html
  <script src="highlight.min.js"></script>
  <script src="green-style.js"></script>
  <script src="formatter.js"></script>
  <script src="formatter-green.js"></script>
  <script src="formatter-feishu.js"></script>
  <script src="popup.js"></script>
```

- [ ] **Step 3: popup.js 加「十字路口绿」内置项 + applyTemplate 处理 + 预加载**

在 `renderTemplateSelector`（约第 90 行）的 innerHTML 默认项后加 green 项：
```js
    templateSelect.innerHTML =
      '<option value="">十字路口专用</option>' +
      '<option value="__green__">十字路口绿</option>' +
      loadedTemplates.map(t =>
        `<option value="${t.name}"${t.name === activeName ? ' selected' : ''}>${t.name}</option>`
      ).join('');
```
修改 `applyTemplate`（约第 99 行）：
```js
  function applyTemplate(name) {
    Object.assign(S, DEFAULT_S);
    // 清掉上次 green 标记
    delete S.__variant; delete S.__headingMode;
    if (name === '__green__') {
      if (window.GreenStyle) Object.assign(S, window.GreenStyle.GREEN_TOKENS);
    } else if (name) {
      const tpl = loadedTemplates.find(t => t.name === name);
      if (tpl && tpl.s) Object.assign(S, tpl.s);
    }
    chrome.runtime.sendMessage({ action: 'setActiveTemplate', name });
  }
```
在 popup 初始化处（`const DEFAULT_S = ...` 之后）加字体 + 装饰预加载：
```js
  // 预加载大丰收字体 + 生成装饰 base64（供绿样式标题图/装饰用）
  window.GREEN_DECOR = window.GREEN_DECOR || {};
  (async function preloadGreen() {
    try {
      if (document.fonts && document.fonts.load) {
        await Promise.all([
          document.fonts.load('40px "可画大丰收SC"'),
          document.fonts.load('400 15px "HarmonyOS Sans SC"'),
        ]);
        await document.fonts.ready;
      }
      const names = ['quote', 'divider', 'todo_empty', 'todo_checked'];
      await Promise.all(names.map(async (n) => {
        const res = await fetch(chrome.runtime.getURL(`assets/img/${n}.png`));
        const blob = await res.blob();
        window.GREEN_DECOR[n] = await new Promise((ok) => {
          const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob);
        });
      }));
    } catch (e) { console.warn('green 预加载失败', e); }
  })();
```
> `chrome.runtime.getURL('assets/img/..')` 需 `web_accessible_resources` 含 `assets/*`（见 Step 4）。

- [ ] **Step 4: manifest 暴露 assets**

在 `chrome-extension/manifest.json` 加（若无 `web_accessible_resources`）：
```json
  "web_accessible_resources": [
    { "resources": ["assets/*"], "matches": ["<all_urls>"] }
  ]
```
（若已有则把 `assets/*` 并入 resources 数组。）

- [ ] **Step 5: 冒烟 — node 校验 formatter-green 仍可加载、根测试全过**

Run:
```bash
cd /Users/zeoooo/Layout-design
node --test chrome-extension/popup/green-style.test.js 2>&1 | grep -E "^# (tests|pass|fail)"
node --test 2>&1 | grep -E "^# (tests|pass|fail)"
```
Expected: 均 0 fail。

- [ ] **Step 6: 提交**

```bash
git add chrome-extension/popup/formatter.js chrome-extension/popup/popup.html chrome-extension/popup/popup.js chrome-extension/manifest.json
git commit -m "feat: popup 接入十字路口绿（分发/字体装饰预加载/模板项/manifest）"
```
（追加 Co-Authored-By 尾注）

---

## Task 5: 扩展手测 + 回归（用户在 Chrome / 微信）

**Files:** 无（验证）

- [ ] **Step 1: 重新加载扩展**

用户：`chrome://extensions` → 找到「十字路口排版专用」→ 点**重新加载**（或重新「加载已解压」选 `chrome-extension/` 目录）。

- [ ] **Step 2: 真实文章转换（绿）**

打开一篇真实飞书/Notion 文档 → 打开扩展 side panel → 模板下拉选「十字路口绿」→ 一键转换。
预期：预览里标题为大丰收绿色图、引言/引用/列表/待办/分割线为绿样式。

- [ ] **Step 3: 复制粘贴进微信公众号编辑器核对**

完整复制 → 粘进 mp.weixin.qq.com 编辑器。重点核对：标题图显示、引号图、分割线图、列表/待办、间距。**以真公众号渲染为准；不一致处记录，下一轮微调。**

- [ ] **Step 4: 回归 — 老样式不变**

模板下拉切回「十字路口专用」→ 同一篇文章转换 → 确认输出与改动前**完全一致**（橄榄绿 #407600、标题为文字非图）。可与 git stash 前对比或凭经验核对。

- [ ] **Step 5: 重打 zip（CI 会自动，但本地可验证）**

> `.github/workflows/repack-extension.yml` 会在 push 后自动重打 `chrome-extension.zip`；本地不 push，可手动 `zip -r chrome-extension.zip chrome-extension/` 验证打包无误（可选）。

---

## Self-Review 记录

- **Spec 覆盖：** §0 老样式不变 → Task 4S1 仅 1 行分发 + formatter-green 隔离；§3 微信约束 → 装饰 base64（Task1 PNG + Task4 预加载）、列表 p+span、引用无绝对定位（Task3）；§4.1 green-style 复用 → Task1S3；§4.2 popup 接入 → Task4S2/3；§4.3 装饰 PNG → Task1S2 + Task4S3 fetch→dataURL；§4.4 renderBlock 绿分支 + 序号 → Task2/3；§4.5 字体打包 → Task1S1 + Task4S2；§7 测试 → Task2/3 单测 + Task5 手测/回归。
- **占位符扫描：** 无 TBD；装饰 PNG 生成给了可执行脚本（含裁剪）；各 block 渲染给了完整代码。Task1S2 的裁剪依赖 PIL/sips，已注明备选。
- **命名一致：** `renderGreenArticle`/`renderGreenBlock`/`renderGreenList`/`makeSeqCounter`/`window.GREEN_DECOR`/`S.__variant`/`window.GreenStyle` 全程一致。
- **风险（spec §8）：** 微信兼容需真机多轮（Task5S3 记录后下一轮调）；base64 标题图体积大；引用/装饰布局可能要按真机结果改 —— 已知并接受。
- **已知小项：** code/table/video/bookmark 在绿样式下复用老 `window.renderBlock`（无绿专属设计，spec §9 排除），配色可能偏老风格，后续如需再做。

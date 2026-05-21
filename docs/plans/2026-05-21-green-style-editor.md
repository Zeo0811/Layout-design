# 公众号「十字路口绿」新样式（编辑器预览）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `index.html` 模板编辑器里新增一个内置模板「十字路口绿」，标题 H1–H6 用「可画大丰收」字体经 canvas 渲染成 PNG 图片预览，其余组件用绿色（`#327847`）CSS token 体系，所有效果在编辑器预览中可见。

**Architecture:** 新逻辑独立成 `assets/js/green-style.js`（浏览器全局 `window.GreenStyle` + `module.exports`，便于 node 测试），导出 `GREEN_TOKENS`（绿色 token 集，带 `__headingMode:'image'` 标记）、`HEADING_SPECS`（各级标题渲染参数）、纯函数 `wrapHeadingLines`、渲染函数 `renderHeadingImage`。`index.html` 通过 `<script src>` 引入该模块；模板选择器加一个内置项 `green`；`tplLoad()` 识别它并把 `customS` 切到绿色 token；`BLOCK_DEFS` 的 h1–h6 渲染函数在 `cs.__headingMode==='image'` 时改调 `renderHeadingImage`。字体文件放 `assets/fonts/`，用 `@font-face` + `document.fonts.ready` 预加载。

**Tech Stack:** 原生 HTML/CSS/JS（无构建）、Canvas 2D、`node:test`（Node 22 内置，纯逻辑单测）、Express 静态服务（既有 `server.js`）。

**Spec:** `docs/specs/2026-05-21-wechat-green-style-design.md`

---

## File Structure

- `assets/js/green-style.js`（**新建**）— 绿色样式的全部新逻辑：token 集、标题参数、换行算法、标题图渲染器。单一职责：「绿色模板及其标题如何渲染」。浏览器与 node 双用。
- `test/green-style.test.js`（**新建**）— `node:test` 单测，覆盖 `wrapHeadingLines` 与 `renderHeadingImage`（注入假 canvas）。
- `assets/fonts/`（**新建目录**）— `可画大丰收SC.ttf`、`HarmonyOS_Sans_SC_{Light,Regular,Medium,Bold}.ttf`。
- `index.html`（**修改**）— 引入模块、加 `@font-face`、选择器加内置项、`tplLoad`/`_updateEditState`/`syncSelector`/h1–h6 渲染函数接入。
- `package.json`（**修改**）— 加 `"test": "node --test"` 脚本。

---

## Task 0: 工作区清理与分支（提交前置）

**为什么：** 当前工作区有 25 个文件的纯 fileMode 噪音（`100644→100755`）和未提交的「公众号卡片」3 文件改动，直接提交会把噪音和无关改动混进来。先消噪、开分支，让本计划的提交干净。

**Files:**
- Modify: 本地 git 配置（`core.fileMode`）

- [ ] **Step 1: 关闭 fileMode 噪音**

Run:
```bash
cd /Users/zeoooo/Layout-design
git config core.fileMode false
git status -s
```
Expected: 输出里不再有那 25 个纯权限改动；只剩真实内容改动——`chrome-extension/content/notion-parser.js`、`feishu-parser.js`、`popup/formatter.js`（公众号卡片功能），以及未跟踪的 `docs/`。

- [ ] **Step 2: 从 main 开特性分支**

Run:
```bash
git checkout -b feat/green-style-editor
git branch --show-current
```
Expected: `feat/green-style-editor`

- [ ] **Step 3: 先把已有的「公众号卡片」改动单独提交（保留有效进展，与本功能隔离）**

Run:
```bash
git add chrome-extension/content/notion-parser.js chrome-extension/content/feishu-parser.js chrome-extension/popup/formatter.js
git commit -m "feat: 公众号链接渲染为跳转卡片"
```
Expected: 1 个 commit，仅含这 3 个文件。

> 注：**不要 push**。`origin` remote URL 内嵌了泄露的 GitHub PAT，且按既有约定 origin/main 可能过时。推送策略与 token 吊销由用户单独处理。

- [ ] **Step 4: 提交已写好的 spec 与本计划**

Run:
```bash
git add docs/specs/2026-05-21-wechat-green-style-design.md docs/plans/2026-05-21-green-style-editor.md
git commit -m "docs: 十字路口绿样式 spec 与实现计划"
```
Expected: 1 个 commit，含两个 md 文件。

---

## Task 1: 拷入字体文件 + 测试脚手架

**Files:**
- Create: `assets/fonts/可画大丰收SC.ttf`、`assets/fonts/HarmonyOS_Sans_SC_{Light,Regular,Medium,Bold}.ttf`
- Modify: `package.json`
- Modify: `.gitignore`（确认不忽略字体）

- [ ] **Step 1: 拷贝字体到项目**

Run:
```bash
cd /Users/zeoooo/Layout-design
mkdir -p assets/fonts
cp "/Users/zeoooo/Downloads/可画大丰收SC.ttf" assets/fonts/
TMP=$(mktemp -d)
unzip -o -q "/Users/zeoooo/Downloads/HarmonyOS_Sans_SC.zip" -d "$TMP"
for w in Light Regular Medium Bold; do
  cp "$TMP/HarmonyOS_Sans_SC_${w}.ttf" assets/fonts/
done
ls -la assets/fonts/
```
Expected: `assets/fonts/` 下有 5 个 ttf（大丰收 1 个 + Harmony 4 个）。

- [ ] **Step 2: 确认 .gitignore 不排除 ttf / assets**

Run:
```bash
git check-ignore assets/fonts/可画大丰收SC.ttf; echo "exit=$?"
```
Expected: `exit=1`（即未被忽略）。若被忽略，编辑 `.gitignore` 移除相关规则。

- [ ] **Step 3: 加 test 脚本**

在 `package.json` 的 `scripts` 中加入 `test`：
```json
{
  "name": "layout-design-preview",
  "version": "1.0.0",
  "engines": { "node": ">=18" },
  "scripts": {
    "start": "node server.js",
    "test": "node --test"
  },
  "dependencies": { "express": "^4.18.2" }
}
```

- [ ] **Step 4: 验证 test runner 可跑（空跑）**

Run:
```bash
node --test 2>&1 | tail -3
```
Expected: 形如 `tests 0 / pass 0`（暂无测试文件，不报错即可）。

- [ ] **Step 5: 提交**

```bash
git add assets/fonts package.json .gitignore
git commit -m "chore: 加入大丰收/HarmonyOS 字体与 node --test 脚本"
```

---

## Task 2: `wrapHeadingLines` 换行算法（TDD）

**职责：** 把一段标题文字按最大宽度贪心断行（中文按字符断），支持显式 `\n`，并对行数封顶防止图片过高。宽度测量通过注入的 `measureFn` 完成，使其不依赖 canvas、可在 node 下测试。

**Files:**
- Create: `assets/js/green-style.js`
- Test: `test/green-style.test.js`

- [ ] **Step 1: 写失败测试**

`test/green-style.test.js`:
```js
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
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test/green-style.test.js`
Expected: FAIL（`Cannot find module` 或 `wrapHeadingLines is not a function`）。

- [ ] **Step 3: 最小实现**

新建 `assets/js/green-style.js`，先放换行算法与 UMD 导出骨架：
```js
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.GreenStyle = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MAX_LINES = 8;

  // 贪心断行：中文按单字符累加，超过 maxWidth 即换行；支持 \n；行数封顶
  function wrapHeadingLines(text, maxWidth, measureFn) {
    const out = [];
    const paragraphs = String(text).split('\n');
    for (const para of paragraphs) {
      if (para === '') { out.push(''); continue; }
      let line = '';
      for (const ch of para) {
        const trial = line + ch;
        if (line && measureFn(trial) > maxWidth) {
          out.push(line);
          line = ch;
        } else {
          line = trial;
        }
      }
      if (line) out.push(line);
    }
    if (out.length > MAX_LINES) {
      const kept = out.slice(0, MAX_LINES);
      kept[MAX_LINES - 1] = kept[MAX_LINES - 1].replace(/.$/, '') + '…';
      return kept;
    }
    return out;
  }

  return { wrapHeadingLines, MAX_LINES };
});
```

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test/green-style.test.js`
Expected: PASS（4 个测试全过）。

- [ ] **Step 5: 提交**

```bash
git add assets/js/green-style.js test/green-style.test.js
git commit -m "feat: 标题换行算法 wrapHeadingLines + 单测"
```

---

## Task 3: `HEADING_SPECS` 与 `GREEN_TOKENS`（TDD 校验数据形状）

**职责：** 集中定义各级标题的渲染参数，以及绿色模板的完整 token 集（含 `__headingMode` 标记）。

**Files:**
- Modify: `assets/js/green-style.js`
- Test: `test/green-style.test.js`

- [ ] **Step 1: 追加失败测试**

在 `test/green-style.test.js` 末尾追加：
```js
const { HEADING_SPECS, GREEN_TOKENS } = require('../assets/js/green-style.js');

test('HEADING_SPECS 覆盖 1-6 级且为绿色', () => {
  for (let lv = 1; lv <= 6; lv++) {
    assert.ok(HEADING_SPECS[lv], `缺 level ${lv}`);
    assert.strictEqual(HEADING_SPECS[lv].color, '#327847');
    assert.ok(HEADING_SPECS[lv].fontSize > 0);
    assert.ok(HEADING_SPECS[lv].lineHeight >= HEADING_SPECS[lv].fontSize);
  }
  // 字号单调不增：H1 >= H2 >= ... >= H6
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
  // 正文绿色加粗
  assert.match(GREEN_TOKENS.strong, /#327847/);
  // 列表标记走 li 颜色为绿、正文 li_p 为黑
  assert.match(GREEN_TOKENS.li_ul, /#327847/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test/green-style.test.js`
Expected: FAIL（`HEADING_SPECS` / `GREEN_TOKENS` 为 undefined）。

- [ ] **Step 3: 实现 — 在 `green-style.js` 工厂内、`return` 之前插入**

```js
  const HEADING_FONT = "'可画大丰收SC'";
  const BODY_FONT = "'HarmonyOS Sans SC','PingFang SC',-apple-system,BlinkMacSystemFont,sans-serif";
  const GREEN = '#327847';
  const GREEN_DIM = '#53715C';
  const GRAY = '#808080';

  // 各级标题 canvas 渲染参数（逻辑 px；渲染时再乘 RENDER_SCALE）
  const HEADING_SPECS = {
    1: { fontSize: 40, lineHeight: 56, color: GREEN, marginTop: 36, marginBottom: 20 },
    2: { fontSize: 32, lineHeight: 46, color: GREEN, marginTop: 32, marginBottom: 16 },
    3: { fontSize: 25, lineHeight: 38, color: GREEN, marginTop: 28, marginBottom: 14 },
    4: { fontSize: 19, lineHeight: 30, color: GREEN, marginTop: 22, marginBottom: 10 },
    5: { fontSize: 16, lineHeight: 26, color: GREEN, marginTop: 18, marginBottom: 8  },
    6: { fontSize: 15, lineHeight: 24, color: GREEN, marginTop: 16, marginBottom: 8  },
  };

  const CONTENT_WIDTH = 560; // 逻辑内容宽度（px）
  const RENDER_SCALE = 3;    // retina 渲染倍率

  // 绿色模板完整 token 集（h1-h6 为图片模式下的 CSS 兜底值）
  const GREEN_TOKENS = {
    __headingMode: 'image',
    wrapper:            `font-family:${BODY_FONT};font-size:15px;color:#000000;line-height:1.6;letter-spacing:0.1em;word-wrap:break-word;`,
    h1: `display:block;font-family:${HEADING_FONT};font-size:40px;font-weight:normal;color:${GREEN};text-align:left;margin:36px 0 20px 0;line-height:1.4;`,
    h2: `display:block;font-family:${HEADING_FONT};font-size:32px;font-weight:normal;color:${GREEN};text-align:left;margin:32px 0 16px 0;line-height:1.4;`,
    h3: `display:block;font-family:${HEADING_FONT};font-size:25px;font-weight:normal;color:${GREEN};text-align:left;margin:28px 0 14px 0;line-height:1.5;`,
    h4: `display:block;font-family:${HEADING_FONT};font-size:19px;font-weight:normal;color:${GREEN};text-align:left;margin:22px 0 10px 0;line-height:1.5;`,
    h5: `display:block;font-family:${HEADING_FONT};font-size:16px;font-weight:normal;color:${GREEN};text-align:left;margin:18px 0 8px 0;line-height:1.5;`,
    h6: `display:block;font-family:${HEADING_FONT};font-size:15px;font-weight:normal;color:${GREEN};text-align:left;margin:16px 0 8px 0;line-height:1.5;`,
    p:                  `text-align:justify;line-height:1.6;font-family:${BODY_FONT};margin:0;padding-bottom:1em;letter-spacing:0.1em;white-space:pre-line;color:#000000;font-size:15px;`,
    strong:             `word-break:break-all;font-weight:600;color:${GREEN};`,
    em:                 `font-style:italic;`,
    code_inline:        `background:rgba(50,120,71,.10);border-radius:4px;font-size:85%;padding:0.2em 0.4em;color:${GREEN};font-family:Consolas,Monaco,monospace;`,
    s:                  `text-decoration:line-through;color:#888888;`,
    blockquote_wrapper: `text-align:left;display:block;overflow:auto;padding:10px 14px;margin:20px 0;border-left:3px solid ${GREEN};background-color:#f4f7f4;font-family:${BODY_FONT};line-height:1.6;`,
    blockquote_text:    `text-align:left;line-height:1.6;font-family:${BODY_FONT};margin:0;letter-spacing:0.1em;color:${GREEN};font-size:15px;`,
    callout_wrapper:    `font-size:15px;white-space:normal;margin:20px 0;color:#000000;font-family:${BODY_FONT};line-height:1.6;letter-spacing:0.1em;background-color:#f4f9f5;border:1px solid ${GREEN};border-radius:8px;padding:16px 20px;`,
    callout_content:    ``,
    code_wrapper:       `margin:20px 10px;display:block;font-size:15px;padding:10px;color:#333;position:relative;background-color:#fafafa;border:1px solid #f0f0f0;border-radius:5px;white-space:pre;box-shadow:rgba(0,0,0,.3) 0px 2px 10px;overflow:auto;font-family:Consolas,Monaco,monospace;`,
    code_lang_bar:      `font-size:11px;color:${GREEN};font-family:Consolas,Monaco,monospace;padding-bottom:6px;letter-spacing:0.5px;text-transform:uppercase;border-bottom:1px solid #f0f0f0;margin-bottom:8px;`,
    code_pre:           `margin:0;padding:0;overflow-x:auto;background:transparent;`,
    code_text:          `font-family:Consolas,Monaco,monospace;font-size:14px;line-height:1.65;white-space:pre;word-break:normal;display:block;color:#333;`,
    hr:                 `border-style:solid;border-width:1px 0 0;border-color:${GREEN_DIM};margin:24px 0;`,
    ul:                 `padding-left:1.5em;font-size:15px;line-height:1.5;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 8px;`,
    ol:                 `padding-left:1.5em;font-size:15px;line-height:1.5;font-family:${BODY_FONT};white-space:normal;color:#000000;margin:0 0 8px;`,
    li_ul:              `font-size:15px;line-height:1.5;font-family:${BODY_FONT};list-style-position:outside;list-style-type:disc;color:${GREEN};`,
    li_ol:              `font-size:15px;line-height:1.5;font-family:${BODY_FONT};list-style-position:outside;list-style-type:decimal;color:${GREEN};`,
    li_p:               `font-family:inherit;vertical-align:baseline;margin:8px 0;color:#000000;`,
    img_wrapper:        `margin:15px 0;text-align:center;`,
    img:                `max-width:100%;height:auto;border-radius:8px;display:inline-block;`,
    img_caption:        `font-size:12px;color:${GRAY};margin-top:6px;text-align:center;`,
    video_wrapper:      `margin:1em 0;background:#111;border-radius:8px;padding:28px 20px;text-align:center;`,
    video_label:        `color:rgba(255,255,255,.45);font-size:14px;`,
    toggle_summary:     `font-size:15px;font-weight:bold;color:#000000;margin:12px 0 5px;padding-left:15px;border-left:3px solid ${GREEN};font-family:${BODY_FONT};`,
    toggle_content:     `padding-left:15px;border-left:2px solid rgba(50,120,71,.20);margin-left:4px;`,
    table_wrapper:      `overflow-x:auto;margin:1em 0;`,
    table:              `border-collapse:collapse;width:100%;font-size:15px;line-height:1.6;font-family:${BODY_FONT};`,
    th:                 `background:rgba(50,120,71,.08);padding:7px 13px;border:1px solid rgba(50,120,71,.25);font-weight:bold;text-align:left;color:${GREEN};`,
    td:                 `padding:7px 13px;border:1px solid rgba(50,120,71,.20);color:#000000;`,
    td_even:            `padding:7px 13px;border:1px solid rgba(50,120,71,.20);color:#000000;background:rgba(50,120,71,.03);`,
    embed_wrapper:      `margin:1em 0;border:1px solid rgba(50,120,71,.25);border-radius:8px;padding:11px 15px;`,
    embed_label:        `font-size:12px;color:${GRAY};margin-bottom:4px;`,
    embed_link:         `font-size:13px;text-decoration:none;color:${GREEN};word-break:break-all;`,
    footnotes_wrapper:  `margin-top:30px;padding-top:15px;border-top:1px solid rgba(50,120,71,.25);`,
    footnotes_title:    `font-size:12px;font-weight:bold;color:${GRAY};margin-bottom:.6em;text-transform:uppercase;letter-spacing:1px;`,
    footnote_item:      `font-size:11px;color:#555555;line-height:1.7;margin:.3em 0;word-break:break-all;`,
    footnote_num:       `color:${GREEN};font-weight:bold;margin-right:4px;`,
    todo_check:         `word-break:break-all;font-weight:600;color:${GREEN};`,
    callout_default_icon: '',
    video_label_text:     '📹 视频内容请前往原文查看',
    embed_icon_char:      '📎',
    todo_done_icon:       '✅',
    todo_pending_icon:    '☐',
    toggle_arrow_char:    '▶',
    bookmark_icon_char:   '🔗',
    code_dot1:            '#ed6c60',
    code_dot2:            '#f7c151',
    code_dot3:            '#64c856',
  };
```
并把 `return { wrapHeadingLines, MAX_LINES };` 改为
`return { wrapHeadingLines, MAX_LINES, HEADING_SPECS, GREEN_TOKENS, CONTENT_WIDTH, RENDER_SCALE, HEADING_FONT };`

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test/green-style.test.js`
Expected: PASS（含新增 2 个）。

- [ ] **Step 5: 提交**

```bash
git add assets/js/green-style.js test/green-style.test.js
git commit -m "feat: 绿色模板 token 集 GREEN_TOKENS 与标题参数 HEADING_SPECS"
```

---

## Task 4: `renderHeadingImage` 标题图渲染器（TDD，注入假 canvas）

**职责：** 给定标题文字与级别，用 canvas 画出大丰收字体的绿色 PNG，返回 `<img>` HTML 串。通过 `opts.canvasFactory` 注入 canvas，使其在 node 下可测；浏览器默认用 `document.createElement('canvas')`。

**Files:**
- Modify: `assets/js/green-style.js`
- Test: `test/green-style.test.js`

- [ ] **Step 1: 追加失败测试**

在 `test/green-style.test.js` 末尾追加：
```js
const { renderHeadingImage } = require('../assets/js/green-style.js');

function makeFakeCanvas() {
  const calls = { fillText: [], font: [], fillStyle: [] };
  const ctx = {
    set font(v) { calls.font.push(v); }, get font() { return ''; },
    set fillStyle(v) { calls.fillStyle.push(v); },
    set textBaseline(v) {}, set textAlign(v) {},
    measureText(s) { return { width: s.length * 10 }; },
    fillText(s, x, y) { calls.fillText.push([s, x, y]); },
  };
  const canvas = {
    width: 0, height: 0,
    getContext() { return ctx; },
    toDataURL() { return 'data:image/png;base64,FAKE'; },
  };
  return { canvas, calls };
}

test('renderHeadingImage 返回带假 dataURL 的 img', () => {
  const fake = makeFakeCanvas();
  const html = renderHeadingImage('一级标题', 1, { canvasFactory: () => fake.canvas });
  assert.match(html, /^<img\b/);
  assert.match(html, /data:image\/png;base64,FAKE/);
  assert.match(html, /max-width:100%/);
});

test('单行标题只画一行', () => {
  const fake = makeFakeCanvas();
  renderHeadingImage('短标题', 2, { canvasFactory: () => fake.canvas, contentWidth: 1000 });
  assert.strictEqual(fake.calls.fillText.length, 1);
});

test('超宽标题按内容宽换行多次绘制', () => {
  const fake = makeFakeCanvas();
  // contentWidth=50, fontSize 决定 measure（假 canvas 每字符 10px）→ 每行 5 字
  renderHeadingImage('一二三四五六七八九十', 1, { canvasFactory: () => fake.canvas, contentWidth: 50 });
  assert.ok(fake.calls.fillText.length >= 2);
});

test('非法级别回退到 level 3 且不抛错', () => {
  const fake = makeFakeCanvas();
  const html = renderHeadingImage('x', 99, { canvasFactory: () => fake.canvas });
  assert.match(html, /^<img\b/);
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `node --test test/green-style.test.js`
Expected: FAIL（`renderHeadingImage is not a function`）。

- [ ] **Step 3: 实现 — 在工厂内 `return` 之前加入**

```js
  function _defaultCanvasFactory() {
    if (typeof document !== 'undefined' && document.createElement)
      return document.createElement('canvas');
    throw new Error('no canvas available');
  }

  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 渲染单个标题为 <img>（PNG, retina）
  function renderHeadingImage(text, level, opts) {
    opts = opts || {};
    const spec = HEADING_SPECS[level] || HEADING_SPECS[3];
    const scale = opts.scale || RENDER_SCALE;
    const contentWidth = opts.contentWidth || CONTENT_WIDTH;
    const fontFamily = opts.fontFamily || HEADING_FONT;
    const factory = opts.canvasFactory || _defaultCanvasFactory;

    const canvas = factory();
    const ctx = canvas.getContext('2d');
    const fontStr = `${spec.fontSize}px ${fontFamily}`;
    ctx.font = fontStr;

    const lines = wrapHeadingLines(text, contentWidth, (s) => {
      ctx.font = fontStr;
      return ctx.measureText(s).width;
    });

    // 逻辑尺寸：宽取最长行（封顶 contentWidth），高 = 行数 * 行高
    let logicalW = 0;
    for (const ln of lines) logicalW = Math.max(logicalW, ctx.measureText(ln).width);
    logicalW = Math.min(Math.ceil(logicalW) + 2, contentWidth);
    const logicalH = lines.length * spec.lineHeight;

    canvas.width = Math.max(1, Math.round(logicalW * scale));
    canvas.height = Math.max(1, Math.round(logicalH * scale));

    const c = canvas.getContext('2d');
    c.scale(scale, scale);
    c.font = fontStr;
    c.fillStyle = spec.color;
    c.textBaseline = 'top';
    c.textAlign = 'left';
    lines.forEach((ln, i) => {
      const y = i * spec.lineHeight + (spec.lineHeight - spec.fontSize) / 2;
      c.fillText(ln, 0, y);
    });

    const dataUrl = canvas.toDataURL('image/png');
    const style = [
      'display:block',
      `width:${logicalW}px`,
      'max-width:100%',
      'height:auto',
      `margin:${spec.marginTop}px 0 ${spec.marginBottom}px`,
    ].join(';');
    return `<img src="${dataUrl}" style="${style};" alt="${escapeAttr(text)}" />`;
  }
```
并把导出补成：
`return { wrapHeadingLines, MAX_LINES, HEADING_SPECS, GREEN_TOKENS, CONTENT_WIDTH, RENDER_SCALE, HEADING_FONT, renderHeadingImage };`

> 注：`canvas.getContext('2d')` 被调用两次（测量一次、绘制一次），假 canvas 每次都返回同一 ctx，真实浏览器中对同一 canvas 多次 getContext 也返回同一上下文——但因为中途改了 `canvas.width`（会重置上下文状态），第二次取用后重新设了 `font/fillStyle/scale`，行为正确。

- [ ] **Step 4: 跑测试确认通过**

Run: `node --test test/green-style.test.js`
Expected: PASS（全部，含新增 4 个）。

- [ ] **Step 5: 提交**

```bash
git add assets/js/green-style.js test/green-style.test.js
git commit -m "feat: 标题图渲染器 renderHeadingImage + 单测"
```

---

## Task 5: 接入 `index.html`（字体、模块、选择器、tplLoad、h1-h6 渲染）

**Files:**
- Modify: `index.html`

- [ ] **Step 1: 引入字体与模块脚本**

在 `index.html` 的 `<style>` 区块内（任意 `@font-face` 合适位置，例如靠近文件头部样式开始处）加入：
```css
@font-face {
  font-family: '可画大丰收SC';
  src: url('assets/fonts/可画大丰收SC.ttf') format('truetype');
  font-display: swap;
}
@font-face { font-family: 'HarmonyOS Sans SC'; font-weight: 300; src: url('assets/fonts/HarmonyOS_Sans_SC_Light.ttf') format('truetype'); }
@font-face { font-family: 'HarmonyOS Sans SC'; font-weight: 400; src: url('assets/fonts/HarmonyOS_Sans_SC_Regular.ttf') format('truetype'); }
@font-face { font-family: 'HarmonyOS Sans SC'; font-weight: 500; src: url('assets/fonts/HarmonyOS_Sans_SC_Medium.ttf') format('truetype'); }
@font-face { font-family: 'HarmonyOS Sans SC'; font-weight: 700; src: url('assets/fonts/HarmonyOS_Sans_SC_Bold.ttf') format('truetype'); }
```
在主 `<script>`（第 972 行 `<script>` 开始的那个 IIFE）**之前**加入：
```html
<script src="assets/js/green-style.js"></script>
```

- [ ] **Step 2: 选择器加入内置「绿」项**

修改 `syncSelector()`（约第 1648 行），在默认 option 之后插入 green 内置项：
```js
  function syncSelector() {
    const sel = document.getElementById('tpl-selector');
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '<option value="">— 十字路口专用 —</option>' +
      '<option value="green">— 十字路口绿（新）—</option>' +
      savedTemplates.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('');
    sel.value = prev;
  }
```

- [ ] **Step 3: `tplLoad()` 识别 green，`_updateEditState()` 把 green 当内置（隐藏保存/删除）**

修改 `tplLoad()`（约第 1738 行）：
```js
  window.tplLoad = function() {
    const sel = document.getElementById('tpl-selector');
    const v = sel.value;
    if (v === 'green') {
      customS = Object.assign({}, S, window.GreenStyle.GREEN_TOKENS);
    } else {
      const idx = parseInt(v);
      if (isNaN(idx)||idx<0) {
        customS = Object.assign({}, S);
      } else {
        const tpl = savedTemplates[idx];
        if (!tpl) return;
        customS = Object.assign({}, S, tpl.s);
      }
    }
    _updateEditState();
    if (selectedId) { loadPropState(selectedId); }
    renderPreview();
    renderEditor();
  };
```
修改 `_updateEditState()`（约第 1731 行）：
```js
  function _updateEditState() {
    const v = document.getElementById('tpl-selector').value;
    const isBuiltin = !v || v === 'green';
    document.getElementById('tplSaveBtn').style.display   = isBuiltin ? 'none' : '';
    document.getElementById('tplDeleteBtn').style.display = isBuiltin ? 'none' : '';
    document.getElementById('tplNewBtn').style.display    = '';
  }
```

- [ ] **Step 4: h1-h6 渲染函数接入标题图**

修改 `BLOCK_DEFS`（约第 1495–1506 行）的 h1–h6 六项 render，使其在图片模式下调渲染器：
```js
    { id: 'h1', label: 'H1 · 一级标题', keys: ['h1'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是一级标题 H1', 1)
        : `<section style="${cs.h1}">这是一级标题 H1</section>` },
    { id: 'h2', label: 'H2 · 二级标题', keys: ['h2'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是二级标题 H2', 2)
        : `<section style="${cs.h2}">这是二级标题 H2</section>` },
    { id: 'h3', label: 'H3 · 三级标题', keys: ['h3'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是三级标题 H3', 3)
        : `<section style="${cs.h3}">这是三级标题 H3</section>` },
    { id: 'h4', label: 'H4 · 四级标题', keys: ['h4'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是四级标题 H4', 4)
        : `<section style="${cs.h4}">这是四级标题 H4</section>` },
    { id: 'h5', label: 'H5 · 五级标题', keys: ['h5'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是五级标题 H5', 5)
        : `<section style="${cs.h5}">这是五级标题 H5</section>` },
    { id: 'h6', label: 'H6 · 六级标题', keys: ['h6'],
      render: cs => cs.__headingMode === 'image'
        ? window.GreenStyle.renderHeadingImage('这是六级标题 H6', 6)
        : `<section style="${cs.h6}">这是六级标题 H6</section>` },
```

- [ ] **Step 5: 初始化时预加载字体，避免首次渲染拿不到大丰收字体**

修改 `_initTemplateEditorOnce`（约第 1834 行），在 `syncSelector()` 之前加入字体预热：
```js
      try {
        if (document.fonts && document.fonts.load) {
          await Promise.all([
            document.fonts.load('40px "可画大丰收SC"'),
            document.fonts.load('400 15px "HarmonyOS Sans SC"'),
          ]);
          await document.fonts.ready;
        }
      } catch (_) {}
```
（放在 `const res = await fetch('/api/templates')` 之后、`syncSelector()` 之前。）

- [ ] **Step 6: 启动服务做一次冒烟检查（HTTP 可达 + 资源存在）**

Run:
```bash
cd /Users/zeoooo/Layout-design
(node server.js &) ; sleep 1
curl -s -o /dev/null -w "index=%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "js=%{http_code}\n" http://localhost:3000/assets/js/green-style.js
curl -s -o /dev/null -w "font=%{http_code}\n" "http://localhost:3000/assets/fonts/%E5%8F%AF%E7%94%BB%E5%A4%A7%E4%B8%B0%E6%94%B6SC.ttf"
pkill -f "node server.js"
```
Expected: 三个都是 `200`。
> 用户可能自己在跑 dev server——若 3000 端口已占用，跳过启动、直接 curl 即可，并由用户自行管理服务进程。

- [ ] **Step 7: 提交**

```bash
git add index.html
git commit -m "feat: 编辑器接入十字路口绿模板与标题图预览"
```

---

## Task 6: 浏览器可视化验证

**Files:** 无（验证任务）

- [ ] **Step 1: 打开编辑器，切到「十字路口绿」**

由用户在浏览器打开 `http://localhost:3000/`（或既有 dev server），进入「模板」标签，模板下拉选择「— 十字路口绿（新）—」。

- [ ] **Step 2: 逐块核对（对照 spec 第 3、5 节与 Figma）**

- H1–H6：依次点选左侧 H1–H6，预览应为**大丰收字体的绿色图片**（非系统字体文字），字号自 H1 到 H6 递减。
- 正文 paragraph：HarmonyOS Sans SC 观感、两端对齐、黑色。
- 行内：加粗为绿色 `#327847`。
- 引用块：左侧绿色竖条 + 绿字。
- 列表：圆点/序号为绿色，正文为黑色，1.5 行距。
- 图片说明：居中、灰 `#808080`。
- callout：绿描边圆角 + 浅绿底。
- 折叠 / 代码 / 分隔线 / 脚注 / 嵌入 / 表格 / 参考资料：配色为绿系。

- [ ] **Step 3: 回归检查**

下拉切回「— 十字路口专用 —」，确认默认（橄榄绿 `#407600`）模板不受影响，H1–H6 仍为文字而非图片。

- [ ] **Step 4: 运行全部单测**

Run: `node --test`
Expected: 全绿。

---

## Self-Review 记录

- **Spec 覆盖：** §2 颜色/字体 → GREEN_TOKENS（T3）；§3.3 字号换算 → HEADING_SPECS（T3）；§4.1 字体落位 → T1 + T5S1；§4.2 标题图渲染器 → T2（换行）+ T4（渲染）；§4.3 新模板定义 → T3 + T5S2/3；§4.4 预览改造 → T5S4/5；§5 组件映射 → GREEN_TOKENS（T3）+ 验证（T6S2）；§6 错误处理 → T2 行数封顶、T4 非法级别回退、T5S5 字体预热 try/catch；§7 测试策略 → T2/T3/T4 单测 + T6 可视化。均有对应任务。
- **占位符扫描：** 无 TBD/TODO；每个改动步骤含完整代码或精确命令。
- **类型/命名一致：** `wrapHeadingLines`、`renderHeadingImage`、`GREEN_TOKENS`、`HEADING_SPECS`、`__headingMode`、`window.GreenStyle` 在各任务间命名一致。
- **已知小项（spec §9）：** H3 字号为推断（25px），实现/验证时若能定位 Figma H3 样例再校准；大丰收 ttf 14MB 仅本轮预览本地加载可接受。

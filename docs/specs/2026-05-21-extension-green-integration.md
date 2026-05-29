# 设计文档：Chrome 扩展集成「十字路口绿」样式（真实文章转换）

- 日期：2026-05-21
- 范围：`chrome-extension/`（popup + formatter + 字体/素材打包）
- 前置：第一轮已完成 `index.html` 编辑器内「十字路口绿」全组件还原（标题图、引言/引用/callout/列表/待办/嵌入/折叠/分割线/脚注，行距字距按 Figma 对齐）。本轮把这套样式落到扩展，使真实 Notion/飞书 文档可一键转出绿样式公众号 HTML 并粘进公众号。

## 0. 不可破坏要求（硬约束）

**老的「十字路口专用」(#407600) 默认排版风格必须完全保留，一行都不改。** 绿样式为纯增量：所有新逻辑用 `S.__variant==='green'` 门控；默认模板与服务器同步模板的转换输出必须**逐字节不变**（除非 green 分支）。formatter.js 现有 `renderBlock` 各 case 的非绿分支保持原样，只在前面加 `if (green) {...}` 早返回。

## 1. 目标

用户在扩展 popup 模板下拉里选「十字路口绿」，对真实文档一键转换后，预览与复制出的公众号 HTML 即为绿样式，**包含大丰收字体的标题图**，且粘贴进微信公众号编辑器后保真显示。

## 2. 现状（扩展链路）

- `popup/popup.js`：`S`（可变全局，源自 `formatter.js`）+ `DEFAULT_S`；`applyTemplate(name)` = `Object.assign(S, DEFAULT_S, tpl.s)`；`templateSelect` 下拉（默认「十字路口专用」+ 服务器同步模板）；`rerender()` 重渲染；`formatToWechat(parsedData)` 出 HTML。
- `popup/formatter.js`：`formatToWechat` → 遍历 `parsedData.blocks` → `renderBlock(block)`（`switch(block.type)`：h1-h6/paragraph/quote/callout/code/divider/bulleted_list/numbered_list/image/video/toggle/bookmark/todo/table/embed/column_list）→ `applyS(key, content)` 套 `S` 的 CSS 字符串。
- 已有 base64 图片处理能力（manifest 描述「图片 Base64」）。

## 3. 关键约束：微信公众号兼容性

微信编辑器粘贴时会**剥离**：内联 `<svg>`、`position:absolute`、`@font-face`/自定义字体、`display:flex`（不稳定）、外链相对 URL。因此：

- **标题（大丰收）→ base64 PNG `<img>`**（canvas 渲染，唯一可行，已在第一轮验证）。
- **装饰件（引言箭头、引用引号、待办勾选框、分割线）→ base64 PNG `<img>`**，不能用 SVG/绝对定位。
- **布局改为微信安全写法**：引用引号不用 `position:absolute`，改为「引号 img 块 + 文字段」纵向堆叠，或引号 img 作为段首 inline 元素；callout/引言左竖条用 `border-left`（微信支持）。
- 字体：大丰收 ttf **打包进扩展**（`chrome-extension/assets/fonts/`），popup 内 `@font-face` + `FontFace` 预加载，canvas 渲染前 `await document.fonts.ready`。

## 4. 架构与组件划分

### 4.1 复用 green-style.js（修改：打包进扩展）
- 将 `assets/js/green-style.js` 复制/软链到 `chrome-extension/popup/green-style.js`，在 `popup.html` 中于 `formatter.js` 之前 `<script>` 引入 → `window.GreenStyle`（`GREEN_TOKENS`/`HEADING_SPECS`/`renderHeadingImage`/`renderTextImage` 等）。
- green-style.js 增加：把装饰件渲染为 base64 PNG 的函数（见 4.3）。

### 4.2 popup 接入绿模板（修改 popup.js / popup.html）
- `templateSelect` 在默认项后加内置 `<option value="__green__">十字路口绿</option>`。
- `applyTemplate('__green__')`：`Object.assign(S, DEFAULT_S, window.GreenStyle.GREEN_TOKENS)`（含 `__variant:'green'`、`__headingMode:'image'`）。
- popup.html `<head>` 加大丰收 + HarmonyOS `@font-face`；popup 初始化时预加载字体。
- 预加载未完成时禁用转换或给出「字体加载中」提示，避免标题图回退。

### 4.3 装饰件 → base64 PNG（green-style.js 内新增，预览/扩展共用）
- `renderDecorationPNG(kind)`：用 canvas 把引号/箭头/待办框（空/勾）画成 base64 PNG，返回 `data:image/png` 串。引号/箭头可由已有 SVG 路径在 canvas 上 `Path2D` 描绘；待办框为方框 + 勾。
- 分割线：用第一轮已导出的 `assets/img/divider1.png`，在扩展内转 base64（构建期或运行期 fetch→dataURL）打包为常量。
- 这些 base64 在扩展和 index.html 预览中都可用（index.html 当前用 SVG，可保留；扩展必须用 PNG）。

### 4.4 formatter.js 绿样式渲染（修改 renderBlock）
- 入口 `formatToWechat`：检测 `S.__variant==='green'` → 走绿渲染路径；否则原逻辑。
- 维护**序号计数器**：遍历 blocks 时累计 h2 出现次数（PART NN）、h3 出现次数（NN），传入标题图渲染。
- 各 block.type 的绿渲染：
  - h1-h6：`window.GreenStyle.renderHeadingImage(content, level, {seq})` → base64 `<img>`（width 100% 上限、margin 按级别）。
  - quote：引号 base64 PNG（块或段首）+ 绿色加粗文字段（`text-align:justify;letter-spacing:0.17em;line-height:1.1`）。
  - callout：`border-left:7px solid #40A978` + 绿色加粗左对齐文字。
  - bulleted_list：绿色圆点 + 绿字（list-style 或自绘圆点）。
  - numbered_list：每项「01 大号绿序号 + 缩进绿字」（不用 flex 时，用 `<section>` + 行内块；微信安全布局）。
  - todo：勾选框 base64 PNG + 绿字。
  - divider：分割线 base64 PNG `<img>`。
  - embed/footnotes/toggle/图注：按 GREEN_TOKENS 套色，行距字距对齐第一轮。
- 复用第一轮在 GREEN_TOKENS 里已定的色值/字号/行距/字距，保持与编辑器一致。

### 4.5 字体打包
- `chrome-extension/assets/fonts/可画大丰收SC.ttf`（14MB，用户已确认打包）+ HarmonyOS 4 字重。
- `manifest.json` 的 `web_accessible_resources` 若需 popup 加载本地字体则补充；popup.html `@font-face` 指向打包路径。

## 5. 微信安全布局对照（关键差异 vs 编辑器预览）

| 组件 | 编辑器预览（index.html） | 扩展输出（微信安全）|
|------|------|------|
| 标题 | canvas base64 PNG | 同（已安全）|
| 引用引号 | SVG + position:absolute | base64 PNG，纵向堆叠/段首 inline，无绝对定位 |
| 引言箭头 | inline SVG | base64 PNG |
| 待办框 | inline SVG | base64 PNG |
| 分割线 | `<img src=.svg>` | base64 PNG（divider1.png）|
| 左竖条（callout/引言/折叠）| border-left | border-left（微信支持，保留）|

## 6. 错误处理
- 字体未就绪：禁用转换或提示；canvas 渲染前确保 `document.fonts.ready`。
- canvas/toDataURL 失败：标题退化为绿色文本 `<section>`（CSS 兜底值已在 GREEN_TOKENS）。
- 装饰 PNG 生成失败：退化为无装饰的纯绿文字，保证不空白。
- 旧浏览器无 `??`/`Path2D`：扩展目标为 Chrome，可接受。

## 7. 测试策略
- 单元（node:test）：序号计数器（h2/h3 累计）、green 渲染分支选择、装饰 PNG 函数返回 data URI。
- 扩展手测（用户）：在真实飞书/Notion 文档上选「十字路口绿」转换 → 预览核对 → 复制粘贴进**微信公众号编辑器**核对（标题图、引号、分割线、列表、待办、间距）。**微信渲染行为以真公众号粘贴结果为准。**
- 回归：默认「十字路口专用」与服务器模板转换不受影响。

## 8. 风险与未知
- **微信兼容性需真机验证**：内联样式被剥离的具体行为、base64 图在草稿/正式发布的留存、flex/特殊属性支持度，只有粘进公众号才知道，可能需要多轮调整。
- 14MB 字体使扩展打包变大、首次加载 popup 略慢。
- base64 标题图使最终 HTML 体积显著增大（每个标题一张图），长文可能很大；必要时控制渲染分辨率（scale）。

## 9. 本轮不做
- 夜间模式、首图 banner、卡片样式参考等设计稿其他板块。
- 标题/装饰参数的扩展内 UI 可调。

// Popup 逻辑

(function () {
  'use strict';

  const badge        = document.getElementById('badge');
  const convertBtn   = document.getElementById('convertBtn');
  const copyBtn      = document.getElementById('copyBtn');
  const statusBar    = document.getElementById('statusBar');
  const statusIcon   = document.getElementById('statusIcon');
  const statusText   = document.getElementById('statusText');
  const preview      = document.getElementById('preview');
  const stats        = document.getElementById('stats');
  const imageNote    = document.getElementById('imageNote');
  const imageNoteTxt = document.getElementById('imageNoteText');
  const segmentRow   = document.getElementById('segmentRow');
  const segmentBtns  = document.getElementById('segmentBtns');
  const convertPanel    = document.getElementById('convert-panel');
  const templateRow     = document.getElementById('template-row');
  const wechatPanel     = document.getElementById('wechat-panel');
  const wechatStep1     = document.getElementById('wechat-step1');
  const wechatStep2     = document.getElementById('wechat-step2');
  const extractBtn      = document.getElementById('extractBtn');
  const reExtractBtn    = document.getElementById('reExtractBtn');
  const saveExtractBtn  = document.getElementById('saveExtractBtn');
  const wechatNameInput = document.getElementById('wechat-tpl-name');
  const resultsList     = document.getElementById('results-list');
  const apiTokenInput   = document.getElementById('apiTokenInput');

  // 提取结果暂存（step1→step2 传递）
  let lastExtracted = null;

  // ── API Token 存取 ──────────────────────────────────────────
  async function loadApiToken() {
    const { anthropicToken } = await chrome.storage.local.get('anthropicToken');
    if (anthropicToken && apiTokenInput) apiTokenInput.value = anthropicToken;
    return anthropicToken || '';
  }
  function saveApiToken(token) {
    chrome.storage.local.set({ anthropicToken: token });
  }

  // 与样式预览对齐的颗粒度分类
  const EXTRACT_CATEGORIES = [
    { label: 'paragraph · 正文段落', keys: ['p'] },
    { label: 'H1 · 一级标题',        keys: ['h1'] },
    { label: 'H2 · 二级标题',        keys: ['h2'] },
    { label: 'H3 · 三级标题',        keys: ['h3'] },
    { label: 'inline · 行内加粗',    keys: ['strong'] },
    { label: 'quote · 引用块',       keys: ['blockquote_wrapper', 'blockquote_text'] },
    { label: 'code · 代码块',        keys: ['code_wrapper', 'code_text'] },
    { label: 'hr · 分割线',          keys: ['hr'] },
    { label: 'list · 列表',          keys: ['ul', 'ol', 'li_ul', 'li_ol'] },
    { label: 'image · 图片',         keys: ['img_wrapper', 'img'] },
  ];

  function renderExtractResults(extracted) {
    resultsList.innerHTML = EXTRACT_CATEGORIES.map(cat => {
      const found   = cat.keys.filter(k => extracted[k]);
      const total   = cat.keys.length;
      const ok      = found.length > 0;
      return `<div class="result-item ${ok ? 'result-ok' : 'result-missing'}">
        <span class="result-icon">${ok ? '✅' : '⚠️'}</span>
        <span class="result-label${ok ? '' : ' dim'}">${cat.label}</span>
        ${ok
          ? `<span class="result-count">${found.length}/${total} 属性</span>`
          : `<span class="result-hint">文章中未发现</span>`}
      </div>`;
    }).join('');
  }

  function showWechatStep(step) {
    wechatStep1.classList.toggle('hidden', step !== 1);
    wechatStep2.classList.toggle('hidden', step !== 2);
  }

  let formattedHtml     = '';
  let formattedSegments = [];
  let currentTab        = null;
  let lastParsedData    = null; // 保存最近一次解析结果，供模板切换时重新渲染

  // 快照默认样式（formatter.js 已在此之前执行，S 已定义）
  const DEFAULT_S = Object.assign({}, S);

  let loadedTemplates   = []; // 从服务器拉取的模板列表

  // ── 初始化 ────────────────────────────────────────────────────

  // 显示当前版本号
  const manifest = chrome.runtime.getManifest();
  document.getElementById('appSub').textContent =
    `v${manifest.version} · Notion / 飞书 → 微信公众号`;

  // ── 模板选择器 ───────────────────────────────────────────────
  const templateSelect = document.getElementById('templateSelect');

  function renderTemplateSelector(templates, activeName) {
    loadedTemplates = templates || [];
    templateSelect.innerHTML =
      '<option value="">十字路口专用</option>' +
      loadedTemplates.map(t =>
        `<option value="${t.name}"${t.name === activeName ? ' selected' : ''}>${t.name}</option>`
      ).join('');
  }

  function applyTemplate(name) {
    // 先还原默认样式，再叠加模板（防止多次切换样式叠加污染）
    Object.assign(S, DEFAULT_S);
    if (name) {
      const tpl = loadedTemplates.find(t => t.name === name);
      if (tpl && tpl.s) Object.assign(S, tpl.s);
    }
    // 保存当前激活模板
    chrome.runtime.sendMessage({ action: 'setActiveTemplate', name });
  }

  templateSelect.addEventListener('change', function () {
    const name = this.value;
    applyTemplate(name);
    templateSelect.classList.add('applied');
    setTimeout(() => templateSelect.classList.remove('applied'), 1200);

    // 若已有转换结果，立即用新样式重新渲染预览
    if (lastParsedData) {
      formattedHtml = formatToWechat(lastParsedData);
      renderPreview(formattedHtml, lastParsedData);
      const blockCount = (lastParsedData.blocks || []).length;
      const nSeg = blockCount <= 6 ? 2 : blockCount <= 18 ? 3 : 4;
      formattedSegments = splitFormatToWechat(lastParsedData, nSeg);
      renderSegmentButtons(formattedSegments);
    }
  });

  // ── 服务器同步 ───────────────────────────────────────────────
  const SERVER_URL = 'https://layout-design-production-fb0b.up.railway.app';
  const syncBtn = document.getElementById('syncBtn');

  async function fetchServerTemplates() {
    const res = await fetch(`${SERVER_URL}/api/templates`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { templates } = await res.json();
    if (!Array.isArray(templates)) throw new Error('invalid');
    return templates;
  }

  async function syncFromServer() {
    try {
      const templates = await fetchServerTemplates();
      renderTemplateSelector(templates, templateSelect.value);
      // Re-apply current template so S is refreshed with latest data
      applyTemplate(templateSelect.value);
      return true;
    } catch { return false; }
  }

  syncBtn.addEventListener('click', async () => {
    syncBtn.disabled = true;
    syncBtn.textContent = '⏳ 同步中';
    const ok = await syncFromServer();
    syncBtn.disabled = false;
    syncBtn.textContent = '↻ 同步';
    showStatus(ok ? 'success' : 'error', ok ? '模板同步成功' : '同步失败，请检查服务器');
    setTimeout(() => { statusBar.className = 'status-bar status-bar--hidden'; }, 2500);

    // 若已有转换结果，用新模板样式重新渲染
    if (ok && lastParsedData) {
      formattedHtml = formatToWechat(lastParsedData);
      renderPreview(formattedHtml, lastParsedData);
      const blockCount = (lastParsedData.blocks || []).length;
      const nSeg = blockCount <= 6 ? 2 : blockCount <= 18 ? 3 : 4;
      formattedSegments = splitFormatToWechat(lastParsedData, nSeg);
      renderSegmentButtons(formattedSegments);
    }
  });

  // 启动时直接从服务器拉取，不使用本地缓存
  (async function initTemplates() {
    const activeName = await new Promise(r =>
      chrome.storage.local.get('activeTemplate', d => r(d.activeTemplate || ''))
    );
    const templates = await fetchServerTemplates().catch(() => []);
    renderTemplateSelector(templates, activeName);
    if (activeName) applyTemplate(activeName);
  })();

  async function init() {
    loadApiToken(); // 恢复上次保存的 token
    // 每次切换 tab 都先重置按钮状态，避免上一次 disabled 状态残留
    convertBtn.disabled = false;
    setBadge('unknown', '检测中...');
    statusBar.className = 'status-bar status-bar--hidden';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      const url = tab.url || '';
      const isNotion  = url.includes('notion.so') || url.includes('notion.site');
      const isFeishu  = url.includes('feishu.cn') || url.includes('larksuite.com');
      const isWechat  = url.includes('mp.weixin.qq.com') && /\/s[/?]/.test(url);

      if (isWechat) {
        setBadge('wechat', '微信文章');
        templateRow.classList.add('hidden');
        convertPanel.classList.add('hidden');
        wechatPanel.classList.remove('hidden');
        showWechatStep(1);
        return;
      }

      // 回到 Notion/飞书模式时确保面板正确显示
      templateRow.classList.remove('hidden');
      convertPanel.classList.remove('hidden');
      wechatPanel.classList.add('hidden');

      if (!isNotion && !isFeishu) {
        setBadge('unsupported', '不支持');
        convertBtn.disabled = true;
        showStatus('error', '请在 Notion 或飞书文章页面使用本插件');
        return;
      }

      let resp = await pingTab(tab.id);

      if (!resp) {
        showStatus('loading', '正在连接页面...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/notion-parser.js', 'content/feishu-parser.js', 'content/content.js'],
          });
          await sleep(200);
          resp = await pingTab(tab.id);
        } catch (_) {}
      }

      if (!resp) {
        setBadge('unknown', '连接失败');
        convertBtn.disabled = true;
        showStatus('error', '无法连接页面，请手动刷新后重试');
        return;
      }

      statusBar.className = 'status-bar status-bar--hidden';
      setBadge(
        resp.pageType === 'notion' ? 'notion' : 'feishu',
        resp.pageType === 'notion' ? 'Notion' : '飞书'
      );
    } catch (err) {
      setBadge('unknown', '错误');
      showStatus('error', '初始化失败：' + err.message);
    }
  }

  // ── 转换逻辑 ──────────────────────────────────────────────────

  convertBtn.addEventListener('click', async () => {
    if (!currentTab) return;
    convertBtn.disabled = true;
    copyBtn.disabled = true;
    segmentRow.classList.add('hidden');
    imageNote.classList.add('hidden');
    showStatus('loading', '正在解析文档...');
    setPreviewLoading();

    try {
      // 0. 先从服务器拉取最新模板（侧边栏不会重载，需主动刷新）
      await syncFromServer().catch(() => {});

      // 1. 解析文档
      const resp = await sendMessage(currentTab.id, { action: 'parse' });
      if (!resp.success) throw new Error(resp.error || '解析失败');

      // 2. 图片转 Base64（默认开启）
      showStatus('loading', '正在转换图片...');
      await convertImages(currentTab.id, resp.data.blocks);

      // 3. 格式化 & 渲染
      lastParsedData = resp.data;
      formattedHtml = formatToWechat(resp.data);
      renderPreview(formattedHtml, resp.data);
      copyBtn.disabled = false;
      convertBtn.disabled = false;

      // 4. 分段切割（自动按块数决定段数）
      const blockCount = (resp.data.blocks || []).length;
      const nSeg = blockCount <= 6 ? 2 : blockCount <= 18 ? 3 : 4;
      formattedSegments = splitFormatToWechat(resp.data, nSeg);
      renderSegmentButtons(formattedSegments);

      // 5. 图片提示
      const blocks = resp.data.blocks;
      const hasImages = flatBlocks(blocks).some(b => b.type === 'image');
      const hasBase64 = flatBlocks(blocks).some(b => b.type === 'image' && b.base64);
      if (hasImages) {
        imageNote.classList.remove('hidden');
        imageNoteTxt.textContent = hasBase64
          ? '图片已转 Base64，粘贴后可离线显示'
          : '图片 URL 已包含，需在微信编辑器中手动上传';
      }

      showStatus('success', '转换成功 — 可完整复制或分段复制到微信编辑器');
    } catch (err) {
      convertBtn.disabled = false;
      showStatus('error', err.message);
      resetPreview();
    }
  });

  // ── 分段按钮渲染 ──────────────────────────────────────────────

  function renderSegmentButtons(segments) {
    segmentBtns.innerHTML = '';
    if (segments.length < 2) { segmentRow.classList.add('hidden'); return; }

    segments.forEach((seg, i) => {
      const btn = document.createElement('button');
      btn.className = 'btn--seg';
      const chars = stripTags(seg).length;
      const label = `第${i + 1}段 (${chars.toLocaleString()}字)`;
      btn.textContent = label;
      btn.addEventListener('click', async () => {
        try {
          await copyHtmlToClipboard(seg);
          btn.classList.add('btn--seg--ok');
          btn.textContent = `✅ 第${i + 1}段已复制`;
          setTimeout(() => {
            btn.classList.remove('btn--seg--ok');
            btn.textContent = label;
          }, 2500);
        } catch (err) {
          showStatus('error', '复制失败：' + err.message);
        }
      });
      segmentBtns.appendChild(btn);
    });

    segmentRow.classList.remove('hidden');
  }

  // ── 图片转 Base64：双重策略 ───────────────────────────────────

  async function convertImages(tabId, blocks) {
    const urlSet = new Set();
    collectImageUrls(blocks, urlSet);
    const urls = [...urlSet];
    if (urls.length === 0) return;

    let base64Map = {};

    // 非 blob URL → background script（无跨域限制，无超时限制）
    const regularUrls = urls.filter(u => !u.startsWith('blob:'));
    if (regularUrls.length > 0) {
      try {
        const resp = await new Promise(resolve => {
          chrome.runtime.sendMessage({ action: 'fetchImagesAsBase64', urls: regularUrls }, resolve);
        });
        if (resp && resp.success) base64Map = resp.data || {};
      } catch (_) {}
    }

    // blob URL + background 未成功的 URL → MAIN world（有页面 auth cookie）
    const remaining = urls.filter(u => !base64Map[u]);
    if (remaining.length > 0) {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: async (imageUrls) => {
            const toBase64 = (url) => fetch(url, { credentials: 'same-origin' })
              .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
              .then(blob => new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result);
                reader.onerror = rej;
                reader.readAsDataURL(blob);
              }))
              .catch(() => null);
            const results = await Promise.all(imageUrls.map(toBase64));
            const map = {};
            imageUrls.forEach((url, i) => { if (results[i]) map[url] = results[i]; });
            return map;
          },
          args: [remaining],
        });
        Object.assign(base64Map, (results[0] && results[0].result) || {});
      } catch (_) {}
    }

    applyBase64(blocks, base64Map);
  }

  function collectImageUrls(blocks, urlSet) {
    for (const block of blocks || []) {
      if (!block) continue;
      if (block.type === 'image' && block.url) urlSet.add(block.url);
      collectImageUrls(block.children, urlSet);
      if (block.columns) block.columns.forEach(col => collectImageUrls(col, urlSet));
      if (block.items) block.items.forEach(item => collectImageUrls(item.children, urlSet));
    }
  }

  function applyBase64(blocks, map) {
    for (const block of blocks || []) {
      if (!block) continue;
      if (block.type === 'image' && block.url && map[block.url]) block.base64 = map[block.url];
      applyBase64(block.children, map);
      if (block.columns) block.columns.forEach(col => applyBase64(col, map));
      if (block.items) block.items.forEach(item => applyBase64(item.children, map));
    }
  }

  function flatBlocks(blocks, acc = []) {
    for (const b of blocks || []) {
      if (!b) continue;
      acc.push(b);
      flatBlocks(b.children, acc);
      if (b.columns) b.columns.forEach(col => flatBlocks(col, acc));
    }
    return acc;
  }

  // ── 完整复制 ──────────────────────────────────────────────────

  copyBtn.addEventListener('click', async () => {
    if (!formattedHtml) return;
    try {
      await copyHtmlToClipboard(formattedHtml);
      copyBtn.classList.add('btn--copied');
      copyBtn.querySelector('.btn-icon').textContent = '✅';
      copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 已复制！';
      setTimeout(() => {
        copyBtn.classList.remove('btn--copied');
        copyBtn.querySelector('.btn-icon').textContent = '📋';
        copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 完整复制';
      }, 2000);
    } catch (err) {
      showStatus('error', '复制失败：' + err.message);
    }
  });

  async function copyHtmlToClipboard(html) {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],            { type: 'text/html' }),
          'text/plain': new Blob([stripTags(html)], { type: 'text/plain' }),
        }),
      ]);
      return;
    }

    const el = document.createElement('div');
    el.contentEditable = 'true';
    el.style.cssText = 'position:fixed;top:0;left:0;width:677px;height:1px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-9999;';
    el.innerHTML = html;
    document.body.appendChild(el);
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}
    sel.removeAllRanges();
    document.body.removeChild(el);
    if (ok) return;

    throw new Error('浏览器不支持复制，请手动选中预览内容后 Ctrl+C');
  }

  // ── 工具函数 ──────────────────────────────────────────────────

  function sendMessage(tabId, msg) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, msg, resp => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(resp);
      });
    });
  }

  function pingTab(tabId) {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, resp => {
        resolve(chrome.runtime.lastError ? null : resp);
      });
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
  function stripTags(html) {
    const d = document.createElement('div');
    d.innerHTML = html;
    return d.textContent || d.innerText || '';
  }

  function setBadge(type, text) {
    badge.textContent = text;
    badge.className = `badge badge--${type}`;
  }

  function showStatus(type, text) {
    statusBar.className = `status-bar status-bar--${type}`;
    statusText.textContent = text;
    statusIcon.textContent = type === 'loading' ? '⏳' : type === 'success' ? '✅' : '❌';
  }

  function setPreviewLoading() {
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon spinning">⚙️</div><div class="empty-text">正在解析并排版...</div></div>`;
  }

  function resetPreview() {
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-text">转换失败，请重试</div></div>`;
    stats.textContent = '';
    formattedHtml = '';
    formattedSegments = [];
    segmentRow.classList.add('hidden');
  }

  function renderPreview(html, data) {
    preview.innerHTML = html;
    preview.querySelectorAll('img').forEach(img => {
      if (!img.src.startsWith('data:')) {
        img.addEventListener('error', () => {
          const ph = document.createElement('div');
          ph.className = 'img-placeholder';
          ph.textContent = '🖼 图片已包含在复制内容中';
          img.parentNode && img.parentNode.replaceChild(ph, img);
        });
      }
    });
    const charCount  = stripTags(html).length;
    const blockCount = (data.blocks || []).length;
    stats.textContent = `${blockCount} 个块 · ${charCount.toLocaleString()} 字`;
  }

  // ── 微信公众号排版提取 ────────────────────────────────────────

  // ── Phase 1：生成精简 HTML（在页面 MAIN world 中执行）────────────────────
  function wechatExtractFn() {
    const content = document.querySelector('#js_content') ||
                    document.querySelector('.rich_media_content');
    if (!content) return null;

    function gs(el) { return (el.getAttribute('style') || '').trim(); }

    // 精简 HTML：只保留 tag + inline style + 前 35 字文字，剥掉所有其他属性
    const SKIP = new Set(['script','style','meta','link','noscript','head','svg','path']);
    function simplify(el, depth) {
      if (depth > 20) return '';
      const tag = el.tagName.toLowerCase();
      if (SKIP.has(tag)) return '';
      const s    = gs(el);
      const attr = s ? ` style="${s}"` : '';
      if (tag === 'img') return `<img${attr}/>`;
      if (tag === 'br')  return '<br/>';
      if (tag === 'hr')  return `<hr${attr}/>`;
      let inner = '';
      for (const node of el.childNodes) {
        if (node.nodeType === 3) {
          const t = node.textContent.replace(/\s+/g, ' ').trim();
          if (t) inner += t.length > 35 ? t.slice(0, 35) + '…' : t;
        } else if (node.nodeType === 1) {
          inner += simplify(node, depth + 1);
        }
      }
      if (!s && !inner.trim()) return '';
      return inner ? `<${tag}${attr}>${inner}</${tag}>` : `<${tag}${attr}/>`;
    }

    let html = simplify(content, 0);
    if (html.length > 40000) html = html.slice(0, 40000) + '\n<!-- truncated -->';

    // 正文基准字号
    let bodyFs = 15;
    const pEls = [...content.querySelectorAll('p')].filter(e => e.textContent.trim().length >= 20);
    if (pEls.length) {
      const fss = pEls.slice(0, 5).map(e => parseFloat(window.getComputedStyle(e).fontSize) || 0).filter(Boolean);
      if (fss.length) bodyFs = Math.round(fss.reduce((a, b) => a + b) / fss.length);
    }

    return { html, bodyFs };
  }

  // ── Phase 2：把完整结构 HTML 发给 Claude，AI 合成各块完整 CSS ──────────────
  async function classifyWithAI(rawData, apiToken) {
    const { html, bodyFs } = rawData;

    const prompt =
`You are analyzing a WeChat (微信公众号) article to extract reusable CSS styles for each content block type.

WeChat articles distribute visual styles across MULTIPLE levels of nested <section> elements.
For example, a heading may have font-size on an inner <section> and border-left on an outer <section>.
You MUST combine styles from ALL relevant nesting levels into a single synthesized CSS string.

Body text font-size baseline: ${bodyFs}px

Block types to identify:
- p              : body paragraph (font-size ≈ ${bodyFs}px, main reading text)
- h1             : largest heading (font-size > ${bodyFs}px) — synthesize font+color from inner element AND decorations (border-left/background/padding/margin) from outer containers
- h2             : second heading level (same synthesis rule)
- h3             : third heading level (same synthesis rule)
- strong         : inline bold (<strong>/<b>, or font-weight:bold/700)
- blockquote_wrapper : blockquote container — synthesize border-left, background-color, padding from all surrounding sections
- blockquote_text    : text style INSIDE the blockquote container
- code_wrapper   : code block outer container (monospace font or code-like background)
- code_text      : text style inside code block
- hr             : horizontal divider
- ul             : unordered list container
- ol             : ordered list container
- li_ul          : <li> inside <ul>
- li_ol          : <li> inside <ol>
- img_wrapper    : parent element wrapping an <img>
- img            : image element

RULES:
1. For each block type, produce a SYNTHESIZED CSS string combining properties from the element AND its ancestor containers.
2. If two levels both set the same property, prefer the more specific (inner) value.
3. Include all visually significant properties: font-size, font-weight, color, line-height, letter-spacing, text-align, border-left, border-right, border-top, border-bottom, background-color, border-radius, padding, margin.
4. Omit zero/default-only values (e.g. margin:0, letter-spacing:normal).
5. Omit block types not present in the article.

HTML:
${html}

Output ONLY a JSON object with synthesized CSS strings:
{"p":"font-size:15px;color:rgb(63,63,63);line-height:1.75","h1":"font-size:20px;font-weight:bold;color:#222;border-left:4px solid #d32f2f;padding-left:12px;margin:30px 0 15px",...}`;

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiToken,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API 错误 (${resp.status})`);
    }

    const data  = await resp.json();
    const text  = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI 未返回有效 JSON');
    return JSON.parse(match[0]);
  }

  // ── Phase 3：AI 直接返回合成 CSS 字符串，无需 styleIndex 查表 ──────────────
  function buildResultFromClassification(classification) {
    const result = {};
    for (const [key, css] of Object.entries(classification)) {
      if (typeof css !== 'string') continue;
      let style = css.trim();
      if (!style) continue;
      if (key === 'p') style += ';margin:0;padding-bottom:1em;white-space:pre-line';
      result[key] = style;
    }
    return result;
  }

  // Step 1：点击提取 → Phase1 收集 → Phase2 AI分类 → 渲染结果 → Step 2
  extractBtn.addEventListener('click', async () => {
    const apiToken = apiTokenInput.value.trim() || await loadApiToken();
    if (!apiToken) {
      apiTokenInput.style.borderColor = '#e85555';
      apiTokenInput.focus();
      return;
    }
    apiTokenInput.style.borderColor = '';
    saveApiToken(apiToken);

    extractBtn.disabled = true;

    try {
      // Phase 1
      extractBtn.innerHTML = '<span class="btn-icon">🔍</span>读取页面样式...';
      showStatus('loading', '正在读取页面样式...');
      const scriptResult = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        world:  'MAIN',
        func:   wechatExtractFn,
      });
      const rawData = scriptResult[0]?.result;
      if (!rawData) throw new Error('未能读取页面内容，请确认文章已完全加载');

      // Phase 2
      extractBtn.innerHTML = '<span class="btn-icon">🤖</span>AI 分析中...';
      const htmlKb = Math.round(rawData.html.length / 1024);
      showStatus('loading', `AI 正在分析文章结构（${htmlKb}KB）...`);
      const classification = await classifyWithAI(rawData, apiToken);

      // Phase 3
      const extracted = buildResultFromClassification(classification);
      if (Object.keys(extracted).length === 0) throw new Error('AI 未能识别任何样式块');

      lastExtracted = extracted;
      renderExtractResults(extracted);
      wechatNameInput.value = '';
      statusBar.className = 'status-bar status-bar--hidden';
      showWechatStep(2);
    } catch (err) {
      lastExtracted = null;
      showStatus('error', '提取失败：' + err.message);
    }

    extractBtn.disabled = false;
    extractBtn.innerHTML = '<span class="btn-icon">✨</span>提取风格并保存为模板';
  });

  // 重新提取：回到 Step 1
  reExtractBtn.addEventListener('click', () => {
    lastExtracted = null;
    showWechatStep(1);
    statusBar.className = 'status-bar status-bar--hidden';
  });

  // Step 2：保存为模板
  saveExtractBtn.addEventListener('click', async () => {
    const name = wechatNameInput.value.trim();
    if (!name) { wechatNameInput.focus(); wechatNameInput.style.borderColor = '#e85555'; return; }

    if (!lastExtracted) { showStatus('error', '请先提取排版风格'); return; }

    saveExtractBtn.disabled = true;
    saveExtractBtn.innerHTML = '⏳ 保存中...';

    try {
      const templates = await fetchServerTemplates().catch(() => [...loadedTemplates]);
      if (templates.find(t => t.name === name)) {
        throw new Error(`模板「${name}」已存在，请换个名称`);
      }

      const s = Object.assign({}, DEFAULT_S, lastExtracted);
      templates.push({ name, s });

      const res = await fetch(`${SERVER_URL}/api/templates`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ templates }),
      });
      if (!res.ok) throw new Error(`服务器错误 ${res.status}`);

      renderTemplateSelector(templates, name);
      applyTemplate(name);
      showStatus('success', `「${name}」已保存，可在网页端编辑细节`);
      setTimeout(() => { statusBar.className = 'status-bar status-bar--hidden'; }, 4000);

      // 保存成功后重置回 Step 1
      lastExtracted = null;
      wechatNameInput.value = '';
      showWechatStep(1);
    } catch (err) {
      showStatus('error', err.message);
    }

    wechatNameInput.style.borderColor = '';
    saveExtractBtn.disabled = false;
    saveExtractBtn.innerHTML = '<span class="btn-icon">💾</span>保存为模板';
  });

  init();

  // 切换 Tab 时重新检测页面类型
  chrome.tabs.onActivated.addListener(() => init());
})();

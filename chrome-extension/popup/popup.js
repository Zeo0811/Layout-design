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
  const reExtractBtn    = document.getElementById('reExtractBtn');
  const saveExtractBtn  = document.getElementById('saveExtractBtn');
  const wechatNameInput = document.getElementById('wechat-tpl-name');
  const resultsList     = document.getElementById('results-list');

  // 提取结果暂存（step1→step2 传递）
  let lastExtracted = null;

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
        // 切换 tab 时重置选择模式 UI
        if (selectionModeActive) {
          selectionModeActive = false;
          selectModeBtn.innerHTML = '<span class="btn-icon">🖱</span>进入选择模式';
          selectModeBtn.classList.remove('btn--active');
          statusBar.className = 'status-bar status-bar--hidden';
        }
        chrome.storage.local.get(['wechat_selections'], d => updateMiniList(d.wechat_selections));
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

  // ── 微信公众号手动选择排版 ────────────────────────────────────

  const selectModeBtn    = document.getElementById('selectModeBtn');
  const miniSelectedList = document.getElementById('mini-selected-list');
  const toSaveBtn        = document.getElementById('toSaveBtn');
  let selectionModeActive = false;

  // 注入到页面的选择器（ISOLATED world，有 chrome API 访问权）
  function injectWechatSelectorFn() {
    if (window.__wzxActive) return 'already_active';
    const content = document.querySelector('#js_content') ||
                    document.querySelector('.rich_media_content');
    if (!content) return 'no_content';

    // ── 浮动高亮层（借鉴 Chrome DevTools 选择器：不修改目标元素样式）──
    const hlBox = document.createElement('div');
    hlBox.id = '__wzx_hlbox__';
    hlBox.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483645;box-sizing:border-box;border:2px solid #07a11d;background:rgba(7,161,29,0.08);border-radius:2px;display:none;';
    document.body.appendChild(hlBox);

    const hlBadge = document.createElement('div');
    hlBadge.id = '__wzx_hlbadge__';
    hlBadge.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483646;background:#07a11d;color:#fff;font:bold 11px/18px monospace;padding:1px 8px;border-radius:0 0 3px 3px;display:none;white-space:nowrap;';
    document.body.appendChild(hlBadge);

    let currentEl = null;

    function showHighlight(el) {
      if (!el || !content.contains(el)) { hideHighlight(); return; }
      const r = el.getBoundingClientRect();
      // 跳过零尺寸元素，尝试父节点
      if (r.width === 0 && r.height === 0) { showHighlight(el.parentElement); return; }
      currentEl = el;
      hlBox.style.display = 'block';
      hlBox.style.left   = r.left + 'px';
      hlBox.style.top    = r.top  + 'px';
      hlBox.style.width  = r.width + 'px';
      hlBox.style.height = r.height + 'px';
      const tag = el.tagName.toLowerCase();
      const id  = el.id ? '#' + el.id : '';
      const cls = typeof el.className === 'string' && el.className.trim()
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      hlBadge.textContent = tag + id + cls;
      hlBadge.style.display = 'block';
      hlBadge.style.left = Math.max(0, r.left) + 'px';
      hlBadge.style.top  = (r.top >= 20 ? r.top - 20 : r.bottom) + 'px';
    }

    function hideHighlight() {
      hlBox.style.display   = 'none';
      hlBadge.style.display = 'none';
      currentEl = null;
    }

    // 纯行内类型：只提取 CSS 属性，不做 HTML 模板
    const INLINE_TYPES = new Set(['strong', 'em']);

    // 计算从 root 到 target 的子节点索引路径
    function getPathFromRoot(root, target) {
      const path = [];
      let cur = target;
      while (cur && cur !== root) {
        const parent = cur.parentElement;
        if (!parent) break;
        path.unshift(Array.from(parent.children).indexOf(cur));
        cur = parent;
      }
      return path;
    }

    function followPath(root, path) {
      let cur = root;
      for (const idx of path) {
        if (!cur || !cur.children[idx]) return null;
        cur = cur.children[idx];
      }
      return cur;
    }

    // 清理克隆节点：去图片 src + 微信私有属性 + visibility
    function cleanClone(clone) {
      clone.querySelectorAll('img').forEach(img => {
        img.removeAttribute('src');
        img.removeAttribute('data-src');
      });
      const wechatAttrs = [
        'mpa-from-tpl','mpa-font-style','leaf','mpa-is-content',
        'data-textalign','data-colwidth','mpa-paragraph-type',
        'data-mpa-template','data-mpa-action-id','mpa-data-temp-power-by',
        'data-pm-slice','data-lazy-bgimg','data-ratio','data-s','data-w',
        'data-type','data-croporisrc','data-cropselx2','data-cropsely2',
        'data-backw','data-backh','data-imgfileid','data-aistatus',
        'data-original-style','data-index','data-report-img-idx','data-fail',
      ];
      wechatAttrs.forEach(attr => {
        clone.querySelectorAll('[' + attr + ']').forEach(n => n.removeAttribute(attr));
        if (clone.hasAttribute(attr)) clone.removeAttribute(attr);
      });
      clone.querySelectorAll('[style]').forEach(n => n.style.removeProperty('visibility'));
      if (clone.style) clone.style.removeProperty('visibility');
    }

    // 将原始元素树的 computed style 全量内联到克隆树
    // 每个节点都从原始 DOM 读取实际渲染值并写入 inline style，
    // 确保提取的模板完全自包含，不依赖任何外部 CSS（CSS类、继承链、浏览器默认值等）
    function inlineAllComputedStyles(origRoot, cloneRoot) {
      const PROPS = [
        // 字体 & 文字
        'font-size','font-family','font-weight','font-style','font-variant',
        'color','line-height','letter-spacing','word-spacing',
        'text-align','text-decoration','text-transform','text-indent',
        'white-space','word-break','word-wrap','overflow-wrap',
        // 盒模型
        'display','box-sizing','vertical-align','float',
        'margin-top','margin-right','margin-bottom','margin-left',
        'padding-top','padding-right','padding-bottom','padding-left',
        'width','height','max-width','min-width','max-height',
        // 边框（拆分写，避免 shorthand 解析差异）
        'border-top-width','border-top-style','border-top-color',
        'border-right-width','border-right-style','border-right-color',
        'border-bottom-width','border-bottom-style','border-bottom-color',
        'border-left-width','border-left-style','border-left-color',
        'border-top-left-radius','border-top-right-radius',
        'border-bottom-left-radius','border-bottom-right-radius',
        // 背景
        'background-color','background-image','background-size',
        'background-position','background-repeat',
        // Flex
        'flex-direction','flex-wrap','align-items','align-self',
        'justify-content','flex-grow','flex-shrink','flex-basis',
        // 其他视觉
        'overflow','overflow-x','overflow-y','position',
        'opacity','box-shadow','text-shadow','list-style-type',
      ];
      // 跳过明确的默认值，减少冗余属性
      const DEFAULTS = {
        'display':'inline','position':'static','opacity':'1',
        'overflow':'visible','overflow-x':'visible','overflow-y':'visible',
        'float':'none','box-shadow':'none','text-shadow':'none',
        'background-image':'none','background-color':'rgba(0, 0, 0, 0)',
        'width':'auto','height':'auto','min-width':'0px',
        'max-width':'none','max-height':'none',
        'text-indent':'0px','text-transform':'none',
        'letter-spacing':'normal','word-spacing':'0px',
        'font-variant':'normal','list-style-type':'none',
        'border-top-width':'0px','border-right-width':'0px',
        'border-bottom-width':'0px','border-left-width':'0px',
        'border-top-style':'none','border-right-style':'none',
        'border-bottom-style':'none','border-left-style':'none',
        'margin-top':'0px','margin-right':'0px',
        'margin-bottom':'0px','margin-left':'0px',
        'padding-top':'0px','padding-right':'0px',
        'padding-bottom':'0px','padding-left':'0px',
        'flex-direction':'row','flex-wrap':'nowrap',
        'align-items':'normal','align-self':'auto',
        'justify-content':'normal','flex-grow':'0',
        'flex-shrink':'1','flex-basis':'auto',
        'text-align':'start','vertical-align':'baseline',
        'white-space':'normal','word-break':'normal','word-wrap':'normal',
        'overflow-wrap':'normal',
      };

      function walk(orig, clone) {
        if (!orig || !clone || orig.nodeType !== 1) return;
        const cs = window.getComputedStyle(orig);
        for (const p of PROPS) {
          const v = cs.getPropertyValue(p).trim();
          if (!v) continue;
          if (DEFAULTS[p] === v) continue;
          // 透明背景统一跳过
          if (p === 'background-color' && (v === 'transparent' || v === 'rgba(0, 0, 0, 0)')) continue;
          // text-align: start / -webkit-auto 是浏览器内部值，跳过
          if (p === 'text-align' && (v === 'start' || v === '-webkit-auto')) continue;
          // 已有 inline style 时保留原值（原始 inline style 更精确）
          if (clone.style.getPropertyValue(p)) continue;
          clone.style.setProperty(p, v);
        }
        const origKids = orig.children;
        const cloneKids = clone.children;
        for (let i = 0; i < Math.min(origKids.length, cloneKids.length); i++) {
          walk(origKids[i], cloneKids[i]);
        }
      }
      walk(origRoot, cloneRoot);
    }

    // 提取模板：行内类型 → CSS 字符串；块级类型 → 带 {{content}} 的 outerHTML
    function extractTemplate(el, blockType) {
      if (INLINE_TYPES.has(blockType)) {
        // 行内类型：直接读取完整 computed style
        const cs = window.getComputedStyle(el);
        const parts = {};
        const TPROPS = [
          'font-size','font-family','font-weight','font-style',
          'color','line-height','letter-spacing','text-align',
          'background-color','border-bottom','text-decoration',
          'word-break','padding-top','padding-right','padding-bottom','padding-left',
        ];
        for (const p of TPROPS) {
          const v = cs.getPropertyValue(p).trim();
          if (!v) continue;
          if (p === 'font-weight'     && (v === '400' || v === 'normal')) continue;
          if (p === 'font-style'      && v === 'normal') continue;
          if (p === 'text-align'      && (v === 'start' || v === '-webkit-auto')) continue;
          if (p === 'letter-spacing'  && v === 'normal') continue;
          if (p === 'text-decoration' && v.startsWith('none')) continue;
          if (p === 'background-color'&& (v === 'transparent' || v === 'rgba(0, 0, 0, 0)')) continue;
          parts[p] = v;
        }
        return Object.entries(parts).map(([k, v]) => `${k}:${v}`).join(';');
      }

      const root  = el;
      const clone = root.cloneNode(true);
      cleanClone(clone);

      // 全量内联：对整棵树每个节点都内联 computed style
      // 这是让提取效果与原始效果完全一致的关键
      inlineAllComputedStyles(root, clone);

      // 确定内容注入点（{{content}} 放置位置）
      const markedEl = root.querySelector('[mpa-is-content]');
      let contentEl;
      if (markedEl) {
        contentEl = markedEl;
      } else {
        const tag = root.tagName.toLowerCase();
        const SIMPLE_TAGS = ['p','h1','h2','h3','h4','h5','h6','li','blockquote','td','th','dt','dd','figcaption'];
        contentEl = SIMPLE_TAGS.includes(tag) ? root : (root.querySelector('p,h1,h2,h3,h4,h5,h6,li,blockquote') || root);
      }

      let cloneTarget;
      if (contentEl === root) {
        cloneTarget = clone;
      } else {
        const path = getPathFromRoot(root, contentEl);
        cloneTarget = followPath(clone, path) || clone;
      }

      cloneTarget.innerHTML = '{{content}}';
      return clone.outerHTML;
    }

    function removeOverlay() {
      const ov = document.getElementById('__wzx_overlay__');
      if (ov) ov.remove();
    }

    // 克隆元素用于左侧"原始效果"预览（替换图片避免跨域）
    function getOrigHtml(el) {
      const clone = el.cloneNode(true);
      inlineAllComputedStyles(el, clone);
      clone.querySelectorAll('img').forEach(img => {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='80' height='60' fill='%23ddd'/%3E%3Ctext x='40' y='35' text-anchor='middle' fill='%23888' font-size='10'%3E图片%3C/text%3E%3C/svg%3E";
      });
      clone.style.outline  = 'none';
      clone.style.maxWidth = '100%';
      clone.style.overflow = 'hidden';
      return clone.outerHTML;
    }

    // 根据 blockType 生成示例 HTML（用于右侧预览）
    function getSampleHtml(blockType, cssStr) {
      const s = cssStr ? ` style="${cssStr.replace(/"/g, "'")}"` : '';
      const sampleText = '这是一段示例文字，用于预览排版效果。The quick brown fox.';
      switch (blockType) {
        case 'p':                  return `<p${s}>${sampleText}</p>`;
        case 'h1':                 return `<h1${s}>一级标题示例</h1>`;
        case 'h2':                 return `<h2${s}>二级标题示例</h2>`;
        case 'h3':                 return `<h3${s}>三级标题示例</h3>`;
        case 'strong':             return `<p>正文中 <strong${s}>加粗文字</strong> 示例</p>`;
        case 'blockquote_wrapper': return `<blockquote${s}>${sampleText}</blockquote>`;
        case 'blockquote_text':    return `<p${s}>${sampleText}</p>`;
        case 'code_wrapper':       return `<div${s}><code>console.log("hello world")</code></div>`;
        case 'code_text':          return `<code${s}>console.log("hello world")</code>`;
        case 'hr':                 return `<hr${s}/>`;
        case 'ul':                 return `<ul${s}><li>列表项一</li><li>列表项二</li></ul>`;
        case 'li_ul':              return `<ul><li${s}>${sampleText}</li></ul>`;
        case 'ol':                 return `<ol${s}><li>列表项一</li><li>列表项二</li></ol>`;
        case 'li_ol':              return `<ol><li${s}>${sampleText}</li></ol>`;
        case 'img_wrapper':        return `<div${s}><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23ddd'/%3E%3Ctext x='60' y='45' text-anchor='middle' fill='%23888' font-size='12'%3E图片%3C/text%3E%3C/svg%3E" style="max-width:100%;display:block;" alt=""/></div>`;
        case 'img':                return `<img${s} src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%23ddd'/%3E%3Ctext x='60' y='45' text-anchor='middle' fill='%23888' font-size='12'%3E图片%3C/text%3E%3C/svg%3E" alt=""/>`;
        default:                   return `<div${s}>${sampleText}</div>`;
      }
    }

    // 获取 contentEl 的原始 innerHTML 用于右侧精准预览
    // 与 extractTemplate 的 contentEl 查找逻辑保持一致，确保两侧对比的是同一层级内容
    function getActualContentHtml(el, blockType) {
      let src;
      if (INLINE_TYPES.has(blockType)) {
        src = el;
      } else {
        const markedEl = el.querySelector('[mpa-is-content]');
        if (markedEl) {
          src = markedEl;
        } else {
          const tag = el.tagName.toLowerCase();
          const SIMPLE_TAGS = ['p','h1','h2','h3','h4','h5','h6','li','blockquote','td','th','dt','dd','figcaption'];
          src = SIMPLE_TAGS.includes(tag) ? el : (el.querySelector('p,h1,h2,h3,h4,h5,h6,li,blockquote') || el);
        }
      }
      // 克隆 src 并内联计算样式，确保脱离外部 CSS 也能正确渲染
      const clone = src.cloneNode(true);
      inlineAllComputedStyles(src, clone);
      clone.querySelectorAll('img').forEach(img => {
        img.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='60'%3E%3Crect width='80' height='60' fill='%23ddd'/%3E%3Ctext x='40' y='35' text-anchor='middle' fill='%23888' font-size='10'%3E图片%3C/text%3E%3C/svg%3E";
      });
      return clone.innerHTML;
    }

    // 构建面包屑：从当前元素向上到 content 的祖先链（用于层级导航）
    function getAncestors(el) {
      const ancestors = [];
      let cur = el;
      while (cur && cur !== content && content.contains(cur)) {
        ancestors.unshift(cur);
        cur = cur.parentElement;
      }
      return ancestors;
    }

    function showOverlay(clientX, clientY, clickedEl) {
      removeOverlay();
      hideHighlight();

      const BLOCK_TYPES = [
        ['p',                 'paragraph · 正文段落'],
        ['h1',                'H1 · 一级标题'],
        ['h2',                'H2 · 二级标题'],
        ['h3',                'H3 · 三级标题'],
        ['strong',            'inline · 行内加粗'],
        ['blockquote_wrapper','quote · 引用块外层'],
        ['blockquote_text',   'quote · 引用块文字'],
        ['code_wrapper',      'code · 代码块外层'],
        ['code_text',         'code · 代码文字'],
        ['hr',                'divider · 分割线'],
        ['ul',                'bulleted_list · 无序列表'],
        ['li_ul',             'bulleted_list · 无序列表项'],
        ['ol',                'numbered_list · 有序列表'],
        ['li_ol',             'numbered_list · 有序列表项'],
        ['img_wrapper',       'image · 图片容器'],
        ['img',               'image · 图片样式'],
      ];
      const opts = BLOCK_TYPES.map(([v, l]) =>
        `<option value="${v}">${v} — ${l}</option>`).join('');

      const ancestors = getAncestors(clickedEl);
      let selectedEl  = clickedEl;

      const ov = document.createElement('div');
      ov.id = '__wzx_overlay__';
      ov.style.cssText = 'position:fixed;z-index:2147483647;background:white;border:1px solid #ccc;border-radius:10px;padding:12px;box-shadow:0 6px 28px rgba(0,0,0,.22);width:460px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;';
      const left = Math.min(clientX + 12, window.innerWidth  - 472);
      const top  = Math.min(clientY + 12, window.innerHeight - 360);
      ov.style.left = left + 'px';
      ov.style.top  = top  + 'px';

      function renderBreadcrumb() {
        return ancestors.map((a, i) => {
          const tag  = a.tagName.toLowerCase();
          const isSel = a === selectedEl;
          const bg   = isSel ? '#07a11d' : '#f0f0f0';
          const col  = isSel ? '#fff'    : '#444';
          return `<span data-idx="${i}" style="cursor:pointer;background:${bg};color:${col};padding:2px 6px;border-radius:3px;font:bold 11px monospace;white-space:nowrap;">${tag}</span>`;
        }).join('<span style="color:#bbb;margin:0 1px;font-size:11px;">›</span>');
      }

      function buildOverlayHTML() {
        const previewText = (selectedEl.textContent || '').trim().slice(0, 60) || '[无文字内容]';
        return `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-size:12px;font-weight:600;color:#222;">选择样式类型</span>
            <button id="__wzx_cancel__" style="background:none;border:none;cursor:pointer;font-size:16px;color:#aaa;line-height:1;padding:0 2px;">×</button>
          </div>
          <div style="margin-bottom:6px;">
            <div style="font-size:10px;color:#999;margin-bottom:3px;">层级导航（点击选择要提取的元素层级）</div>
            <div id="__wzx_breadcrumb__" style="display:flex;flex-wrap:wrap;gap:3px;align-items:center;padding:4px 6px;background:#f8f8f8;border-radius:4px;border:1px solid #e8e8e8;">
              ${renderBreadcrumb()}
            </div>
          </div>
          <div style="font-size:11px;background:#f5f5f5;padding:3px 7px;border-radius:3px;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#555;">${previewText}</div>
          <select id="__wzx_type__" style="width:100%;margin-bottom:8px;padding:5px 4px;border:1px solid #ddd;border-radius:4px;font-size:12px;color:#333;">
            <option value="">— 选择类型 —</option>
            ${opts}
          </select>
          <div id="__wzx_preview_area__" style="display:none;margin-bottom:8px;">
            <div style="display:flex;gap:1px;border:1px solid #e0e0e0;border-radius:6px;overflow:hidden;">
              <div style="flex:1;min-width:0;">
                <div style="background:#f0f0f0;padding:3px 6px;font-size:10px;color:#666;text-align:center;border-bottom:1px solid #e0e0e0;">原始效果</div>
                <div id="__wzx_left__" style="padding:6px;overflow:auto;max-height:150px;background:#fff;"></div>
              </div>
              <div style="width:1px;background:#e0e0e0;"></div>
              <div style="flex:1;min-width:0;">
                <div style="background:#e8f5e9;padding:3px 6px;font-size:10px;color:#2a6b2a;text-align:center;border-bottom:1px solid #c8e6c9;">提取效果</div>
                <div id="__wzx_right__" style="padding:6px;overflow:auto;max-height:150px;background:#fff;"></div>
              </div>
            </div>
            <div id="__wzx_props__" style="margin-top:5px;background:#fafafa;border:1px solid #eee;border-radius:4px;padding:4px 6px;font-size:10px;color:#555;font-family:monospace;max-height:60px;overflow:auto;line-height:1.5;"></div>
          </div>
          <button id="__wzx_confirm__" disabled style="width:100%;padding:6px;background:#ccc;color:white;border:none;border-radius:4px;cursor:not-allowed;font-size:12px;font-weight:600;">确认保存</button>`;
      }

      ov.innerHTML = buildOverlayHTML();
      document.body.appendChild(ov);

      function resetPreview() {
        const previewArea = ov.querySelector('#__wzx_preview_area__');
        const confirmBtn  = ov.querySelector('#__wzx_confirm__');
        const typeSelect  = ov.querySelector('#__wzx_type__');
        if (previewArea) previewArea.style.display = 'none';
        if (confirmBtn)  { confirmBtn.disabled = true; confirmBtn.style.background = '#ccc'; confirmBtn.style.cursor = 'not-allowed'; }
        if (typeSelect)  typeSelect.value = '';
      }

      function bindEvents() {
        const typeSelect  = ov.querySelector('#__wzx_type__');
        const confirmBtn  = ov.querySelector('#__wzx_confirm__');
        const previewArea = ov.querySelector('#__wzx_preview_area__');
        const leftPanel   = ov.querySelector('#__wzx_left__');
        const rightPanel  = ov.querySelector('#__wzx_right__');
        const propsPanel  = ov.querySelector('#__wzx_props__');
        const breadcrumb  = ov.querySelector('#__wzx_breadcrumb__');

        // 面包屑层级切换
        breadcrumb.addEventListener('click', e => {
          const span = e.target.closest('[data-idx]');
          if (!span) return;
          selectedEl = ancestors[+span.dataset.idx];
          // 高亮显示当前选中层级
          showHighlight(selectedEl);
          // 刷新面包屑 + 预览文本
          breadcrumb.innerHTML = renderBreadcrumb();
          const previewDiv = breadcrumb.parentElement.nextElementSibling;
          if (previewDiv) previewDiv.textContent = (selectedEl.textContent || '').trim().slice(0, 60) || '[无文字内容]';
          resetPreview();
          bindEvents();
        });

        typeSelect.addEventListener('change', () => {
          const blockType = typeSelect.value;
          if (!blockType) { resetPreview(); return; }
          const tpl = extractTemplate(selectedEl, blockType);
          leftPanel.innerHTML = getOrigHtml(selectedEl);
          if (tpl.includes('{{content}}')) {
            // 用原始 contentEl 的真实内容填充，确保右侧与左侧可以直接对比
            rightPanel.innerHTML = tpl.replace('{{content}}', getActualContentHtml(selectedEl, blockType));
          } else {
            rightPanel.innerHTML = getSampleHtml(blockType, tpl);
          }
          if (tpl.includes('{{content}}')) {
            const len = tpl.length;
            propsPanel.textContent = `[HTML模板 ${len}字节] ` + tpl.slice(0, 200) + (len > 200 ? '…' : '');
          } else {
            const propLines = tpl ? tpl.split(';').filter(Boolean).map(s => s.trim()) : [];
            propsPanel.textContent = propLines.length ? propLines.join('\n') : '（未提取到属性）';
          }
          previewArea.style.display = 'block';
          confirmBtn.disabled = false;
          confirmBtn.style.background = '#07a11d';
          confirmBtn.style.cursor = 'pointer';
        });

        confirmBtn.addEventListener('click', () => {
          if (confirmBtn.disabled) return;
          const blockType = typeSelect.value;
          if (!blockType) return;
          const tpl = extractTemplate(selectedEl, blockType);
          removeOverlay();
          chrome.storage.local.get(['wechat_selections'], (data) => {
            const selections = data.wechat_selections || {};
            selections[blockType] = tpl;
            chrome.storage.local.set({ wechat_selections: selections });
          });
        });

        ov.querySelector('#__wzx_cancel__').addEventListener('click', removeOverlay);
      }

      bindEvents();
    }

    // mousemove + elementFromPoint：精确追踪光标下的元素（Chrome DevTools 同款方案）
    function onMousemove(e) {
      if (document.getElementById('__wzx_overlay__')) return;
      const target = document.elementFromPoint(e.clientX, e.clientY);
      if (!target || target === hlBox || target === hlBadge) return;
      if (!content.contains(target)) { hideHighlight(); return; }
      if (target === currentEl) return;
      showHighlight(target);
    }

    function onClick(e) {
      // 点在 overlay 或高亮层本身时忽略
      if (e.target.closest && (e.target.closest('#__wzx_overlay__') ||
          e.target === hlBox || e.target === hlBadge)) return;
      if (!content.contains(e.target)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showOverlay(e.clientX, e.clientY, currentEl || e.target);
    }

    document.addEventListener('mousemove', onMousemove, true);
    document.addEventListener('click',     onClick,     true);
    window.__wzxActive   = true;
    window.__wzxHandlers = { onMousemove, onClick };
    return 'ok';
  }

  function stopWechatSelectorFn() {
    document.getElementById('__wzx_overlay__')?.remove();
    document.getElementById('__wzx_hlbox__')?.remove();
    document.getElementById('__wzx_hlbadge__')?.remove();
    if (window.__wzxHandlers) {
      const { onMousemove, onClick } = window.__wzxHandlers;
      document.removeEventListener('mousemove', onMousemove, true);
      document.removeEventListener('click',     onClick,     true);
      window.__wzxHandlers = null;
    }
    window.__wzxActive = false;
  }

  async function startSelectionMode() {
    const result = await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func:   injectWechatSelectorFn,
    });
    const status = result[0]?.result;
    if (status === 'no_content') {
      showStatus('error', '未找到微信文章内容，请确认已打开公众号文章页面');
      return;
    }
    selectionModeActive = true;
    selectModeBtn.innerHTML = '<span class="btn-icon">⬛</span>退出选择模式';
    selectModeBtn.classList.add('btn--active');
    showStatus('loading', '请在文章中点击要分析的元素...');
  }

  async function stopSelectionMode() {
    await chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func:   stopWechatSelectorFn,
    }).catch(() => {});
    selectionModeActive = false;
    selectModeBtn.innerHTML = '<span class="btn-icon">🖱</span>进入选择模式';
    selectModeBtn.classList.remove('btn--active');
    statusBar.className = 'status-bar status-bar--hidden';
  }

  const BLOCK_LABELS = {
    p:                 'paragraph · 正文段落',
    h1:                'H1 · 一级标题',
    h2:                'H2 · 二级标题',
    h3:                'H3 · 三级标题',
    strong:            'inline · 行内加粗',
    blockquote_wrapper:'quote · 引用块外层',
    blockquote_text:   'quote · 引用块文字',
    code_wrapper:      'code · 代码块外层',
    code_text:         'code · 代码文字',
    hr:                'divider · 分割线',
    ul:                'bulleted_list · 无序列表',
    li_ul:             'bulleted_list · 无序列表项',
    ol:                'numbered_list · 有序列表',
    li_ol:             'numbered_list · 有序列表项',
    img_wrapper:       'image · 图片容器',
    img:               'image · 图片样式',
  };

  function updateMiniList(sel) {
    const keys = Object.keys(sel || {});
    if (!keys.length) {
      miniSelectedList.innerHTML = '';
      toSaveBtn.classList.add('hidden');
      return;
    }
    miniSelectedList.innerHTML = keys.map(k => `
      <div class="mini-block-item">
        <span class="mini-block-type">${k}</span>
        <span class="mini-block-label">${BLOCK_LABELS[k] || ''}</span>
        <button class="mini-block-remove" data-key="${k}">✕</button>
      </div>`).join('');
    miniSelectedList.querySelectorAll('.mini-block-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        chrome.storage.local.get(['wechat_selections'], (data) => {
          const s = data.wechat_selections || {};
          delete s[btn.dataset.key];
          chrome.storage.local.set({ wechat_selections: s });
        });
      });
    });
    toSaveBtn.classList.remove('hidden');
  }

  // 监听 storage 变化，实时更新列表
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.wechat_selections)
      updateMiniList(changes.wechat_selections.newValue);
  });

  selectModeBtn.addEventListener('click', async () => {
    if (selectionModeActive) await stopSelectionMode();
    else                     await startSelectionMode();
  });

  toSaveBtn.addEventListener('click', async () => {
    if (selectionModeActive) await stopSelectionMode();
    const data = await chrome.storage.local.get(['wechat_selections']);
    const sel = data.wechat_selections || {};
    if (!Object.keys(sel).length) return;
    lastExtracted = sel;
    renderExtractResults(sel);
    wechatNameInput.value = '';
    statusBar.className = 'status-bar status-bar--hidden';
    showWechatStep(2);
  });

  // 重新选择：清空已选块，回到 Step 1
  reExtractBtn.addEventListener('click', async () => {
    lastExtracted = null;
    await chrome.storage.local.set({ wechat_selections: {} });
    showWechatStep(1);
    statusBar.className = 'status-bar status-bar--hidden';
  });

  // 为 HTML 模板中含 {{content}} 的元素自动补充缺失的 CSS 属性
  // 只补充模板本身没有设置的属性，不覆盖用户提取的值
  function ensureStylesOnContentEl(htmlTpl, styleMap) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlTpl;
    const root = wrapper.firstElementChild;
    if (!root) return htmlTpl;

    // 找到 innerHTML === '{{content}}' 的元素
    function findTarget(el) {
      if ((el.innerHTML || '').trim() === '{{content}}') return el;
      for (const child of el.children) {
        const found = findTarget(child);
        if (found) return found;
      }
      return null;
    }
    const target = findTarget(root);
    if (!target) return htmlTpl;

    for (const [prop, val] of Object.entries(styleMap)) {
      if (!target.style.getPropertyValue(prop)) {
        target.style.setProperty(prop, val);
      }
    }
    return root.outerHTML;
  }

  // CSS 字符串合并：以 base 为底，extracted 覆盖同名属性（保留 base 中的布局属性）
  function mergeCssStrings(base, extracted) {
    const props = {};
    for (const part of (base || '').split(';')) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const k = part.slice(0, idx).trim().toLowerCase();
      const v = part.slice(idx + 1).trim();
      if (k && v) props[k] = v;
    }
    for (const part of (extracted || '').split(';')) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const k = part.slice(0, idx).trim().toLowerCase();
      const v = part.slice(idx + 1).trim();
      if (k && v) props[k] = v;
    }
    return Object.entries(props).map(([k, v]) => `${k}:${v}`).join(';');
  }

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

      // 以默认样式为底，覆盖用户提取的值：
      // - HTML 模板（含 {{content}}）：直接替换，完整复刻微信结构
      // - CSS 字符串（行内类型）：与默认 CSS 合并，保留布局属性
      // 段落类块自动补充换行（white-space:pre-line）和空行（padding-bottom:1em）属性
      const PARA_LINE_DEFAULTS = {
        p:               { 'white-space': 'pre-line', 'padding-bottom': '1em' },
        blockquote_text: { 'white-space': 'pre-line', 'padding-bottom': '0.5em' },
        li_ul:           { 'white-space': 'pre-line' },
        li_ol:           { 'white-space': 'pre-line' },
      };

      const s = Object.assign({}, DEFAULT_S);
      for (const [key, value] of Object.entries(lastExtracted)) {
        if (value.includes('{{content}}')) {
          // HTML 模板：自动注入段落类块的换行和空行属性
          const lineDefaults = PARA_LINE_DEFAULTS[key];
          s[key] = lineDefaults ? ensureStylesOnContentEl(value, lineDefaults) : value;
        } else {
          // CSS 字符串：合并默认值，同时确保段落类块有换行和空行属性
          const lineDefaults = PARA_LINE_DEFAULTS[key];
          const lineDefaultsCss = lineDefaults
            ? Object.entries(lineDefaults).map(([k, v]) => `${k}:${v}`).join(';')
            : '';
          const base = lineDefaultsCss
            ? mergeCssStrings(lineDefaultsCss, DEFAULT_S[key] || '')
            : (DEFAULT_S[key] || '');
          s[key] = base ? mergeCssStrings(base, value) : value;
        }
      }
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

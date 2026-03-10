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

    let hoveredEl = null;

    function getInlineProp(styleStr, prop) {
      for (const part of styleStr.split(';')) {
        const idx = part.indexOf(':');
        if (idx < 0) continue;
        if (part.slice(0, idx).trim().toLowerCase() === prop)
          return part.slice(idx + 1).trim();
      }
      return null;
    }

    // 文字型 key：只取 computed 文字属性，不向上收集容器装饰（避免把外层 border-left 错误归属到文字样式）
    const TEXT_KEYS = new Set(['p','strong','em','blockquote_text','code_text','img','li_p']);

    function extractCSS(el, blockType) {
      const TPROPS = ['font-size','font-family','color','line-height',
                      'letter-spacing','text-align','font-weight'];
      // 容器型属性：向上遍历祖先 inline-style 收集
      const CPROPS = ['border-left','border-right','border-top','border-bottom','border',
                      'background-color','border-radius','box-shadow',
                      'padding','margin','overflow','white-space'];
      const cs = window.getComputedStyle(el);
      const parts = {};
      for (const p of TPROPS) {
        const v = cs.getPropertyValue(p).trim();
        if (!v) continue;
        if (p === 'font-weight' && (v === '400' || v === 'normal')) continue;
        if (p === 'text-align' && (v === 'start' || v === '-webkit-auto')) continue;
        if (p === 'letter-spacing' && v === 'normal') continue;
        parts[p] = v;
      }
      // 容器型 key 才向上收集装饰属性（标题的 border-bottom、引用块的 border-left 等）
      if (!TEXT_KEYS.has(blockType)) {
        let cur = el;
        while (cur && cur !== content.parentElement) {
          const inlineStyle = cur.getAttribute('style') || '';
          if (inlineStyle) {
            for (const prop of CPROPS) {
              if (parts[prop]) continue;
              const val = getInlineProp(inlineStyle, prop);
              // 过滤掉空值、纯零值（保留 "0 auto" 这类有意义的值）
              if (val && val.trim() !== '0' && val.trim() !== 'none')
                parts[prop] = val;
            }
          }
          cur = cur.parentElement;
        }
      }
      return Object.entries(parts).map(([k, v]) => `${k}:${v}`).join(';');
    }

    function removeOverlay() {
      const ov = document.getElementById('__wzx_overlay__');
      if (ov) ov.remove();
    }

    function showOverlay(clientX, clientY, el) {
      removeOverlay();
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
      const preview = (el.textContent || '').trim().slice(0, 40) || '[无文字内容]';

      const ov = document.createElement('div');
      ov.id = '__wzx_overlay__';
      ov.innerHTML = `
        <div style="font-size:11px;color:#888;margin-bottom:4px;">选择样式类型</div>
        <div style="font-size:11px;background:#f5f5f5;padding:3px 6px;border-radius:3px;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#333;">${preview}</div>
        <select id="__wzx_type__" style="width:100%;margin-bottom:8px;padding:5px 4px;border:1px solid #ddd;border-radius:4px;font-size:12px;color:#333;">
          <option value="">— 选择类型 —</option>
          ${opts}
        </select>
        <div style="display:flex;gap:6px;">
          <button id="__wzx_confirm__" style="flex:1;padding:5px;background:#07a11d;color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;">确认</button>
          <button id="__wzx_cancel__"  style="flex:1;padding:5px;background:#f0f0f0;color:#555;border:none;border-radius:4px;cursor:pointer;font-size:12px;">取消</button>
        </div>`;
      ov.style.cssText = 'position:fixed;z-index:2147483647;background:white;border:1px solid #ccc;border-radius:8px;padding:12px;box-shadow:0 4px 20px rgba(0,0,0,.18);width:240px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';
      const left = Math.min(clientX + 12, window.innerWidth - 256);
      const top  = Math.min(clientY + 12, window.innerHeight - 190);
      ov.style.left = left + 'px';
      ov.style.top  = top  + 'px';

      ov.querySelector('#__wzx_confirm__').addEventListener('click', () => {
        const sel = ov.querySelector('#__wzx_type__');
        const blockType = sel.value;
        if (!blockType) { sel.style.border = '1px solid red'; return; }
        const css = extractCSS(el, blockType);
        removeOverlay();
        if (hoveredEl) { hoveredEl.style.outline = ''; hoveredEl = null; }
        chrome.storage.local.get(['wechat_selections'], (data) => {
          const selections = data.wechat_selections || {};
          selections[blockType] = css;
          chrome.storage.local.set({ wechat_selections: selections });
        });
      });
      ov.querySelector('#__wzx_cancel__').addEventListener('click', removeOverlay);
      document.body.appendChild(ov);
    }

    function onMouseover(e) {
      if (document.getElementById('__wzx_overlay__')) return;
      if (hoveredEl) hoveredEl.style.outline = '';
      hoveredEl = e.target;
      hoveredEl.style.outline = '2px dashed rgba(7,161,29,.6)';
    }
    function onMouseout() {
      if (document.getElementById('__wzx_overlay__')) return;
      if (hoveredEl) { hoveredEl.style.outline = ''; hoveredEl = null; }
    }
    function onClick(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showOverlay(e.clientX, e.clientY, e.target);
    }

    content.addEventListener('mouseover', onMouseover, true);
    content.addEventListener('mouseout',  onMouseout,  true);
    content.addEventListener('click',     onClick,     true);
    window.__wzxActive   = true;
    window.__wzxHandlers = { onMouseover, onMouseout, onClick, content };
    return 'ok';
  }

  function stopWechatSelectorFn() {
    const ov = document.getElementById('__wzx_overlay__');
    if (ov) ov.remove();
    if (window.__wzxHandlers) {
      const { onMouseover, onMouseout, onClick, content } = window.__wzxHandlers;
      content.removeEventListener('mouseover', onMouseover, true);
      content.removeEventListener('mouseout',  onMouseout,  true);
      content.removeEventListener('click',     onClick,     true);
      window.__wzxHandlers = null;
    }
    document.querySelectorAll('[style*="outline"]').forEach(el => { el.style.outline = ''; });
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

      // 逐 key 合并：保留 DEFAULT_S 的布局属性（display/width/margin 等），
      // 用提取值覆盖视觉属性（color/font-size/border/background 等）
      const s = Object.assign({}, DEFAULT_S);
      for (const [key, css] of Object.entries(lastExtracted)) {
        s[key] = DEFAULT_S[key] ? mergeCssStrings(DEFAULT_S[key], css) : css;
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

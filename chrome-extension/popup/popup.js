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
  const convertPanel = document.getElementById('convert-panel');
  const wechatPanel  = document.getElementById('wechat-panel');
  const extractBtn   = document.getElementById('extractBtn');
  const wechatNameInput = document.getElementById('wechat-tpl-name');

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
      const isWechat  = url.includes('mp.weixin.qq.com') && url.includes('/s/');

      if (isWechat) {
        setBadge('wechat', '微信文章');
        convertPanel.classList.add('hidden');
        wechatPanel.classList.remove('hidden');
        return;
      }

      // 回到 Notion/飞书模式时确保面板正确显示
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

  // 在公众号页面 MAIN world 中执行，提取各类元素的 inline style
  function wechatExtractFn() {
    const content = document.querySelector('#js_content') ||
                    document.querySelector('.rich_media_content');
    if (!content) return null;

    const result = {};
    const all    = [...content.querySelectorAll('[style]')];

    function gs(el) { return el ? (el.getAttribute('style') || '').trim() : ''; }

    // ── 段落：有文本内容、无块级子元素、非大号加粗
    const paraEls = all.filter(el => {
      const tag = el.tagName.toLowerCase();
      if (!['p', 'section'].includes(tag)) return false;
      if (!el.getAttribute('style')) return false;
      if (el.textContent.trim().length < 25) return false;
      const hasBlock = [...el.children].some(c =>
        ['section','div','p','ul','ol','blockquote','pre','table'].includes(c.tagName.toLowerCase())
      );
      if (hasBlock) return false;
      const isBoldLarge = (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold')
                       && parseFloat(el.style.fontSize) > 17;
      return !isBoldLarge;
    });
    if (paraEls[0]) result.p = gs(paraEls[0]);

    // ── 标题：加粗 + 较大字号，按字号降序，取最多 3 级
    const hCands = all.filter(el => {
      if (!el.getAttribute('style')) return false;
      const txt = el.textContent.trim();
      if (txt.length < 2 || txt.length > 80) return false;
      const bold = parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold';
      return bold && parseFloat(el.style.fontSize) >= 17;
    }).sort((a, b) => parseFloat(b.style.fontSize) - parseFloat(a.style.fontSize));
    const seenFS = new Set(), hs = [];
    for (const el of hCands) {
      const fs = el.style.fontSize;
      if (!seenFS.has(fs)) { seenFS.add(fs); hs.push(el); }
      if (hs.length >= 3) break;
    }
    // 也尝试语义标签 h1/h2/h3
    ['h1','h2','h3'].forEach((tag, i) => {
      if (!hs[i]) { const el = content.querySelector(`${tag}[style]`); if (el) hs[i] = el; }
    });
    if (hs[0]) result.h1 = gs(hs[0]);
    if (hs[1]) result.h2 = gs(hs[1]);
    if (hs[2]) result.h3 = gs(hs[2]);

    // ── 加粗行内
    const strongEl = content.querySelector('strong[style]') ||
      all.find(el => el.tagName === 'SPAN' &&
        (parseInt(el.style.fontWeight) >= 600 || el.style.fontWeight === 'bold'));
    if (strongEl) result.strong = gs(strongEl);

    // ── 引用块（含 border-left 或 blockquote 标签）
    const bqEl = content.querySelector('blockquote[style]') ||
      all.find(el => {
        const s = el.getAttribute('style') || '';
        return s.includes('border-left') && el.textContent.trim().length > 5;
      });
    if (bqEl) {
      result.blockquote_wrapper = gs(bqEl);
      const inner = bqEl.querySelector('[style]');
      if (inner) result.blockquote_text = gs(inner);
    }

    // ── 分割线
    const hrEl = content.querySelector('hr[style]');
    if (hrEl) result.hr = gs(hrEl);

    // ── 列表
    const ulEl = content.querySelector('ul[style]');
    const olEl = content.querySelector('ol[style]');
    if (ulEl) { result.ul = gs(ulEl); const li = ulEl.querySelector('li[style]'); if (li) result.li_ul = gs(li); }
    if (olEl) { result.ol = gs(olEl); const li = olEl.querySelector('li[style]'); if (li) result.li_ol = gs(li); }

    // ── 图片
    const imgEl = content.querySelector('img[style]');
    if (imgEl) {
      result.img = gs(imgEl);
      const par = imgEl.parentElement;
      if (par && par !== content && par.getAttribute('style')) result.img_wrapper = gs(par);
    }

    // ── 代码块
    const preEl = content.querySelector('pre[style]');
    if (preEl) result.code_wrapper = gs(preEl);
    else {
      const monoEl = all.find(el => {
        const s = (el.getAttribute('style') || '').toLowerCase();
        return s.includes('monospace') || s.includes('consolas') || s.includes('menlo') || s.includes('courier');
      });
      if (monoEl) result.code_wrapper = gs(monoEl);
    }
    const codeEl = content.querySelector('code[style]');
    if (codeEl) result.code_text = gs(codeEl);

    return Object.keys(result).length > 0 ? result : null;
  }

  extractBtn.addEventListener('click', async () => {
    const name = wechatNameInput.value.trim();
    if (!name) { showStatus('error', '请先输入模板名称'); return; }

    extractBtn.disabled = true;
    showStatus('loading', '正在提取排版风格...');

    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId: currentTab.id },
        world:  'MAIN',
        func:   wechatExtractFn,
      });

      const extracted = results[0]?.result;
      if (!extracted) throw new Error('未能提取到样式，请确认文章已完全加载');

      // 获取最新模板列表再追加，避免覆盖
      const templates = await fetchServerTemplates().catch(() => [...loadedTemplates]);
      if (templates.find(t => t.name === name)) {
        throw new Error(`模板「${name}」已存在，请换个名称`);
      }

      // 以 DEFAULT_S 为底，仅覆盖提取到的 key
      const s = Object.assign({}, DEFAULT_S, extracted);
      templates.push({ name, s });

      const res = await fetch(`${SERVER_URL}/api/templates`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ templates }),
      });
      if (!res.ok) throw new Error(`服务器错误 ${res.status}`);

      renderTemplateSelector(templates, name);
      applyTemplate(name);
      wechatNameInput.value = '';
      showStatus('success', `「${name}」已保存，可在网页端编辑细节`);
      setTimeout(() => { statusBar.className = 'status-bar status-bar--hidden'; }, 4000);
    } catch (err) {
      showStatus('error', err.message);
    }
    extractBtn.disabled = false;
  });

  init();

  // 切换 Tab 时重新检测页面类型
  chrome.tabs.onActivated.addListener(() => init());
})();

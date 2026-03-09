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

  let formattedHtml     = '';
  let formattedSegments = [];
  let currentTab        = null;

  // ── 初始化 ────────────────────────────────────────────────────

  // 显示当前版本号
  const manifest = chrome.runtime.getManifest();
  document.getElementById('appSub').textContent =
    `v${manifest.version} · Notion / 飞书 → 微信公众号`;

  async function init() {
    // 每次切换 tab 都先重置按钮状态，避免上一次 disabled 状态残留
    convertBtn.disabled = false;
    setBadge('unknown', '检测中...');
    statusBar.className = 'status-bar status-bar--hidden';

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      const url = tab.url || '';
      const isNotion = url.includes('notion.so') || url.includes('notion.site');
      const isFeishu = url.includes('feishu.cn') || url.includes('larksuite.com');

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
      // 1. 解析文档
      const resp = await sendMessage(currentTab.id, { action: 'parse' });
      if (!resp.success) throw new Error(resp.error || '解析失败');

      // 2. 图片转 Base64（默认开启）
      showStatus('loading', '正在转换图片...');
      await convertImages(currentTab.id, resp.data.blocks);

      // 3. 格式化 & 渲染
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

    // blob: URL 只在 tab 上下文有效，跳过 background script 直接用 executeScript
    const regularUrls = urls.filter(u => !u.startsWith('blob:'));
    const blobUrls    = urls.filter(u =>  u.startsWith('blob:'));

    let base64Map = {};

    // 普通 URL 走 background script，5s 超时
    if (regularUrls.length > 0) {
      try {
        const resp = await Promise.race([
          new Promise(resolve => {
            chrome.runtime.sendMessage({ action: 'fetchImagesAsBase64', urls: regularUrls }, resolve);
          }),
          new Promise(resolve => setTimeout(() => resolve(null), 5000)),
        ]);
        if (resp && resp.success) base64Map = resp.data || {};
      } catch (_) {}
    }

    // blob URL + 未成功的普通 URL → executeScript MAIN world，10s 超时
    const remaining = [...blobUrls, ...regularUrls.filter(u => !base64Map[u])];
    if (remaining.length > 0) {
      try {
        const execPromise = chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: async (imageUrls) => {
            const toBase64 = (url) => fetch(url, { credentials: 'include' })
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
        const results = await Promise.race([
          execPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 10000)),
        ]);
        Object.assign(base64Map, (results && results[0] && results[0].result) || {});
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

  init();

  // 切换 Tab 时重新检测页面类型
  chrome.tabs.onActivated.addListener(() => init());
})();

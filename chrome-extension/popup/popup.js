// Popup 逻辑
// 负责与 content script 通信、触发转换、展示预览、复制到剪贴板

(function () {
  'use strict';

  // ── DOM 引用 ──────────────────────────────────────────────────
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
  const base64Toggle = document.getElementById('base64Toggle');

  let formattedHtml = '';
  let currentTab    = null;

  // 读取持久化偏好
  chrome.storage.local.get(['base64'], (prefs) => {
    if (prefs.base64 !== undefined) base64Toggle.checked = prefs.base64;
  });
  base64Toggle.addEventListener('change', () => {
    chrome.storage.local.set({ base64: base64Toggle.checked });
  });

  // ── 初始化：检测页面 + 自动重注入兜底 ──────────────────────────

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      const url = tab.url || '';
      const isNotion = url.includes('notion.so') || url.includes('notion.site');
      const isFeishu = url.includes('feishu.cn') || url.includes('larksuite.com');

      if (!isNotion && !isFeishu) {
        setBadge('unsupported', '不支持');
        convertBtn.disabled = true;
        showStatus('error', '⚠️ 请在 Notion 或飞书文章页面使用本插件');
        return;
      }

      // 先 ping
      let resp = await pingTab(tab.id);

      // ping 失败 → 自动重注入（扩展更新后未刷新页面时常见）
      if (!resp) {
        showStatus('loading', '正在连接页面...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [
              'content/notion-parser.js',
              'content/feishu-parser.js',
              'content/content.js',
            ],
          });
          await sleep(200);
          resp = await pingTab(tab.id);
        } catch (_) {}
      }

      if (!resp) {
        setBadge('unknown', '连接失败');
        convertBtn.disabled = true;
        showStatus('error', '⚠️ 无法连接页面，请手动刷新后重试');
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

  function pingTab(tabId) {
    return new Promise(resolve => {
      chrome.tabs.sendMessage(tabId, { action: 'ping' }, resp => {
        resolve(chrome.runtime.lastError ? null : resp);
      });
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── 转换逻辑 ──────────────────────────────────────────────────

  convertBtn.addEventListener('click', () => {
    if (!currentTab) return;

    convertBtn.disabled = true;
    copyBtn.disabled = true;
    imageNote.classList.add('hidden');

    const withBase64 = base64Toggle.checked;
    showStatus('loading', withBase64 ? '⏳ 正在解析并转换图片...' : '⏳ 正在解析文档...');
    setPreviewLoading();

    chrome.tabs.sendMessage(
      currentTab.id,
      { action: 'parse', convertImages: withBase64 },
      (resp) => {
        convertBtn.disabled = false;

        if (chrome.runtime.lastError) {
          showStatus('error', '❌ 通信失败，请刷新页面后重试');
          resetPreview();
          return;
        }

        if (!resp || !resp.success) {
          showStatus('error', '❌ ' + ((resp && resp.error) || '未知错误'));
          resetPreview();
          return;
        }

        try {
          formattedHtml = formatToWechat(resp.data);
          renderPreview(formattedHtml, resp.data);
          copyBtn.disabled = false;

          const hasImages = resp.data.blocks.some(b => b.type === 'image');
          if (hasImages) {
            imageNote.classList.remove('hidden');
            const hasBase64 = resp.data.blocks.some(b => b.type === 'image' && b.base64);
            imageNoteTxt.textContent = hasBase64
              ? '图片已转 Base64，粘贴后可离线显示'
              : '图片 URL 已包含，需在微信编辑器中手动上传';
          }

          showStatus('success', '✅ 转换成功，点击「复制内容」粘贴到微信编辑器');
        } catch (fmtErr) {
          showStatus('error', '❌ 格式化失败：' + fmtErr.message);
          resetPreview();
        }
      }
    );
  });

  // ── 复制逻辑 ──────────────────────────────────────────────────

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
        copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 复制内容';
      }, 2000);
    } catch (err) {
      showStatus('error', '❌ 复制失败：' + err.message);
    }
  });

  // ── 剪贴板：contenteditable + execCommand（WeChat 兼容最佳）──

  async function copyHtmlToClipboard(html) {
    // 方案 A：将 HTML 渲染到 contenteditable 元素中，再 execCommand('copy')
    // 这是与微信公众号编辑器最兼容的方式（与 Markdown Nice 等工具相同）
    const container = document.createElement('div');
    container.contentEditable = 'true';
    container.style.cssText = [
      'position:fixed', 'top:0', 'left:0',
      'width:677px',    // 微信文章宽度，保证布局正确渲染
      'height:1px',
      'overflow:hidden',
      'opacity:0.01',   // 不用 0 / hidden，确保浏览器真实渲染
      'pointer-events:none',
      'z-index:-9999',
    ].join(';');
    container.innerHTML = html;
    document.body.appendChild(container);

    container.focus();
    const range = document.createRange();
    range.selectNodeContents(container);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    let ok = false;
    try { ok = document.execCommand('copy'); } catch (_) {}

    sel.removeAllRanges();
    document.body.removeChild(container);

    if (ok) return;

    // 方案 B：Clipboard API 降级（部分浏览器/系统不支持 execCommand）
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html],            { type: 'text/html' }),
          'text/plain': new Blob([stripTags(html)], { type: 'text/plain' }),
        }),
      ]);
      return;
    }

    throw new Error('浏览器不支持复制，请手动选中预览内容后 Ctrl+C');
  }

  function stripTags(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // ── UI 辅助 ───────────────────────────────────────────────────

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
    preview.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon spinning">⚙️</div>
        <div class="empty-text">正在解析并排版...</div>
      </div>`;
  }

  function resetPreview() {
    preview.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <div class="empty-text">转换失败，请重试</div>
      </div>`;
    stats.textContent = '';
    formattedHtml = '';
  }

  function renderPreview(html, data) {
    preview.innerHTML = html;

    // 图片加载失败时显示占位（popup 无 Notion cookie，原始 URL 会 403）
    preview.querySelectorAll('img').forEach(img => {
      if (!img.src.startsWith('data:')) {
        img.addEventListener('error', () => {
          const ph = document.createElement('div');
          ph.className = 'img-placeholder';
          ph.innerHTML = '🖼 图片已包含在复制内容中，微信编辑器中可正常显示';
          img.parentNode && img.parentNode.replaceChild(ph, img);
        });
      }
    });

    const charCount  = stripTags(html).length;
    const blockCount = (data.blocks || []).length;
    stats.textContent = `${blockCount} 个块 · ${charCount.toLocaleString()} 字`;
  }

  // ── 启动 ──────────────────────────────────────────────────────
  init();

})();

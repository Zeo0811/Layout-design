// Popup 逻辑
// 负责与 content script 通信、触发转换、展示预览、复制到剪贴板
// 新增：主题切换、图片 Base64 开关

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
  const themeNameEl  = document.getElementById('themeName');
  const swatches     = document.querySelectorAll('.swatch');

  let formattedHtml = '';
  let currentTab    = null;
  let selectedTheme = 'wechat';

  // ── 主题初始化 ─────────────────────────────────────────────────

  const THEME_NAMES = { wechat: '微信绿', blue: '商务蓝', purple: '优雅紫' };

  function applyTheme(themeName) {
    selectedTheme = themeName;
    themeNameEl.textContent = THEME_NAMES[themeName] || themeName;
    swatches.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });
    chrome.storage.local.set({ theme: themeName });
  }

  swatches.forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme));
  });

  // 读取存储的偏好
  chrome.storage.local.get(['theme', 'base64'], (prefs) => {
    if (prefs.theme) applyTheme(prefs.theme);
    if (prefs.base64 !== undefined) base64Toggle.checked = prefs.base64;
  });

  base64Toggle.addEventListener('change', () => {
    chrome.storage.local.set({ base64: base64Toggle.checked });
  });

  // ── 初始化：检测当前页面类型 ───────────────────────────────────

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          setBadge('unknown', '不支持');
          convertBtn.disabled = true;
          showStatus('error', '⚠️ 请在 Notion 或飞书文章页面使用本插件');
          return;
        }

        const { pageType } = resp;
        if (pageType === 'notion') {
          setBadge('notion', 'Notion');
        } else if (pageType === 'feishu') {
          setBadge('feishu', '飞书');
        } else {
          setBadge('unsupported', '不支持');
          convertBtn.disabled = true;
          showStatus('error', '⚠️ 当前页面不是 Notion 或飞书文档');
        }
      });
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
    imageNote.classList.add('hidden');

    const withBase64 = base64Toggle.checked;
    const loadingMsg = withBase64 ? '⏳ 正在解析并转换图片...' : '⏳ 正在解析文档...';
    showStatus('loading', loadingMsg);
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
          formattedHtml = formatToWechat(resp.data, selectedTheme);
          renderPreview(formattedHtml, resp.data);
          copyBtn.disabled = false;

          // 图片提示
          const hasImages = resp.data.blocks.some(b => b.type === 'image');
          if (hasImages) {
            imageNote.classList.remove('hidden');
            const hasBase64 = resp.data.blocks.some(b => b.type === 'image' && b.base64);
            imageNoteTxt.textContent = hasBase64
              ? '图片已转 Base64，粘贴后可离线显示'
              : '图片需在微信编辑器中手动上传替换';
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

      const origText = copyBtn.querySelector('.btn-icon').nextSibling.textContent;
      copyBtn.classList.add('btn--copied');
      copyBtn.querySelector('.btn-icon').textContent = '✅';
      copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 已复制！';

      setTimeout(() => {
        copyBtn.classList.remove('btn--copied');
        copyBtn.querySelector('.btn-icon').textContent = '📋';
        copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 复制内容';
      }, 2000);
    } catch (err) {
      showStatus('error', '❌ 复制失败：' + err.message + '，请尝试手动选择复制');
    }
  });

  // ── 剪贴板 ────────────────────────────────────────────────────

  async function copyHtmlToClipboard(html) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob     = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([stripHtmlTags(html)], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ]);
      return;
    }

    // 降级方案
    const el = document.createElement('div');
    el.innerHTML = html;
    el.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
    document.body.appendChild(el);
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand('copy');
    sel.removeAllRanges();
    document.body.removeChild(el);
  }

  function stripHtmlTags(html) {
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
    statusIcon.textContent =
      type === 'loading' ? '⏳' :
      type === 'success' ? '✅' : '❌';
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
    const charCount  = stripHtmlTags(html).length;
    const blockCount = (data.blocks || []).length;
    stats.textContent = `${blockCount} 个块 · ${charCount.toLocaleString()} 字`;
  }

  // ── 启动 ──────────────────────────────────────────────────────
  init();

})();

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

      // 先尝试 ping
      let resp = await pingTab(tab.id);

      // ping 失败 → 自动重注入 content scripts（常见于扩展更新后未刷新页面）
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

      // 隐藏注入时的 loading 提示
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

  // ── 剪贴板 ────────────────────────────────────────────────────

  async function copyHtmlToClipboard(html) {
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html':  new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([stripTags(html)], { type: 'text/plain' }),
        }),
      ]);
      return;
    }
    // 降级
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
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon spinning">⚙️</div><div class="empty-text">正在解析并排版...</div></div>`;
  }

  function resetPreview() {
    preview.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><div class="empty-text">转换失败，请重试</div></div>`;
    stats.textContent = '';
    formattedHtml = '';
  }

  function renderPreview(html, data) {
    preview.innerHTML = html;
    const charCount  = stripTags(html).length;
    const blockCount = (data.blocks || []).length;
    stats.textContent = `${blockCount} 个块 · ${charCount.toLocaleString()} 字`;
  }

  // ── 启动 ──────────────────────────────────────────────────────
  init();

})();

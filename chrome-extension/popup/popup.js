// Popup 逻辑
// 负责与 content script 通信、触发转换、展示预览、复制到剪贴板

(function () {
  'use strict';

  // DOM 引用
  const badge       = document.getElementById('badge');
  const convertBtn  = document.getElementById('convertBtn');
  const copyBtn     = document.getElementById('copyBtn');
  const statusBar   = document.getElementById('statusBar');
  const statusIcon  = document.getElementById('statusIcon');
  const statusText  = document.getElementById('statusText');
  const preview     = document.getElementById('preview');
  const stats       = document.getElementById('stats');
  const imageNote   = document.getElementById('imageNote');

  let formattedHtml = '';   // 当前转换结果（带内联样式的 HTML）
  let currentTab    = null;

  // ── 初始化：检测当前页面类型 ──────────────────────────────────

  async function init() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      currentTab = tab;

      // 向 content script 发送 ping
      chrome.tabs.sendMessage(tab.id, { action: 'ping' }, (resp) => {
        if (chrome.runtime.lastError || !resp) {
          setBadge('unknown', '不支持');
          convertBtn.disabled = true;
          showStatus('error', '⚠️ 请在 Notion 或飞书文章页面使用本插件');
          return;
        }

        const pageType = resp.pageType;

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

  // ── 转换逻辑 ─────────────────────────────────────────────────

  convertBtn.addEventListener('click', async () => {
    if (!currentTab) return;

    convertBtn.disabled = true;
    copyBtn.disabled = true;
    showStatus('loading', '⏳ 正在解析文档...');
    setPreviewLoading();

    try {
      chrome.tabs.sendMessage(currentTab.id, { action: 'parse' }, (resp) => {
        convertBtn.disabled = false;

        if (chrome.runtime.lastError) {
          showStatus('error', '❌ 通信失败，请刷新页面后重试');
          resetPreview();
          return;
        }

        if (!resp || !resp.success) {
          const msg = (resp && resp.error) || '未知错误';
          showStatus('error', '❌ ' + msg);
          resetPreview();
          return;
        }

        // 调用 formatter 生成 WeChat HTML
        try {
          formattedHtml = formatToWechat(resp.data);
          renderPreview(formattedHtml, resp.data);
          copyBtn.disabled = false;

          // 显示图片提示
          const hasImages = resp.data.blocks.some(b => b.type === 'image');
          if (hasImages) imageNote.classList.remove('hidden');
          else imageNote.classList.add('hidden');

          showStatus('success', '✅ 转换成功，点击「复制内容」粘贴到微信编辑器');
        } catch (fmtErr) {
          showStatus('error', '❌ 格式化失败：' + fmtErr.message);
          resetPreview();
        }
      });
    } catch (err) {
      convertBtn.disabled = false;
      showStatus('error', '❌ ' + err.message);
      resetPreview();
    }
  });

  // ── 复制逻辑 ─────────────────────────────────────────────────

  copyBtn.addEventListener('click', async () => {
    if (!formattedHtml) return;

    try {
      await copyHtmlToClipboard(formattedHtml);

      // 按钮反馈
      copyBtn.classList.add('btn--copied');
      const origIcon = copyBtn.querySelector('.btn-icon').textContent;
      copyBtn.querySelector('.btn-icon').textContent = '✅';
      copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 已复制！';

      setTimeout(() => {
        copyBtn.classList.remove('btn--copied');
        copyBtn.querySelector('.btn-icon').textContent = origIcon;
        copyBtn.querySelector('.btn-icon').nextSibling.textContent = ' 复制内容';
      }, 2000);
    } catch (err) {
      showStatus('error', '❌ 复制失败：' + err.message + '，请尝试手动选择内容复制');
    }
  });

  // ── 剪贴板 API ───────────────────────────────────────────────

  async function copyHtmlToClipboard(html) {
    // 优先使用现代 ClipboardItem API（支持 text/html）
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob = new Blob([html], { type: 'text/html' });
      const textBlob = new Blob([stripHtmlTags(html)], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob }),
      ]);
      return;
    }

    // 降级：创建临时 DOM 并选中复制
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

  // ── UI 辅助 ──────────────────────────────────────────────────

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
    // 在预览区渲染格式化结果
    preview.innerHTML = html;

    // 统计信息
    const charCount = stripHtmlTags(html).length;
    const blockCount = (data.blocks || []).length;
    stats.textContent = `${blockCount} 个块 · ${charCount.toLocaleString()} 字`;
  }

  // ── 启动 ─────────────────────────────────────────────────────
  init();

})();

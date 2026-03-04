// Background Service Worker

// ── 侧边栏：点击图标在当前窗口打开/关闭 Side Panel ───────────────────────
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ── 图片 Base64 转换 ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action !== 'fetchImagesAsBase64') return false;

  const urls = request.urls || [];
  if (urls.length === 0) {
    sendResponse({ success: true, data: {} });
    return true;
  }

  Promise.all(
    urls.map(url =>
      fetch(url, { credentials: 'omit' })
        .then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.blob();
        })
        .then(blob => new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onloadend = () => res({ url, data: reader.result });
          reader.onerror  = () => res({ url, data: null });
          reader.readAsDataURL(blob);
        }))
        .catch(() => ({ url, data: null }))
    )
  ).then(results => {
    const map = {};
    results.forEach(({ url, data }) => { if (data) map[url] = data; });
    sendResponse({ success: true, data: map });
  });

  return true; // 保持消息通道开启（异步 sendResponse）
});

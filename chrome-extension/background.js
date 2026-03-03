// Background Service Worker

// ── 持久窗口：点击图标打开独立窗口，切换 Tab/App 不会自动关闭 ──────────────
let popupWinId = null;

chrome.action.onClicked.addListener(async (tab) => {
  // 若窗口已存在，聚焦它
  if (popupWinId !== null) {
    try {
      await chrome.windows.update(popupWinId, { focused: true });
      return;
    } catch (_) {
      popupWinId = null;
    }
  }
  // 将当前 tab ID 传给 popup，避免独立窗口中 currentWindow 查询失效
  const win = await chrome.windows.create({
    url:    chrome.runtime.getURL(`popup/popup.html?tabId=${tab.id}`),
    type:   'popup',
    width:  440,
    height: 640,
  });
  popupWinId = win.id;
});

chrome.windows.onRemoved.addListener((winId) => {
  if (winId === popupWinId) popupWinId = null;
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

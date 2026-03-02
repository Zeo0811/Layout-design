// Background Service Worker
// 利用扩展的 host_permissions 直接 fetch CDN/S3 图片，转为 Base64 返回给 popup
// 适用于不需要登录态的图片（S3、feishucdn、byteimg 等）
// 需要 Cookie 的 Notion 代理图片由 popup.js 中的 MAIN world 方案兜底

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

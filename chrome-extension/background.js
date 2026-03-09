// Background Service Worker

// ── 侧边栏：点击图标在当前窗口打开/关闭 Side Panel ───────────────────────
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// ── 消息处理（统一入口）─────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {

    // 保存全部模板列表
    case 'saveTemplates':
      chrome.storage.local.set({ layoutTemplates: request.templates }, () => {
        sendResponse({ success: true });
      });
      return true;

    // 保存当前激活模板名称
    case 'setActiveTemplate':
      chrome.storage.local.set({ activeTemplate: request.name }, () => {
        sendResponse({ success: true });
      });
      return true;

    // 图片 Base64 转换
    case 'fetchImagesAsBase64': {
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
      return true;
    }

    default:
      return false;
  }
});

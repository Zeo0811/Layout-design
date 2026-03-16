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

    // 单张图片 Base64 转换（避免批量返回超过 Chrome 64MB 消息限制）
    case 'fetchImageAsBase64': {
      const url = request.url;
      if (!url) { sendResponse({ success: false }); return true; }
      fetch(url, { credentials: 'omit' })
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.blob(); })
        .then(blob => new Promise((res) => {
          const reader = new FileReader();
          reader.onloadend = () => res(reader.result);
          reader.onerror  = () => res(null);
          reader.readAsDataURL(blob);
        }))
        .then(data => sendResponse({ success: true, url, data }))
        .catch(() => sendResponse({ success: true, url, data: null }));
      return true;
    }

    default:
      return false;
  }
});

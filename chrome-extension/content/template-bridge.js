// Template bridge — syncs custom templates between the Layout-design config
// page and the extension's chrome.storage.local.
//
// Requires "Allow access to file URLs" enabled in chrome://extensions for
// this extension (for file:// pages). Localhost is supported out of the box.

(function () {
  'use strict';

  const isConfigPage =
    document.title.includes('十字路口') ||
    location.href.includes('Layout-design') ||
    location.href.includes('layout-design') ||
    location.href.includes('railway.app') ||
    location.href.includes('github.io');

  if (!isConfigPage) return;

  window.addEventListener('message', function (e) {
    if (e.source !== window || !e.data) return;

    // ── 页面 → 插件：保存全部模板 ────────────────────────────────────────
    if (e.data.type === 'LAYOUT_SYNC_TEMPLATES') {
      chrome.runtime.sendMessage(
        { action: 'saveTemplates', templates: e.data.templates },
        function (resp) {
          if (chrome.runtime.lastError) return;
          if (resp && resp.success) {
            window.postMessage({ type: 'LAYOUT_SYNC_ACK' }, '*');
          }
        }
      );
    }

    // ── 页面 → 插件：查询已存模板 ────────────────────────────────────────
    if (e.data.type === 'LAYOUT_REQUEST_TEMPLATES') {
      chrome.storage.local.get(['layoutTemplates', 'activeTemplate'], function (result) {
        window.postMessage({
          type: 'LAYOUT_TEMPLATES_LOADED',
          templates:      result.layoutTemplates || [],
          activeTemplate: result.activeTemplate  || null,
        }, '*');
      });
    }
  });
})();

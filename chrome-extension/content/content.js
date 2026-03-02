// Content Script 主入口
// 注入到 Notion / 飞书 页面，监听来自 popup 的消息
// 新增：图片 Base64 转换

(function () {
  'use strict';

  function detectPageType() {
    const url = window.location.href;
    if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
    if (url.includes('feishu.cn') || url.includes('larksuite.com')) return 'feishu';
    return 'unknown';
  }

  // ── 图片 Base64 转换 ─────────────────────────────────────────────────────

  async function fetchBase64(url) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const resp = await fetch(url, {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const blob = await resp.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  async function convertImagesToBase64(blocks) {
    for (const block of blocks) {
      if (!block) continue;

      if (block.type === 'image' && block.url) {
        try {
          block.base64 = await fetchBase64(block.url);
        } catch (_) {
          // 转换失败保留原 URL，不影响主流程
        }
      }

      // 递归处理子块
      if (block.children && block.children.length > 0) {
        await convertImagesToBase64(block.children);
      }
      if (block.columns) {
        for (const col of block.columns) {
          await convertImagesToBase64(col);
        }
      }
      if (block.items) {
        for (const item of block.items) {
          if (item.children && item.children.length > 0) {
            await convertImagesToBase64(item.children);
          }
        }
      }
    }
    return blocks;
  }

  // ── 消息监听 ──────────────────────────────────────────────────────────────

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'ok', pageType: detectPageType(), url: window.location.href });
      return true;
    }

    if (request.action === 'parse') {
      (async () => {
        try {
          const pageType = detectPageType();
          let result;

          if (pageType === 'notion') {
            result = parseNotion();
          } else if (pageType === 'feishu') {
            result = parseFeishu();
          } else {
            throw new Error('当前页面不是 Notion 或飞书文档，请在文章页面使用本插件');
          }

          // 图片 Base64 转换（可由 popup 控制是否开启）
          if (request.convertImages !== false) {
            await convertImagesToBase64(result.blocks).catch(() => {});
          }

          sendResponse({ success: true, data: result, pageType });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      })();

      return true; // 保持消息通道（异步）
    }

    return true;
  });
})();

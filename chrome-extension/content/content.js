// Content Script 主入口
// 注入到 Notion / 飞书 页面，监听来自 popup 的消息
// 图片 Base64 转换已移至 popup.js（通过 executeScript MAIN world 完成，绕过 CORS）

(function () {
  'use strict';

  function detectPageType() {
    const url = window.location.href;
    if (url.includes('notion.so') || url.includes('notion.site')) return 'notion';
    if (url.includes('feishu.cn') || url.includes('larksuite.com')) return 'feishu';
    return 'unknown';
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'ping') {
      sendResponse({ status: 'ok', pageType: detectPageType(), url: window.location.href });
      return true;
    }

    if (request.action === 'parse') {
      const pageType = detectPageType();
      const run = async () => {
        if (pageType === 'notion') {
          return parseNotion();
        } else if (pageType === 'feishu') {
          const title = getFeishuTitle();
          const { blocks, links } = await scrollAndCollect();
          if (!blocks.length) throw new Error('无法找到飞书文档内容，请确保页面已完全加载后重试');
          return { type: 'feishu', title, blocks, links };
        } else {
          throw new Error('当前页面不是 Notion 或飞书文档，请在文章页面使用本插件');
        }
      };
      run().then(result => sendResponse({ success: true, data: result, pageType }))
           .catch(err  => sendResponse({ success: false, error: err.message }));
      return true;
    }

    return true;
  });
})();

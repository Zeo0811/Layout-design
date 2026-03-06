(function () {
  if (!window.LayoutStyleStore) return;

  const SOURCE = 'layout-style-sync';

  function postToPage(type, payload) {
    window.postMessage({ source: SOURCE, type, payload }, '*');
  }

  async function sendLibrary() {
    try {
      const styles = await window.LayoutStyleStore.listPresets();
      postToPage('LD_STYLE_LIBRARY', { styles });
    } catch (err) {
      console.warn('同步自定义样式失败', err);
    }
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data) return;
    const { type, payload } = event.data;
    if (type === 'LD_PUSH_CUSTOM_STYLE' && payload && payload.style) {
      window.LayoutStyleStore.saveStyle(payload.style)
        .then((saved) => {
          postToPage('LD_CUSTOM_STYLE_SYNCED', { id: saved.id, name: saved.name });
          sendLibrary();
        })
        .catch(err => console.warn('保存样式失败', err));
    } else if (type === 'LD_REQUEST_CUSTOM_STYLES') {
      sendLibrary();
    }
  });

  // 页面加载后立即推送一次，方便初始化列表
  sendLibrary();
})();

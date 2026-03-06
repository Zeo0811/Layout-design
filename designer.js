(function () {
  if (!window.LayoutStyleSchema || !window.LayoutFormatter) return;

  const editorsRoot = document.getElementById('designerEditors');
  if (!editorsRoot) return;

  const nameInput = document.getElementById('designerName');
  const previewEl = document.getElementById('designerPreview');
  const stylesListEl = document.getElementById('designerStylesList');
  const syncStatusEl = document.getElementById('designerSyncStatus');
  const btnSave = document.getElementById('designerSave');
  const btnNew = document.getElementById('designerNew');

  const LOCAL_KEY = 'LD_DESIGNER_CUSTOM_STYLES_V1';
  const SAMPLE_DATA = {
    type: 'notion',
    title: '十字路口排版自定义范例',
    blocks: [
      { type: 'h1', content: '自定义排版主题' },
      { type: 'paragraph', content: '你可以为标题、段落、列表、图片等元素定义专属风格，点击下方按钮即可实时预览并保存到插件。' },
      { type: 'bulleted_list', items: [
        { content: '支持所有 Notion / 飞书 常见块', children: [] },
        { content: '实时预览转换结果', children: [] },
        { content: '保存后自动同步到扩展', children: [] }
      ] },
      { type: 'quote', content: '「样式是品牌语言的一部分。」' },
      { type: 'callout', icon: '✨', content: '将风格命名为“品牌色 · 加粗标题”，在插件里切换会更直观。' },
      { type: 'code', language: 'javascript', content: "console.log('Hello Layout');" },
      { type: 'todo', content: '确认公众号编辑器为富文本模式', checked: true },
      { type: 'image', url: 'https://picsum.photos/seed/layout/640/320', caption: '示例图片，查看图片容器样式' },
      { type: 'embed', title: 'GitHub 仓库', url: 'https://github.com/Zeo0811/Layout-design' },
      { type: 'table', rows: [
        { cells: ['要素', '效果'], isHeader: true },
        { cells: ['标题', '居中 + 底线'] },
        { cells: ['正文', 'Optima / PingFang SC'] }
      ] },
      { type: 'divider' },
      { type: 'paragraph', content: '更多说明：<a href="https://github.com/Zeo0811/Layout-design">项目仓库</a>' }
    ],
    links: [{ text: '项目仓库', url: 'https://github.com/Zeo0811/Layout-design' }]
  };

  let editorValues = window.LayoutStyleSchema.getDefaultStyle();
  let customStyles = loadLocalStyles();
  let currentStyleId = null;
  let debounceTimer = null;

  function loadLocalStyles() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(item => ({
        id: item.id || `designer_${Date.now()}`,
        name: item.name || '未命名样式',
        styles: window.LayoutStyleSchema.sanitizeStyle(item.styles || {}),
        updatedAt: item.updatedAt || Date.now(),
      }));
    } catch (_) {
      return [];
    }
  }

  function saveLocalStyles() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(customStyles)); } catch (_) {}
  }

  function buildEditors() {
    const groups = {};
    window.LayoutStyleSchema.fields.forEach(field => {
      groups[field.group || '其他'] = groups[field.group || '其他'] || [];
      groups[field.group || '其他'].push(field);
    });
    editorsRoot.innerHTML = '';
    Object.keys(groups).forEach(groupName => {
      const groupWrap = document.createElement('div');
      const groupTitle = document.createElement('div');
      groupTitle.textContent = groupName;
      groupTitle.style.fontSize = '12px';
      groupTitle.style.fontWeight = '600';
      groupTitle.style.color = '#777';
      groupTitle.style.margin = '8px 0 4px';
      groupWrap.appendChild(groupTitle);
      groups[groupName].forEach(field => {
        const fieldWrap = document.createElement('div');
        fieldWrap.className = 'editor-field';
        const label = document.createElement('label');
        label.textContent = field.label;
        const textarea = document.createElement('textarea');
        textarea.value = editorValues[field.key] || '';
        textarea.dataset.key = field.key;
        textarea.addEventListener('input', handleEditorInput);
        fieldWrap.appendChild(label);
        fieldWrap.appendChild(textarea);
        groupWrap.appendChild(fieldWrap);
      });
      editorsRoot.appendChild(groupWrap);
    });
  }

  function handleEditorInput(event) {
    const key = event.target.dataset.key;
    editorValues[key] = event.target.value;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePreview, 200);
  }

  function updatePreview() {
    const html = window.LayoutFormatter.format(SAMPLE_DATA, editorValues);
    previewEl.innerHTML = html;
  }

  function renderSavedStyles(activeId) {
    stylesListEl.innerHTML = '';
    if (!customStyles.length) {
      stylesListEl.innerHTML = '<div class="designer-tip">还没有保存样式，点击上方按钮开始自定义。</div>';
      return;
    }
    customStyles
      .slice()
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .forEach(style => {
        const item = document.createElement('div');
        item.className = 'designer-style-item';
        if (style.id === activeId) item.style.borderColor = '#407600';
        const info = document.createElement('div');
        info.innerHTML = `<div class="designer-style-item-title">${style.name}</div><small>${new Date(style.updatedAt || Date.now()).toLocaleString()}</small>`;
        const actions = document.createElement('div');
        actions.className = 'designer-style-actions';
        const applyBtn = document.createElement('button');
        applyBtn.textContent = '加载';
        applyBtn.addEventListener('click', () => loadStyle(style));
        actions.appendChild(applyBtn);
        item.appendChild(info);
        item.appendChild(actions);
        stylesListEl.appendChild(item);
      });
  }

  function loadStyle(style) {
    currentStyleId = style.id;
    nameInput.value = style.name;
    editorValues = window.LayoutStyleSchema.sanitizeStyle(style.styles || {});
    document.querySelectorAll('#designerEditors textarea').forEach((textarea) => {
      textarea.value = editorValues[textarea.dataset.key] || '';
    });
    updatePreview();
    renderSavedStyles(currentStyleId);
  }

  function resetForm() {
    currentStyleId = null;
    nameInput.value = '';
    editorValues = window.LayoutStyleSchema.getDefaultStyle();
    document.querySelectorAll('#designerEditors textarea').forEach((textarea) => {
      textarea.value = editorValues[textarea.dataset.key] || '';
    });
    updatePreview();
    renderSavedStyles(null);
    syncStatusEl.textContent = '尚未与插件同步';
    syncStatusEl.classList.remove('designer-sync-status--ok');
  }

  function handleSave() {
    const styleName = nameInput.value.trim() || '未命名样式';
    const entry = {
      id: currentStyleId || `designer_${Date.now()}`,
      name: styleName,
      styles: window.LayoutStyleSchema.sanitizeStyle(editorValues),
      updatedAt: Date.now(),
    };
    const idx = customStyles.findIndex(s => s.id === entry.id);
    if (idx >= 0) customStyles[idx] = entry; else customStyles.push(entry);
    saveLocalStyles();
    renderSavedStyles(entry.id);
    currentStyleId = entry.id;
    syncStatusEl.textContent = '已保存，正在同步...';
    syncStatusEl.classList.remove('designer-sync-status--ok');
    window.postMessage({ type: 'LD_PUSH_CUSTOM_STYLE', payload: { style: entry } }, '*');
  }

  function handleBridgeMessage(event) {
    if (!event.data) return;
    const { type, payload } = event.data;
    if (type === 'LD_CUSTOM_STYLE_SYNCED') {
      syncStatusEl.textContent = '已同步到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
    if (type === 'LD_STYLE_LIBRARY' && payload && Array.isArray(payload.styles)) {
      const sanitized = payload.styles.map(style => ({
        id: style.id,
        name: style.name,
        styles: style.styles,
        updatedAt: style.updatedAt || Date.now(),
      }));
      customStyles = sanitized;
      saveLocalStyles();
      renderSavedStyles(currentStyleId);
      syncStatusEl.textContent = '已连接到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
  }

  function requestExtensionStyles() {
    window.postMessage({ type: 'LD_REQUEST_CUSTOM_STYLES' }, '*');
  }

  btnSave.addEventListener('click', handleSave);
  btnNew.addEventListener('click', resetForm);
  window.addEventListener('message', handleBridgeMessage);

  buildEditors();
  updatePreview();
  renderSavedStyles(null);
  requestExtensionStyles();
})();

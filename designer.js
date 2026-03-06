(function () {
  'use strict';

  if (!window.LayoutStyleSchema || !window.LayoutFormatter) return;

  const fields = window.LayoutStyleSchema.fields || [];
  if (!fields.length) return;

  // ── DOM refs ──────────────────────────────────────────
  const blockTabsEl       = document.getElementById('designerBlockTabs');
  const previewEl         = document.getElementById('designerPreview');
  const stylesListEl      = document.getElementById('designerStylesList');
  const syncStatusEl      = document.getElementById('designerSyncStatus');
  const nameInput         = document.getElementById('designerName');
  const editorTitleEl     = document.getElementById('designerEditorTitle');
  const btnSave           = document.getElementById('designerSave');
  const btnNew            = document.getElementById('designerNew');
  const sourceSampleEl    = document.getElementById('designerSourceSample');
  const richEditorEl      = document.getElementById('designerRichEditor');
  const advancedControlsEl = document.getElementById('designerAdvancedControls');
  const fontInput         = document.getElementById('designerFontFamily');
  const fontSizeRange     = document.getElementById('designerFontSize');
  const fontSizeValueEl   = document.getElementById('designerFontSizeValue');
  const weightButtons     = Array.from(document.querySelectorAll('[data-weight]'));
  const alignButtons      = Array.from(document.querySelectorAll('[data-align]'));
  const textColorInput    = document.getElementById('designerTextColor');
  const bgColorInput      = document.getElementById('designerBgColor');
  const lineHeightInput   = document.getElementById('designerLineHeight');
  const letterSpacingRange  = document.getElementById('designerLetterSpacing');
  const letterSpacingValueEl = document.getElementById('designerLetterSpacingValue');

  // ── Config ────────────────────────────────────────────
  const LOCAL_KEY = 'LD_DESIGNER_CUSTOM_STYLES_V1';

  const CONTROL_CONFIG = [
    { id: 'fontFamily',      label: '字体',         type: 'text',   css: 'font-family',       placeholder: "Optima, 'PingFang SC'" },
    { id: 'fontSize',        label: '字号 (px)',     type: 'number', css: 'font-size',         unit: 'px', min: 10, max: 72 },
    { id: 'fontWeight',      label: '字重',          type: 'select', css: 'font-weight',       options: [
      { label: '默认', value: '' }, { label: '细 (300)', value: '300' },
      { label: '正常 (400)', value: '400' }, { label: '中等 (500)', value: '500' },
      { label: '加粗 (600)', value: '600' }, { label: '特粗 (700)', value: '700' },
      { label: '重 (800)', value: '800' }
    ]},
    { id: 'color',           label: '文本颜色',      type: 'color',  css: 'color' },
    { id: 'backgroundColor', label: '背景颜色',      type: 'color',  css: 'background-color' },
    { id: 'textAlign',       label: '对齐方式',      type: 'select', css: 'text-align',        options: [
      { label: '继承', value: '' }, { label: '左对齐', value: 'left' },
      { label: '居中', value: 'center' }, { label: '右对齐', value: 'right' }
    ]},
    { id: 'lineHeight',      label: '行高',          type: 'text',   css: 'line-height',       placeholder: '例如 1.6 或 26px' },
    { id: 'letterSpacing',   label: '字间距 (em)',   type: 'number', css: 'letter-spacing',    unit: 'em', step: 0.05 },
    { id: 'padding',         label: '内边距',        type: 'text',   css: 'padding',           placeholder: '例如 24px 0' },
    { id: 'margin',          label: '外边距',        type: 'text',   css: 'margin' },
    { id: 'border',          label: '边框',          type: 'text',   css: 'border',            placeholder: '例如 1px solid #333' },
    { id: 'borderRadius',    label: '圆角 (px)',     type: 'number', css: 'border-radius',     unit: 'px' },
    { id: 'extra',           label: '高级 CSS',      type: 'textarea' }
  ];

  const CONTROL_BY_CSS = {};
  const CONTROL_BY_ID  = {};
  CONTROL_CONFIG.forEach(cfg => {
    CONTROL_BY_CSS[cfg.css] = cfg;
    CONTROL_BY_ID[cfg.id]   = cfg;
  });

  const TOOLBAR_FIELD_IDS = ['fontFamily','fontSize','fontWeight','color','backgroundColor','textAlign','lineHeight','letterSpacing'];
  const TOOLBAR_FIELD_SET = new Set(TOOLBAR_FIELD_IDS);
  const ADVANCED_FIELD_IDS = ['padding','margin','border','borderRadius','extra'];
  const ADVANCED_CONFIG = CONTROL_CONFIG.filter(cfg => ADVANCED_FIELD_IDS.includes(cfg.id));

  // Sample text shown in each block's panels
  const SAMPLE_COPY = {
    wrapper:            '整体容器',
    h1:                 '这是一级标题 H1',
    h2:                 '这是二级标题 H2',
    h3:                 '这是三级标题 H3',
    h4:                 '这是四级标题 H4',
    h5:                 '这是五级标题 H5',
    h6:                 '这是六级标题 H6',
    p:                  '这里是正文段落，可以调整字号、行高、颜色与对齐，让阅读体验符合品牌调性。',
    blockquote_wrapper: '这是一段引用内容，左侧有粗边框，背景为浅灰色。',
    callout_wrapper:    '这是高亮块（Callout），适合强调注意事项或提示信息。',
    code_wrapper:       'console.log("Hello Layout");',
    ul:                 '• 无序列表第一项\n• 无序列表第二项',
    ol:                 '1. 有序列表第一步\n2. 有序列表第二步',
    li_p:               '列表内容示例文字',
    img_wrapper:        '[图片容器]',
    table_wrapper:      '[表格容器]'
  };

  // Full sample document for overall preview
  const SAMPLE_DATA = {
    type: 'notion',
    title: '自定义样式示例',
    blocks: [
      { type: 'h1', content: '标题模块 · H1' },
      { type: 'paragraph', content: '这里是正文段落，你可以调整字号、行高、颜色与对齐，让阅读体验符合品牌调性。' },
      { type: 'h2', content: 'H2 模块' },
      { type: 'bulleted_list', items: [
        { content: '无序列表项 01', children: [] },
        { content: '无序列表项 02', children: [] }
      ]},
      { type: 'numbered_list', items: [
        { content: '有序列表 01', children: [] },
        { content: '有序列表 02', children: [] }
      ]},
      { type: 'quote', content: '引用 / Callout 等模块同样可以独立配置。' },
      { type: 'callout', icon: '✨', content: '将风格命名为"品牌色 · 加粗标题"，在插件里切换会更直观。' },
      { type: 'code', language: 'javascript', content: "console.log('Hello Layout');" },
      { type: 'image', url: 'https://picsum.photos/seed/layout/600/300', caption: '图片与说明排版示例' },
      { type: 'divider' },
      { type: 'paragraph', content: '更多内容：<a href="https://github.com/Zeo0811/Layout-design">项目仓库</a>' }
    ],
    links: [{ text: '项目仓库', url: 'https://github.com/Zeo0811/Layout-design' }]
  };

  // ── State ─────────────────────────────────────────────
  const defaultStyleMap  = window.LayoutStyleSchema.getDefaultStyle();
  let editorValues       = window.LayoutStyleSchema.getDefaultStyle();
  let styleStates        = {};
  let customStyles       = loadLocalStyles();
  let currentStyleId     = null;
  let activeFieldKey     = fields[0].key;
  const defaultStateCache = {};

  // ── CSS ↔ State helpers ───────────────────────────────
  function cssToState(css) {
    const state  = {};
    const extras = [];
    (css || '').split(';').map(v => v.trim()).filter(Boolean).forEach(rule => {
      const idx = rule.indexOf(':');
      if (idx < 0) return;
      const prop  = rule.slice(0, idx).trim();
      const value = rule.slice(idx + 1).trim();
      const cfg   = CONTROL_BY_CSS[prop];
      if (!cfg) { extras.push(`${prop}:${value}`); return; }
      if (cfg.type === 'number' && cfg.unit) {
        const n = parseFloat(value);
        if (!Number.isNaN(n)) state[cfg.id] = n;
      } else {
        state[cfg.id] = value;
      }
    });
    if (extras.length) state.extra = extras.join(';');
    return state;
  }

  function stateToCss(state) {
    const parts = [];
    CONTROL_CONFIG.forEach(cfg => {
      if (cfg.id === 'extra') return;
      const value = state[cfg.id];
      if (value === undefined || value === null || value === '') return;
      const cssValue = (cfg.type === 'number' && cfg.unit) ? `${value}${cfg.unit}` : value;
      parts.push(`${cfg.css}:${cssValue}`);
    });
    if (state.extra) parts.push(state.extra);
    return parts.join(';');
  }

  function getState(key) {
    if (!styleStates[key]) styleStates[key] = cssToState(editorValues[key] || '');
    return styleStates[key];
  }

  function getDefaultState(key) {
    if (!defaultStateCache[key]) defaultStateCache[key] = cssToState(defaultStyleMap[key] || '');
    return defaultStateCache[key];
  }

  function getEffectiveValue(propId, fallback = '') {
    const state = getState(activeFieldKey);
    if (state[propId] !== undefined && state[propId] !== null && state[propId] !== '') return state[propId];
    const def = getDefaultState(activeFieldKey);
    if (def && def[propId] !== undefined && def[propId] !== null && def[propId] !== '') return def[propId];
    return fallback;
  }

  // ── Block tabs ────────────────────────────────────────
  function buildBlockTabs() {
    blockTabsEl.innerHTML = '';
    fields.forEach(field => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'dsn-tab';
      tab.dataset.key = field.key;
      tab.textContent = field.label;
      tab.addEventListener('click', () => setActiveField(field.key));
      blockTabsEl.appendChild(tab);
    });
    setActiveField(activeFieldKey);
  }

  function setActiveField(key) {
    activeFieldKey = key;
    document.querySelectorAll('.dsn-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.key === key);
    });
    const field = fields.find(f => f.key === key);
    if (editorTitleEl && field) {
      editorTitleEl.textContent = `排版编辑 · ${field.label}`;
    }
    renderAdvancedControls();
    updateEditorPanels(true);
  }

  // ── Editor panels ─────────────────────────────────────
  function updateEditorPanels(resetContent = false) {
    const field      = fields.find(f => f.key === activeFieldKey);
    const sampleText = SAMPLE_COPY[activeFieldKey] || (field ? `${field.label} 示例内容` : '示例内容');

    // Left: original content with default style
    if (sourceSampleEl) {
      sourceSampleEl.textContent = sampleText;
      sourceSampleEl.setAttribute('style', defaultStyleMap[activeFieldKey] || '');
    }

    // Right: editable area with current custom style
    if (richEditorEl) {
      if (resetContent || !richEditorEl.textContent.trim()) {
        richEditorEl.textContent = sampleText;
      }
      applyEditorCss();
    }

    syncToolbarState();
  }

  function applyEditorCss() {
    if (!richEditorEl) return;
    richEditorEl.setAttribute('style', editorValues[activeFieldKey] || '');
  }

  // ── Toolbar state sync ────────────────────────────────
  function syncToolbarState() {
    if (fontInput) fontInput.value = getEffectiveValue('fontFamily', '');

    if (fontSizeRange) {
      const rawSize = getEffectiveValue('fontSize', 24);
      const numeric = typeof rawSize === 'number' ? rawSize : parseFloat(rawSize) || 24;
      fontSizeRange.value = numeric;
      if (fontSizeValueEl) fontSizeValueEl.textContent = `${Math.round(numeric)}px`;
    }

    const weightValue = `${getEffectiveValue('fontWeight', '') || ''}`;
    weightButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.weight === weightValue));

    const alignValue = `${getEffectiveValue('textAlign', '') || ''}`;
    alignButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.align === alignValue));

    if (textColorInput) textColorInput.value = normalizeColor(getEffectiveValue('color', '#222222'), '#222222');
    if (bgColorInput)   bgColorInput.value   = normalizeColor(getEffectiveValue('backgroundColor', '#ffffff'), '#ffffff');

    if (lineHeightInput) {
      const lh = getEffectiveValue('lineHeight', '');
      lineHeightInput.value = typeof lh === 'number' ? lh : (lh || '');
    }

    if (letterSpacingRange) {
      const spacing = getEffectiveValue('letterSpacing', 0);
      const numeric = typeof spacing === 'number' ? spacing : parseFloat(spacing) || 0;
      letterSpacingRange.value = numeric;
      if (letterSpacingValueEl) letterSpacingValueEl.textContent = `${numeric.toFixed(2)}em`;
    }
  }

  function normalizeColor(value, fallback = '#333333') {
    if (!value) return fallback;
    if (value.startsWith('#')) {
      if (value.length === 4) {
        return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase();
      }
      return value.toLowerCase();
    }
    const match = value.match(/rgba?\(([^)]+)\)/i);
    if (match) {
      const nums = match[1].split(',').slice(0, 3).map(v => Math.max(0, Math.min(255, parseFloat(v.trim()) || 0)));
      return `#${nums.map(n => n.toString(16).padStart(2, '0')).join('')}`;
    }
    return fallback;
  }

  // ── Toolbar events ────────────────────────────────────
  function bindToolbarEvents() {
    if (fontInput) {
      fontInput.addEventListener('input', e => handleToolbarChange('fontFamily', e.target.value));
    }
    if (fontSizeRange) {
      fontSizeRange.addEventListener('input', e => {
        const value = parseInt(e.target.value, 10) || 0;
        if (fontSizeValueEl) fontSizeValueEl.textContent = `${value}px`;
        handleToolbarChange('fontSize', value);
      });
    }
    weightButtons.forEach(btn => {
      btn.addEventListener('click', () => handleToolbarChange('fontWeight', btn.dataset.weight));
    });
    alignButtons.forEach(btn => {
      btn.addEventListener('click', () => handleToolbarChange('textAlign', btn.dataset.align));
    });
    if (textColorInput) {
      textColorInput.addEventListener('input', e => handleToolbarChange('color', e.target.value));
    }
    if (bgColorInput) {
      bgColorInput.addEventListener('input', e => handleToolbarChange('backgroundColor', e.target.value));
    }
    if (lineHeightInput) {
      lineHeightInput.addEventListener('input', e => handleToolbarChange('lineHeight', e.target.value));
    }
    if (letterSpacingRange) {
      letterSpacingRange.addEventListener('input', e => {
        const value = parseFloat(e.target.value) || 0;
        if (letterSpacingValueEl) letterSpacingValueEl.textContent = `${value.toFixed(2)}em`;
        handleToolbarChange('letterSpacing', value);
      });
    }
  }

  function handleToolbarChange(id, value) {
    const cfg = CONTROL_BY_ID[id];
    if (!cfg) return;
    handleControlChange(cfg, value);
  }

  // ── Advanced controls (row 3 of toolbar) ─────────────
  function renderAdvancedControls() {
    if (!advancedControlsEl) return;
    advancedControlsEl.innerHTML = '';
    if (!ADVANCED_CONFIG.length) return;

    const state = getState(activeFieldKey);
    ADVANCED_CONFIG.forEach(cfg => {
      const group = document.createElement('div');
      group.className = 'dsn-tg';

      const label = document.createElement('span');
      label.className = 'dsn-tlabel';
      label.textContent = cfg.label;
      group.appendChild(label);

      let input;
      if (cfg.type === 'textarea') {
        // Render as a text input in the toolbar (single-line is fine for CSS snippets)
        input = document.createElement('input');
        input.type = 'text';
        input.value = state[cfg.id] || '';
        input.placeholder = cfg.placeholder || '自定义 CSS';
        input.className = 'dsn-tinput';
        input.style.width = '170px';
      } else if (cfg.type === 'number') {
        input = document.createElement('input');
        input.type = 'number';
        if (cfg.min !== undefined) input.min = cfg.min;
        if (cfg.max !== undefined) input.max = cfg.max;
        if (cfg.step !== undefined) input.step = cfg.step;
        input.value = state[cfg.id] ?? '';
        input.className = 'dsn-tinput dsn-tinput--sm';
      } else {
        input = document.createElement('input');
        input.type = 'text';
        input.value = state[cfg.id] || '';
        if (cfg.placeholder) input.placeholder = cfg.placeholder;
        input.className = 'dsn-tinput dsn-tinput--sm';
        input.style.width = '120px';
      }

      input.addEventListener('input', () => handleControlChange(cfg, input.value));
      group.appendChild(input);
      advancedControlsEl.appendChild(group);
    });
  }

  // ── Control change handler ────────────────────────────
  function handleControlChange(cfg, rawValue) {
    const state = getState(activeFieldKey);
    if (cfg.type === 'number') {
      const num = rawValue === '' ? '' : parseFloat(rawValue);
      state[cfg.id] = (rawValue === '' || Number.isNaN(num)) ? '' : num;
    } else {
      state[cfg.id] = rawValue;
    }
    editorValues[activeFieldKey] = stateToCss(state);
    applyEditorCss();
    updatePreview();
    if (TOOLBAR_FIELD_SET.has(cfg.id)) syncToolbarState();
  }

  // ── Preview ───────────────────────────────────────────
  function updatePreview() {
    const html = window.LayoutFormatter.format(SAMPLE_DATA, editorValues);
    previewEl.innerHTML = html;
  }

  // ── Saved styles list ─────────────────────────────────
  function renderSavedStyles(activeId) {
    stylesListEl.innerHTML = '';
    if (!customStyles.length) {
      stylesListEl.innerHTML = '<div class="designer-tip">还没有保存的样式，调整完成后点击上方按钮保存。</div>';
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
    styleStates  = {};
    updatePreview();
    renderAdvancedControls();
    updateEditorPanels(false);
    renderSavedStyles(currentStyleId);
  }

  function resetForm() {
    currentStyleId = null;
    nameInput.value = '';
    editorValues = window.LayoutStyleSchema.getDefaultStyle();
    styleStates  = {};
    updatePreview();
    renderAdvancedControls();
    updateEditorPanels(true);
    renderSavedStyles(null);
    syncStatusEl.textContent = '尚未同步';
    syncStatusEl.classList.remove('designer-sync-status--ok');
  }

  function handleSave() {
    const entry = {
      id:        currentStyleId || `designer_${Date.now()}`,
      name:      nameInput.value.trim() || '未命名样式',
      styles:    window.LayoutStyleSchema.sanitizeStyle(editorValues),
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

  // ── Persistence ───────────────────────────────────────
  function loadLocalStyles() {
    try {
      const raw    = localStorage.getItem(LOCAL_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(item => ({
        id:        item.id || `designer_${Date.now()}`,
        name:      item.name || '未命名样式',
        styles:    window.LayoutStyleSchema.sanitizeStyle(item.styles || {}),
        updatedAt: item.updatedAt || Date.now(),
      }));
    } catch (_) { return []; }
  }

  function saveLocalStyles() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(customStyles)); } catch (_) {}
  }

  // ── Extension bridge ──────────────────────────────────
  function handleBridgeMessage(event) {
    if (!event.data) return;
    const { type, payload } = event.data;
    if (type === 'LD_CUSTOM_STYLE_SYNCED') {
      syncStatusEl.textContent = '已同步到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
    if (type === 'LD_STYLE_LIBRARY' && payload && Array.isArray(payload.styles)) {
      customStyles = payload.styles.map(style => ({
        id:        style.id,
        name:      style.name,
        styles:    window.LayoutStyleSchema.sanitizeStyle(style.styles || {}),
        updatedAt: style.updatedAt || Date.now(),
      }));
      saveLocalStyles();
      renderSavedStyles(currentStyleId);
      syncStatusEl.textContent = '已连接到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
  }

  function requestExtensionStyles() {
    window.postMessage({ type: 'LD_REQUEST_CUSTOM_STYLES' }, '*');
  }

  // ── Init ──────────────────────────────────────────────
  btnSave.addEventListener('click', handleSave);
  btnNew.addEventListener('click', resetForm);
  window.addEventListener('message', handleBridgeMessage);

  bindToolbarEvents();
  buildBlockTabs();
  updatePreview();
  renderSavedStyles(null);
  requestExtensionStyles();
})();

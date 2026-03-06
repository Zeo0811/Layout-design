(function () {
  'use strict';

  if (!window.LayoutStyleSchema || !window.LayoutFormatter) return;

  const fields = window.LayoutStyleSchema.fields || [];
  if (!fields.length) return;

  // ── DOM refs ──────────────────────────────────────────
  const blockGridEl        = document.getElementById('designerBlockGrid');
  const stylesListEl       = document.getElementById('designerStylesList');
  const syncStatusEl       = document.getElementById('designerSyncStatus');
  const nameInput          = document.getElementById('designerName');
  const editorTitleEl      = document.getElementById('designerEditorTitle');
  const btnSave            = document.getElementById('designerSave');
  const btnNew             = document.getElementById('designerNew');
  const richEditorEl       = document.getElementById('designerRichEditor');
  const advancedControlsEl = document.getElementById('designerAdvancedControls');
  const fontInput          = document.getElementById('designerFontFamily');
  const fontSizeRange      = document.getElementById('designerFontSize');
  const fontSizeValueEl    = document.getElementById('designerFontSizeValue');
  const weightButtons      = Array.from(document.querySelectorAll('[data-weight]'));
  const alignButtons       = Array.from(document.querySelectorAll('[data-align]'));
  const textColorInput     = document.getElementById('designerTextColor');
  const bgColorInput       = document.getElementById('designerBgColor');
  const lineHeightInput    = document.getElementById('designerLineHeight');
  const letterSpacingRange   = document.getElementById('designerLetterSpacing');
  const letterSpacingValueEl = document.getElementById('designerLetterSpacingValue');

  // ── Config ────────────────────────────────────────────
  const LOCAL_KEY = 'LD_DESIGNER_CUSTOM_STYLES_V1';

  const CONTROL_CONFIG = [
    { id: 'fontFamily',      label: '字体',        type: 'text',   css: 'font-family',     placeholder: "Optima, 'PingFang SC'" },
    { id: 'fontSize',        label: '字号 (px)',   type: 'number', css: 'font-size',       unit: 'px', min: 10, max: 72 },
    { id: 'fontWeight',      label: '字重',        type: 'select', css: 'font-weight',     options: [
      { label: '默认', value: '' }, { label: '细 (300)', value: '300' },
      { label: '正常 (400)', value: '400' }, { label: '中等 (500)', value: '500' },
      { label: '加粗 (600)', value: '600' }, { label: '特粗 (700)', value: '700' },
      { label: '重 (800)', value: '800' }
    ]},
    { id: 'color',           label: '文本颜色',    type: 'color',  css: 'color' },
    { id: 'backgroundColor', label: '背景颜色',    type: 'color',  css: 'background-color' },
    { id: 'textAlign',       label: '对齐方式',    type: 'select', css: 'text-align',      options: [
      { label: '继承', value: '' }, { label: '左对齐', value: 'left' },
      { label: '居中', value: 'center' }, { label: '右对齐', value: 'right' }
    ]},
    { id: 'lineHeight',    label: '行高',        type: 'text',   css: 'line-height',     placeholder: '例如 1.6 或 26px' },
    { id: 'letterSpacing', label: '字间距 (em)', type: 'number', css: 'letter-spacing',  unit: 'em', step: 0.05 },
    { id: 'padding',       label: '内边距',      type: 'text',   css: 'padding',         placeholder: '例如 24px 0' },
    { id: 'margin',        label: '外边距',      type: 'text',   css: 'margin' },
    { id: 'border',        label: '边框',        type: 'text',   css: 'border',          placeholder: '例如 1px solid #333' },
    { id: 'borderRadius',  label: '圆角 (px)',   type: 'number', css: 'border-radius',   unit: 'px' },
    { id: 'extra',         label: '高级 CSS',    type: 'textarea' }
  ];

  const CONTROL_BY_CSS = {};
  const CONTROL_BY_ID  = {};
  CONTROL_CONFIG.forEach(cfg => { CONTROL_BY_CSS[cfg.css] = cfg; CONTROL_BY_ID[cfg.id] = cfg; });

  const TOOLBAR_FIELD_SET  = new Set(['fontFamily','fontSize','fontWeight','color','backgroundColor','textAlign','lineHeight','letterSpacing']);
  const ADVANCED_CONFIG    = CONTROL_CONFIG.filter(c => ['padding','margin','border','borderRadius','extra'].includes(c.id));

  // ── Block card preview HTML builders ─────────────────
  // Each function returns the inner HTML for a block's mini-preview card.
  // Uses current editorValues so cards update in real-time.
  function renderBlockCard(key) {
    const S = editorValues;
    const map = {
      wrapper:            `<p style="${S.p||''}">整体容器样式预览</p>`,
      h1:                 `<section style="${S.h1||''}">这是一级标题 H1</section>`,
      h2:                 `<section style="${S.h2||''}">这是二级标题 H2</section>`,
      h3:                 `<section style="${S.h3||''}">这是三级标题 H3</section>`,
      h4:                 `<section style="${S.h4||''}">这是四级标题 H4</section>`,
      h5:                 `<section style="${S.h5||''}">这是五级标题 H5</section>`,
      h6:                 `<section style="${S.h6||''}">这是六级标题 H6</section>`,
      p:                  `<p style="${S.p||''}">正文段落，展示字号、行高与颜色效果。</p>`,
      blockquote_wrapper: `<section style="${S.blockquote_wrapper||''}"><p style="${S.blockquote_text||''}margin:0;">这是引用块示例内容。</p></section>`,
      callout_wrapper:    `<section style="${S.callout_wrapper||''}"><section style="${S.callout_header||''}">💡</section><section style="${S.callout_content||''}padding-top:4px;">高亮块内容示例。</section></section>`,
      code_wrapper:       `<section style="${S.code_wrapper||''}padding:8px 10px;margin:0;"><code style="${S.code_text||''}">console.log('Hello')</code></section>`,
      ul:                 `<ul style="${S.ul||''}margin:0;"><li style="${S.li_ul||''}"><p style="${S.li_p||''}margin:0;">无序列表项一</p></li><li style="${S.li_ul||''}"><p style="${S.li_p||''}margin:0;">无序列表项二</p></li></ul>`,
      ol:                 `<ol style="${S.ol||''}margin:0;"><li style="${S.li_ol||''}"><p style="${S.li_p||''}margin:0;">有序列表项一</p></li><li style="${S.li_ol||''}"><p style="${S.li_p||''}margin:0;">有序列表项二</p></li></ol>`,
      li_p:               `<ul style="${S.ul||''}margin:0;"><li style="${S.li_ul||''}"><p style="${S.li_p||''}margin:0;">列表内容样式示例</p></li></ul>`,
      img_wrapper:        `<section style="${S.img_wrapper||''}margin:0;"><img src="https://picsum.photos/seed/dsn/120/44" style="${S.img||''}max-width:100%;height:auto;" /><p style="${S.img_caption||''}margin:2px 0 0;">图片说明文字</p></section>`,
      table_wrapper:      `<section style="${S.table_wrapper||''}margin:0;"><table style="${S.table||''}width:100%;border-collapse:collapse;font-size:12px;"><tr><td style="${S.th||''}padding:2px 6px;">平台</td><td style="${S.th||''}padding:2px 6px;">格式</td></tr><tr><td style="${S.td||''}padding:2px 6px;">飞书</td><td style="${S.td||''}padding:2px 6px;">文档</td></tr></table></section>`,
    };
    return map[key] || `<span style="${S[key]||''}">示例内容</span>`;
  }

  // Sample text shown in the right editable area
  const SAMPLE_TEXT = {
    wrapper:            '整体容器样式',
    h1:                 '这是一级标题 H1',
    h2:                 '这是二级标题 H2',
    h3:                 '这是三级标题 H3',
    h4:                 '这是四级标题 H4',
    h5:                 '这是五级标题 H5',
    h6:                 '这是六级标题 H6',
    p:                  '这里是正文段落，可以调整字号、行高、颜色与对齐，让阅读体验符合品牌调性。',
    blockquote_wrapper: '这是引用块内容，左侧有粗边框，背景浅灰。',
    callout_wrapper:    '💡 这是高亮块（Callout），适合强调注意事项。',
    code_wrapper:       "console.log('Hello Layout');",
    ul:                 '• 无序列表第一项\n• 无序列表第二项',
    ol:                 '1. 有序列表第一步\n2. 有序列表第二步',
    li_p:               '列表内容文字样式示例',
    img_wrapper:        '[图片容器]',
    table_wrapper:      '[表格容器]',
  };

  // ── State ─────────────────────────────────────────────
  const defaultStyleMap   = window.LayoutStyleSchema.getDefaultStyle();
  let editorValues        = window.LayoutStyleSchema.getDefaultStyle();
  let styleStates         = {};
  let customStyles        = loadLocalStyles();
  let currentStyleId      = null;
  let activeFieldKey      = fields[0].key;
  const defaultStateCache = {};

  // ── CSS ↔ State helpers ───────────────────────────────
  function cssToState(css) {
    const state = {}, extras = [];
    (css || '').split(';').map(v => v.trim()).filter(Boolean).forEach(rule => {
      const idx = rule.indexOf(':');
      if (idx < 0) return;
      const prop = rule.slice(0, idx).trim(), value = rule.slice(idx + 1).trim();
      const cfg = CONTROL_BY_CSS[prop];
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
      const v = state[cfg.id];
      if (v === undefined || v === null || v === '') return;
      parts.push(`${cfg.css}:${(cfg.type === 'number' && cfg.unit) ? `${v}${cfg.unit}` : v}`);
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
    const s = getState(activeFieldKey);
    if (s[propId] !== undefined && s[propId] !== null && s[propId] !== '') return s[propId];
    const d = getDefaultState(activeFieldKey);
    if (d && d[propId] !== undefined && d[propId] !== null && d[propId] !== '') return d[propId];
    return fallback;
  }

  // ── Block grid ────────────────────────────────────────
  function buildBlockGrid() {
    blockGridEl.innerHTML = '';
    fields.forEach(field => {
      const card = document.createElement('div');
      card.className = 'dsn-block-card';
      card.dataset.key = field.key;

      const label = document.createElement('span');
      label.className = 'dsn-block-card-label';
      label.textContent = field.label;

      const preview = document.createElement('div');
      preview.className = 'dsn-block-card-preview';
      preview.dataset.previewFor = field.key;
      preview.innerHTML = renderBlockCard(field.key);

      card.appendChild(label);
      card.appendChild(preview);
      card.addEventListener('click', () => setActiveField(field.key));
      blockGridEl.appendChild(card);
    });
    setActiveField(activeFieldKey);
  }

  // Re-render every card's preview with current editorValues
  function refreshBlockGrid() {
    blockGridEl.querySelectorAll('[data-preview-for]').forEach(el => {
      el.innerHTML = renderBlockCard(el.dataset.previewFor);
    });
  }

  function setActiveField(key) {
    activeFieldKey = key;
    blockGridEl.querySelectorAll('.dsn-block-card').forEach(card => {
      card.classList.toggle('active', card.dataset.key === key);
    });
    const field = fields.find(f => f.key === key);
    if (editorTitleEl && field) editorTitleEl.textContent = `排版编辑 · ${field.label}`;
    renderAdvancedControls();
    updateEditor(true);
  }

  // ── Right editor ──────────────────────────────────────
  function updateEditor(resetContent = false) {
    if (!richEditorEl) return;
    const sampleText = SAMPLE_TEXT[activeFieldKey] || (fields.find(f => f.key === activeFieldKey)?.label + ' 示例') || '示例内容';
    if (resetContent || !richEditorEl.textContent.trim()) {
      richEditorEl.textContent = sampleText;
    }
    richEditorEl.setAttribute('style', editorValues[activeFieldKey] || '');
    syncToolbarState();
  }

  // ── Toolbar state sync ────────────────────────────────
  function syncToolbarState() {
    if (fontInput) fontInput.value = getEffectiveValue('fontFamily', '');

    if (fontSizeRange) {
      const raw = getEffectiveValue('fontSize', 24);
      const n = typeof raw === 'number' ? raw : parseFloat(raw) || 24;
      fontSizeRange.value = n;
      if (fontSizeValueEl) fontSizeValueEl.textContent = `${Math.round(n)}px`;
    }

    const wVal = `${getEffectiveValue('fontWeight', '') || ''}`;
    weightButtons.forEach(b => b.classList.toggle('active', b.dataset.weight === wVal));

    const aVal = `${getEffectiveValue('textAlign', '') || ''}`;
    alignButtons.forEach(b => b.classList.toggle('active', b.dataset.align === aVal));

    if (textColorInput) textColorInput.value = normalizeColor(getEffectiveValue('color', '#222222'), '#222222');
    if (bgColorInput)   bgColorInput.value   = normalizeColor(getEffectiveValue('backgroundColor', '#ffffff'), '#ffffff');

    if (lineHeightInput) {
      const lh = getEffectiveValue('lineHeight', '');
      lineHeightInput.value = typeof lh === 'number' ? lh : (lh || '');
    }

    if (letterSpacingRange) {
      const sp = getEffectiveValue('letterSpacing', 0);
      const n  = typeof sp === 'number' ? sp : parseFloat(sp) || 0;
      letterSpacingRange.value = n;
      if (letterSpacingValueEl) letterSpacingValueEl.textContent = `${n.toFixed(2)}em`;
    }
  }

  function normalizeColor(value, fallback = '#333333') {
    if (!value) return fallback;
    if (value.startsWith('#')) {
      return value.length === 4
        ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`.toLowerCase()
        : value.toLowerCase();
    }
    const m = value.match(/rgba?\(([^)]+)\)/i);
    if (m) {
      const nums = m[1].split(',').slice(0, 3).map(v => Math.max(0, Math.min(255, parseFloat(v.trim()) || 0)));
      return `#${nums.map(n => n.toString(16).padStart(2, '0')).join('')}`;
    }
    return fallback;
  }

  // ── Toolbar events ────────────────────────────────────
  function bindToolbarEvents() {
    if (fontInput) fontInput.addEventListener('input', e => handleToolbarChange('fontFamily', e.target.value));
    if (fontSizeRange) {
      fontSizeRange.addEventListener('input', e => {
        const v = parseInt(e.target.value, 10) || 0;
        if (fontSizeValueEl) fontSizeValueEl.textContent = `${v}px`;
        handleToolbarChange('fontSize', v);
      });
    }
    weightButtons.forEach(b => b.addEventListener('click', () => handleToolbarChange('fontWeight', b.dataset.weight)));
    alignButtons.forEach(b => b.addEventListener('click', () => handleToolbarChange('textAlign', b.dataset.align)));
    if (textColorInput) textColorInput.addEventListener('input', e => handleToolbarChange('color', e.target.value));
    if (bgColorInput)   bgColorInput.addEventListener('input',   e => handleToolbarChange('backgroundColor', e.target.value));
    if (lineHeightInput) lineHeightInput.addEventListener('input', e => handleToolbarChange('lineHeight', e.target.value));
    if (letterSpacingRange) {
      letterSpacingRange.addEventListener('input', e => {
        const v = parseFloat(e.target.value) || 0;
        if (letterSpacingValueEl) letterSpacingValueEl.textContent = `${v.toFixed(2)}em`;
        handleToolbarChange('letterSpacing', v);
      });
    }
  }

  function handleToolbarChange(id, value) {
    const cfg = CONTROL_BY_ID[id];
    if (cfg) handleControlChange(cfg, value);
  }

  // ── Advanced controls (toolbar row 3) ─────────────────
  function renderAdvancedControls() {
    if (!advancedControlsEl) return;
    advancedControlsEl.innerHTML = '';
    const state = getState(activeFieldKey);
    ADVANCED_CONFIG.forEach(cfg => {
      const group = document.createElement('div');
      group.className = 'dsn-tg';

      const label = document.createElement('span');
      label.className = 'dsn-tlabel';
      label.textContent = cfg.label;
      group.appendChild(label);

      const input = document.createElement('input');
      input.type = cfg.type === 'number' ? 'number' : 'text';
      input.className = cfg.type === 'number' ? 'dsn-tinput dsn-tinput--sm' : 'dsn-tinput';
      if (cfg.type === 'number') {
        if (cfg.min !== undefined) input.min = cfg.min;
        if (cfg.max !== undefined) input.max = cfg.max;
        if (cfg.step !== undefined) input.step = cfg.step;
        input.value = state[cfg.id] ?? '';
      } else {
        input.value = state[cfg.id] || '';
        if (cfg.placeholder) input.placeholder = cfg.placeholder;
        if (cfg.id === 'extra') input.style.width = '160px';
        else input.style.width = '110px';
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
      const n = rawValue === '' ? '' : parseFloat(rawValue);
      state[cfg.id] = (rawValue === '' || Number.isNaN(n)) ? '' : n;
    } else {
      state[cfg.id] = rawValue;
    }
    editorValues[activeFieldKey] = stateToCss(state);
    // Update right editor style
    if (richEditorEl) richEditorEl.setAttribute('style', editorValues[activeFieldKey] || '');
    // Update left card previews in real-time
    refreshBlockGrid();
    if (TOOLBAR_FIELD_SET.has(cfg.id)) syncToolbarState();
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
    refreshBlockGrid();
    renderAdvancedControls();
    updateEditor(false);
    renderSavedStyles(currentStyleId);
  }

  function resetForm() {
    currentStyleId = null;
    nameInput.value = '';
    editorValues = window.LayoutStyleSchema.getDefaultStyle();
    styleStates  = {};
    refreshBlockGrid();
    renderAdvancedControls();
    updateEditor(true);
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
      const raw = localStorage.getItem(LOCAL_KEY);
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
  window.addEventListener('message', event => {
    if (!event.data) return;
    const { type, payload } = event.data;
    if (type === 'LD_CUSTOM_STYLE_SYNCED') {
      syncStatusEl.textContent = '已同步到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
    if (type === 'LD_STYLE_LIBRARY' && payload && Array.isArray(payload.styles)) {
      customStyles = payload.styles.map(s => ({
        id: s.id, name: s.name,
        styles: window.LayoutStyleSchema.sanitizeStyle(s.styles || {}),
        updatedAt: s.updatedAt || Date.now(),
      }));
      saveLocalStyles();
      renderSavedStyles(currentStyleId);
      syncStatusEl.textContent = '已连接到插件';
      syncStatusEl.classList.add('designer-sync-status--ok');
    }
  });

  // ── Init ──────────────────────────────────────────────
  btnSave.addEventListener('click', handleSave);
  btnNew.addEventListener('click', resetForm);
  bindToolbarEvents();
  buildBlockGrid();
  renderSavedStyles(null);
  window.postMessage({ type: 'LD_REQUEST_CUSTOM_STYLES' }, '*');
})();

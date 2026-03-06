(function () {
  if (!window.LayoutStyleSchema) {
    console.warn('LayoutStyleSchema 未初始化，StyleStore 将无法工作');
    return;
  }

  const STORAGE_KEY = LayoutStyleSchema.STORAGE_KEY || 'LD_CUSTOM_STYLES_V1';
  const DEFAULT_PRESET = {
    id: LayoutStyleSchema.DEFAULT_STYLE_ID || 'ld_default',
    name: LayoutStyleSchema.DEFAULT_STYLE_NAME || '默认样式',
    builtin: true,
    styles: LayoutStyleSchema.getDefaultStyle(),
    updatedAt: Date.now(),
  };

  const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync;
  let cache = null;
  const listeners = new Set();

  const clone = (obj) => JSON.parse(JSON.stringify(obj));

  function sanitizeEntry(entry) {
    if (!entry) return null;
    const sanitized = {
      id: entry.id || `ld_user_${Date.now()}`,
      name: entry.name || '未命名样式',
      styles: LayoutStyleSchema.sanitizeStyle(entry.styles || entry),
      updatedAt: entry.updatedAt || Date.now(),
    };
    if (entry.description) sanitized.description = entry.description;
    return sanitized;
  }

  function sanitizeList(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map((item) => sanitizeEntry(item))
      .filter(Boolean);
  }

  function readRaw() {
    return new Promise((resolve) => {
      if (hasChromeStorage) {
        chrome.storage.sync.get([STORAGE_KEY], (res) => {
          resolve(res[STORAGE_KEY] || []);
        });
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          resolve(raw ? JSON.parse(raw) : []);
        } catch (err) {
          console.warn('读取样式失败', err);
          resolve([]);
        }
      }
    });
  }

  function writeRaw(list) {
    cache = sanitizeList(list);
    return new Promise((resolve, reject) => {
      if (hasChromeStorage) {
        chrome.storage.sync.set({ [STORAGE_KEY]: cache }, () => {
          if (chrome.runtime && chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          notify();
          resolve();
        });
      } else {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
          notify();
          resolve();
        } catch (err) {
          reject(err);
        }
      }
    });
  }

  function notify() {
    listeners.forEach((cb) => {
      try { cb(); } catch (err) { console.error(err); }
    });
  }

  async function ensureCache() {
    if (cache) return cache;
    cache = sanitizeList(await readRaw());
    return cache;
  }

  async function listCustomStyles() {
    const current = await ensureCache();
    return clone(current);
  }

  async function listPresets() {
    const custom = await listCustomStyles();
    return [clone(DEFAULT_PRESET), ...custom];
  }

  async function saveStyle(entry) {
    const sanitized = sanitizeEntry(entry);
    const list = await listCustomStyles();
    const idx = list.findIndex((item) => item.id === sanitized.id);
    if (idx >= 0) {
      list[idx] = sanitized;
    } else {
      list.push(sanitized);
    }
    await writeRaw(list);
    return sanitized;
  }

  async function deleteStyle(styleId) {
    const list = await listCustomStyles();
    const filtered = list.filter((item) => item.id !== styleId);
    await writeRaw(filtered);
  }

  function onChange(cb) {
    if (typeof cb !== 'function') return () => {};
    listeners.add(cb);
    return () => listeners.delete(cb);
  }

  if (hasChromeStorage) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[STORAGE_KEY]) return;
      cache = sanitizeList(changes[STORAGE_KEY].newValue || []);
      notify();
    });
  } else if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY) return;
      try {
        cache = sanitizeList(event.newValue ? JSON.parse(event.newValue) : []);
        notify();
      } catch (_) {}
    });
  }

  window.LayoutStyleStore = {
    STORAGE_KEY,
    getDefaultPreset: () => clone(DEFAULT_PRESET),
    listPresets,
    listCustomStyles,
    saveStyle,
    deleteStyle,
    onChange,
  };
})();

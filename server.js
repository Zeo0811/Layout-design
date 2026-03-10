const express = require('express');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY           = 'layout_templates';

// CORS — 允许插件 popup (chrome-extension://) 直接请求
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

async function upstash(command, ...args) {
  if (!UPSTASH_URL) return null;
  const res = await fetch(UPSTASH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([command, ...args]),
  });
  const text = await res.text();
  console.log(`upstash ${command} status=${res.status} body=${text.slice(0, 200)}`);
  const data = JSON.parse(text);
  if (data.error) throw new Error(`Upstash: ${data.error}`);
  return data.result ?? null;
}

async function loadTemplates() {
  try {
    const raw = await upstash('get', KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveTemplates(templates) {
  await upstash('set', KEY, JSON.stringify(templates));
}

// GET /api/templates
app.get('/api/templates', async (req, res) => {
  try {
    res.json({ templates: await loadTemplates() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/templates
app.post('/api/templates', async (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'invalid' });
    await saveTemplates(templates);
    res.json({ ok: true });
  } catch (e) {
    console.error('POST /api/templates error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

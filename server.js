const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app       = express();
const PORT      = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'templates.json');

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

function loadTemplates() {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { return []; }
}

function saveTemplates(templates) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(templates), 'utf8');
}

// GET /api/templates
app.get('/api/templates', (req, res) => {
  res.json({ templates: loadTemplates() });
});

// POST /api/templates
app.post('/api/templates', (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: 'invalid' });
    saveTemplates(templates);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

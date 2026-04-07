// 飞书文档 HTML 格式化器
// 输出干净的语义化 HTML，粘贴到飞书文档编辑器后可正常渲染
// 保留所有结构化信息，确保后续从飞书再转微信时链路畅通

function formatToFeishu(parsedData) {
  if (!parsedData || !parsedData.blocks) {
    return '<p style="color:red">解析数据为空，请重试</p>';
  }
  const { blocks, links = [] } = parsedData;

  // 跳过开头的空块
  let startIndex = 0;
  while (startIndex < blocks.length) {
    const b = blocks[startIndex];
    if (b.type === 'paragraph') {
      const text = (b.content || '').replace(/\u200b/g, '').trim();
      if (!text) { startIndex++; continue; }
    }
    break;
  }

  let html = '';
  for (let i = startIndex; i < blocks.length; i++) {
    html += renderFeishuBlock(blocks[i], links, 0);
  }
  if (links.length > 0) html += renderFeishuFootnotes(links);
  return html;
}

function splitFormatToFeishu(parsedData, n) {
  if (!parsedData || !parsedData.blocks || parsedData.blocks.length === 0) return [];
  const { blocks, links = [] } = parsedData;
  const size = Math.ceil(blocks.length / n);
  const result = [];

  for (let i = 0; i < blocks.length; i += size) {
    const chunk = blocks.slice(i, i + size);
    const isLast = i + size >= blocks.length;
    let html = '';
    for (const block of chunk) html += renderFeishuBlock(block, links, 0);
    if (isLast && links.length > 0) html += renderFeishuFootnotes(links);
    if (html.trim()) result.push(html);
  }
  return result;
}

// ── Block 渲染 ────────────────────────────────────────────────────────────

function renderFeishuBlock(block, links, depth) {
  if (!block) return '';
  switch (block.type) {
    case 'h1': return `<h1>${feishuInline(block.content)}</h1>`;
    case 'h2': return `<h2>${feishuInline(block.content)}</h2>`;
    case 'h3': return `<h3>${feishuInline(block.content)}</h3>`;
    case 'h4': return `<h4>${feishuInline(block.content)}</h4>`;
    case 'h5': return `<h5>${feishuInline(block.content)}</h5>`;
    case 'h6': return `<h6>${feishuInline(block.content)}</h6>`;

    case 'paragraph': {
      const text = (block.content || '').replace(/\u200b/g, '').trim();
      if (!text) return '<p><br></p>';
      return `<p>${feishuInline(block.content)}</p>`;
    }

    case 'quote':
      return `<blockquote><p>${feishuInline(block.content)}</p></blockquote>`;

    case 'callout':
      return `<blockquote><p>${block.icon || '💡'} ${feishuInline(block.content)}</p></blockquote>`;

    case 'code':
      return renderFeishuCode(block);

    case 'divider':
      return '<hr>';

    case 'bulleted_list':
      return renderFeishuList(block.items, false, links, depth);

    case 'numbered_list':
      return renderFeishuList(block.items, true, links, depth);

    case 'image':
      return renderFeishuImage(block);

    case 'video':
      return `<p>📹 视频内容请前往原文查看${block.url ? '：' + feishuEsc(block.url) : ''}</p>`;

    case 'toggle': {
      let html = `<p><strong>▶ ${feishuInline(block.content)}</strong></p>`;
      if (block.children && block.children.length > 0) {
        html += block.children.map(b => renderFeishuBlock(b, links, depth + 1)).join('');
      }
      return html;
    }

    case 'bookmark':
      return `<p>🔗 <a href="${feishuEscAttr(block.url)}">${feishuEsc(block.text || block.url)}</a></p>`;

    case 'todo':
      if (block.checked) {
        return `<p>✅ <s>${feishuInline(block.content)}</s></p>`;
      }
      return `<p>☐ ${feishuInline(block.content)}</p>`;

    case 'table':
      return renderFeishuTable(block);

    case 'embed':
      return `<p>📎 ${feishuEsc(block.title || '嵌入内容')}${block.url ? '：' + feishuEsc(block.url) : ''}</p>`;

    case 'column_list':
      if (!block.columns) return '';
      return block.columns.map(col =>
        col.map(b => renderFeishuBlock(b, links, depth)).join('')
      ).join('');

    default:
      return '';
  }
}

// ── 代码块 ──────────────────────────────────────────────────────────────────

function renderFeishuCode(block) {
  const lang = (block.language || '').toLowerCase().trim();
  const code = feishuEsc(block.content || '');
  return `<pre><code${lang ? ` class="language-${lang}"` : ''}>${code}</code></pre>`;
}

// ── 列表 ────────────────────────────────────────────────────────────────────

function renderFeishuList(items, isOrdered, links, depth) {
  if (!items || items.length === 0) return '';
  const tag = isOrdered ? 'ol' : 'ul';
  const lis = items.map(item => {
    let nested = '';
    if (item.children && item.children.length > 0) {
      for (const child of item.children) {
        nested += renderFeishuBlock(child, links, depth + 1);
      }
    }
    return `<li>${feishuInline(item.content)}${nested}</li>`;
  }).join('');
  return `<${tag}>${lis}</${tag}>`;
}

// ── 图片 ────────────────────────────────────────────────────────────────────

function renderFeishuImage(block) {
  const src = block.base64 || block.url;
  if (!src) return '';
  const cap = block.caption
    ? `<p style="text-align:center;font-size:12px;color:#888">${feishuEsc(block.caption)}</p>`
    : '';
  return `<p style="text-align:center"><img src="${feishuEscAttr(src)}" alt="${feishuEscAttr(block.caption || '图片')}" style="max-width:100%" /></p>${cap}`;
}

// ── 表格 ────────────────────────────────────────────────────────────────────

function renderFeishuTable(block) {
  if (!block.rows || block.rows.length === 0) return '';
  let rows = '';
  block.rows.forEach((row, ri) => {
    const isHeader = row.isHeader || ri === 0;
    const tag = isHeader ? 'th' : 'td';
    const cells = (row.cells || []).map(cell =>
      `<${tag}>${feishuInline(cell)}</${tag}>`
    ).join('');
    rows += `<tr>${cells}</tr>`;
  });
  return `<table>${rows}</table>`;
}

// ── 脚注 ────────────────────────────────────────────────────────────────────

function renderFeishuFootnotes(links) {
  const items = links.map((link, i) =>
    `<p>[${i + 1}] ${feishuEsc(link.text)}：${feishuEsc(link.url)}</p>`
  ).join('');
  return `<hr><p><strong>参考资料</strong></p>${items}`;
}

// ── 内联样式处理 ──────────────────────────────────────────────────────────

function feishuInline(html) {
  if (!html) return '';
  // 保留 strong/em/code/s/u 语义标签，飞书编辑器原生支持
  // 将 sup 脚注标记保留为纯文本上标
  return html
    .replace(/<a\s+href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g,
      '<a href="$1">$2</a>');
}

// ── 工具函数 ──────────────────────────────────────────────────────────────

function feishuEsc(text) {
  return String(text || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function feishuEscAttr(text) {
  return String(text || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

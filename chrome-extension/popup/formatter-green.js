(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.renderGreenArticle = api.renderGreenArticle; root.GreenFmt = api; }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // h2/h3 递增计数器（全局简单递增；renderGreenArticle 每次新建）
  function makeSeqCounter() {
    const n = { h2: 0, h3: 0 };
    return { next(type) { n[type] = (n[type] || 0) + 1; return n[type]; } };
  }

  function _img(dataUrl, style, alt) {
    return `<img src="${dataUrl}" style="${style}" alt="${alt || ''}" />`;
  }

  function _heading(G, content, level, seq, SS, EH) {
    const text = content || '';
    if (G && typeof G.renderHeadingImage === 'function') {
      return G.renderHeadingImage(text, level, seq != null ? { seq } : undefined);
    }
    // 兜底：GreenStyle 未加载时退化为绿色文字标题
    const key = 'h' + level;
    return `<section style="${(SS && SS[key]) || 'color:#327847;font-weight:bold;'}">${EH(text)}</section>`;
  }

  // 去 HTML 标签 + 基本实体（标题走 canvas 画图，需纯文字）
  function _plain(s) {
    return String(s || '').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  }

  // 仅表情/符号、无实际文字 → true（Notion 里作者把单个 emoji 设成标题当装饰，不应渲染成标题）
  function _isSymbolOnly(s) {
    const t = String(s || '').trim();
    if (!t) return false;
    const stripped = t.replace(/[\u{1F000}-\u{1FAFF}\u{2190}-\u{21FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}\s]/gu, '');
    return stripped === '';
  }

  function renderGreenBlock(block, links, depth, seq, trailingBlanks) {
    if (!block) return '';
    const W = (typeof window !== 'undefined') ? window : {};
    const G = W.GreenStyle || {};
    const D = W.GREEN_DECOR || {};
    const SS = W.S || (typeof S !== 'undefined' ? S : {});
    const P = W.pi || (typeof pi !== 'undefined' ? pi : (x) => x || '');
    const EH = W.escHtml || (typeof escHtml !== 'undefined' ? escHtml : (x) => x || '');
    const EA = W.escAttr || (typeof escAttr !== 'undefined' ? escAttr : (x) => x || '');
    // 本块后面跟的空行 → 折进本块的下边距（微信删空段，靠 margin 保留间距）。每空行 = 一个行高 24px
    const blankGap = Math.min(trailingBlanks || 0, 3) * 24;

    // 标题：取纯文字（剥 HTML 标签）；仅表情/符号 → 居中表情行，不走大丰收标题图
    if (/^h[1-6]$/.test(block.type)) {
      const ht = _plain(block.content);
      if (_isSymbolOnly(ht)) {
        return `<p style="text-align:center;margin:14px 0;font-size:26px;line-height:1.4;">${EH(ht)}</p>`;
      }
      const lv = +block.type[1];
      const seqn = (lv === 2 || lv === 3) ? seq.next(block.type) : null;
      return _heading(G, ht, lv, seqn, SS, EH);
    }

    switch (block.type) {

      case 'paragraph': {
        const t = (block.content || '').replace(/​/g, '').trim();
        // 空段落（Notion 空行）由 renderGreenArticle 折叠进前一段 padding，这里直接跳过（微信会删空段）
        if (!t) return '';
        // trailingBlanks：本段后面跟了几个空行 → 段间距加大（合设计稿“普通段~40px”），无空行则 17px（“紧凑”）
        const extra = Math.min(trailingBlanks || 0, 3) * 24;
        const style = extra ? `${SS.p};padding-bottom:${24 + extra}px` : SS.p;
        return `<p style="${style}">${P(block.content)}</p>`;
      }

      case 'quote':
        // 引号小图 + CSS 绿字（字号=正文、可选中）；后接空行加大下边距
        return `<section style="margin:22px 0 ${22 + blankGap}px;">`
          + _img(D.quote, 'width:27px;height:auto;display:block;margin:0 0 6px 0;', '引用')
          + `<p style="${SS.blockquote_text};padding-left:42px;">${P(block.content)}</p>`
          + `</section>`;

      case 'callout':
        return `<section style="${SS.callout_wrapper};margin-bottom:${22 + blankGap}px;">${P(block.content)}</section>`;

      case 'divider':
        return `<section style="margin:18px 0 ${18 + blankGap}px;text-align:center;line-height:0;">`
          + _img(D.divider, 'width:100%;display:block;', '分割线') + `</section>`;

      case 'bulleted_list': return renderGreenList(block.items, false, depth, seq, links);
      case 'numbered_list': return renderGreenList(block.items, true, depth, seq, links);

      case 'todo': {
        const box = block.checked ? D.todo_checked : D.todo_empty;
        return `<p style="${SS.todo_item}">`
          + _img(box, 'width:16px;height:16px;display:inline-block;vertical-align:-2px;margin-right:8px;', '')
          + P(block.content) + `</p>`;
      }

      case 'image': {
        const src = block.base64 || block.url; if (!src) return '';
        const cap = block.caption ? `<p style="${SS.img_caption}">${EH(block.caption)}</p>` : '';
        return `<section style="${SS.img_wrapper}"><img src="${EA(src)}" style="${SS.img}" alt="${EA(block.caption || '图片')}" />${cap}</section>`;
      }

      case 'embed':
        return `<section style="${SS.embed_wrapper}"><p style="${SS.embed_label}">📎 ${EH(block.title || '嵌入内容')}</p>${block.url ? `<p style="${SS.embed_link}">${EH(block.url)}</p>` : ''}</section>`;

      case 'toggle':
        return `<section style="${SS.toggle_summary}">▶ ${P(block.content || '')}</section>`
          + (block.children ? `<section style="${SS.toggle_content}">${block.children.map((b) => renderGreenBlock(b, links, depth + 1, seq)).join('')}</section>` : '');

      case 'code':
      case 'video':
      case 'table':
      case 'bookmark':
      case 'column_list':
        return W.renderBlock ? W.renderBlock(block, links, depth) : '';

      default: return '';
    }
  }

  function renderGreenList(items, isOrdered, depth, seq, links) {
    if (!items || !items.length) return '';
    const W = (typeof window !== 'undefined') ? window : {};
    const P = W.pi || (typeof pi !== 'undefined' ? pi : (x) => x || '');
    const indent = depth > 0 ? `padding-left:${depth * 1.5}em;` : '';
    let html = '';
    items.forEach((item, i) => {
      let nested = '';
      if (item.children && item.children.length) for (const c of item.children) nested += renderGreenBlock(c, links || [], depth + 1, seq);
      if (isOrdered) {
        const num = String(i + 1).padStart(2, '0');
        html += `<section style="display:flex;align-items:baseline;margin:0 0 28px 0;${indent}">`
          + `<span style="flex:none;font-family:'PingFang SC',sans-serif;font-size:18px;font-weight:600;color:#327847;margin-right:12px;">${num}</span>`
          + `<p style="flex:1;font-size:15px;line-height:1.27;letter-spacing:0.1em;color:#327847;margin:0;">${P(item.content)}</p></section>${nested}`;
      } else {
        html += `<p style="font-size:15px;line-height:1.27;letter-spacing:0.1em;color:#327847;margin:0 0 6px 0;${indent}">`
          + `<span style="color:#327847;margin-right:0.5em;">•</span>${P(item.content)}</p>${nested}`;
      }
    });
    return html;
  }

  function renderGreenArticle(parsedData) {
    if (!parsedData || !parsedData.blocks) return '<p style="color:red">解析数据为空</p>';
    const W = (typeof window !== 'undefined') ? window : {};
    const SS = W.S || (typeof S !== 'undefined' ? S : {});
    const { blocks, links = [] } = parsedData;
    const seq = makeSeqCounter();
    let start = 0;
    while (start < blocks.length) {
      const b = blocks[start];
      if (b.type === 'paragraph' && !(b.content || '').replace(/​/g, '').trim()) { start++; continue; }
      break;
    }
    const isBlank = (b) => b && b.type === 'paragraph' && !(b.content || '').replace(/​/g, '').trim();
    let html = '';
    for (let i = start; i < blocks.length; i++) {
      if (isBlank(blocks[i])) continue;                  // 空行不单独渲染（微信会删），折叠进前一段
      let trailingBlanks = 0;
      let j = i + 1;
      while (j < blocks.length && isBlank(blocks[j])) { trailingBlanks++; j++; }
      html += renderGreenBlock(blocks[i], links, 0, seq, trailingBlanks);
    }
    if (links.length && W.renderFootnotes) html += W.renderFootnotes(links);
    return `<section style="${SS.wrapper}">${html}</section>`;
  }

  return { makeSeqCounter, renderGreenArticle, renderGreenBlock, renderGreenList };
});

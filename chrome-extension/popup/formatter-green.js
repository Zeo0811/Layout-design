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

  function renderGreenBlock(block, links, depth, seq) {
    if (!block) return '';
    const W = (typeof window !== 'undefined') ? window : {};
    const G = W.GreenStyle || {};
    const D = W.GREEN_DECOR || {};
    const SS = W.S || (typeof S !== 'undefined' ? S : {});
    const P = W.pi || (typeof pi !== 'undefined' ? pi : (x) => x || '');
    const EH = W.escHtml || (typeof escHtml !== 'undefined' ? escHtml : (x) => x || '');
    const EA = W.escAttr || (typeof escAttr !== 'undefined' ? escAttr : (x) => x || '');

    switch (block.type) {
      case 'h1': return _heading(G, block.content, 1, null, SS, EH);
      case 'h2': return _heading(G, block.content, 2, seq.next('h2'), SS, EH);
      case 'h3': return _heading(G, block.content, 3, seq.next('h3'), SS, EH);
      case 'h4': return _heading(G, block.content, 4, null, SS, EH);
      case 'h5': return _heading(G, block.content, 5, null, SS, EH);
      case 'h6': return _heading(G, block.content, 6, null, SS, EH);

      case 'paragraph': {
        const t = (block.content || '').replace(/​/g, '').trim();
        if (!t) return '<br>';
        return `<p style="${SS.p}">${P(block.content)}</p>`;
      }

      case 'quote':
        // 微信安全：用 table 实现「引号在左、正文向右缩进且有间距」（避开被微信剥离的 position:absolute）
        return `<section style="margin:22px 0;"><table style="border-collapse:collapse;width:100%;border:none;table-layout:fixed;"><tbody><tr>`
          + `<td style="width:48px;vertical-align:top;padding:0;border:none;">`
          + _img(D.quote, 'width:30px;height:auto;display:block;', '引用') + `</td>`
          + `<td style="vertical-align:top;padding:6px 0 0 0;border:none;"><p style="${SS.blockquote_text}">${P(block.content)}</p></td>`
          + `</tr></tbody></table></section>`;

      case 'callout':
        return `<section style="${SS.callout_wrapper}">${P(block.content)}</section>`;

      case 'divider':
        return `<section style="margin:18px 0;text-align:center;line-height:0;">`
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
    let html = '';
    for (let i = start; i < blocks.length; i++) html += renderGreenBlock(blocks[i], links, 0, seq);
    if (links.length && W.renderFootnotes) html += W.renderFootnotes(links);
    return `<section style="${SS.wrapper}">${html}</section>`;
  }

  return { makeSeqCounter, renderGreenArticle, renderGreenBlock, renderGreenList };
});

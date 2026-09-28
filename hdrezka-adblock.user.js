// ==UserScript==
// @name         HDRezka mirror: ad cleaner v3
// @match        *://wandavision-hdrezka.net/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';
  const TAG = '[AB]';

  const AD_HOSTS = [
    'voidnetwork.cloud',
    'deltarockme.com',
    'miceonme.com',
    'temptcdn.com',
    's2517.com',
    'ufouxbwn.com',
    'kinzazaza.org',
  ];
  const EMPTY_VAST_XML = '<VAST version="3.0"></VAST>';
  const EMPTY_VAST = 'data:text/xml,' + encodeURIComponent(EMPTY_VAST_XML);

  function isAd(url) {
    try {
      const s = String(url);
      const h = new URL(s, location.href).hostname;
      return AD_HOSTS.some(d => h === d || h.endsWith('.' + d)) || /\/(vast|vmap|vpaid)\b/i.test(s);
    } catch (e) { return false; }
  }

  function isAdMedia(url) {
    const s = String(url || '');
    if (!s || s.startsWith('blob:')) return false;
    return isAd(s) || /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(s);
  }

  console.log(TAG, 'v3 старт, readyState =', document.readyState);

  function patchWindow(w, label) {
    try {
      if (!w || w.__abPatched) return;
      w.__abPatched = true;
    } catch (e) { return; }

    try {
      const xo = w.XMLHttpRequest.prototype.open;
      w.XMLHttpRequest.prototype.open = function (m, u, ...r) {
        if (isAd(u)) { console.log(TAG, label, 'XHR → пустой VAST:', String(u).slice(0, 120)); u = EMPTY_VAST; }
        return xo.call(this, m, u, ...r);
      };
    } catch (e) {}
    try {
      const f = w.fetch;
      if (f) w.fetch = function (input, init) {
        const s = String((input && input.url) || input);
        if (isAd(s)) {
          console.log(TAG, label, 'fetch → пустой VAST:', s.slice(0, 120));
          return Promise.resolve(new w.Response(EMPTY_VAST_XML, { headers: { 'Content-Type': 'text/xml' } }));
        }
        return f.call(this, input, init);
      };
    } catch (e) {}

    try {
      w.open = function (url) { console.log(TAG, label, 'заблокирован window.open:', url); return null; };
    } catch (e) {}

    try { patchDom(w, label); } catch (e) {}
    try { patchMedia(w, label); } catch (e) {}
  }

  function blockNode(node, label) {
    if (!node || node.nodeType !== 1) return false;
    const tag = node.tagName;
    if ((tag === 'SCRIPT' || tag === 'IFRAME' || tag === 'IMG') && node.src && isAd(node.src)) {
      console.log(TAG, label, 'заблокирован <' + tag.toLowerCase() + '>:', node.src.slice(0, 120));
      return true;
    }
    return false;
  }

  function patchDom(w, label) {
    const P = w.Node.prototype;
    for (const name of ['appendChild', 'insertBefore']) {
      const orig = P[name];
      P[name] = function (node, ...rest) {
        if (blockNode(node, label)) return node;
        return orig.call(this, node, ...rest);
      };
    }
    const IP = w.HTMLIFrameElement.prototype;
    const cw = Object.getOwnPropertyDescriptor(IP, 'contentWindow');
    const cd = Object.getOwnPropertyDescriptor(IP, 'contentDocument');
    if (cw && cw.get) Object.defineProperty(IP, 'contentWindow', {
      configurable: true, enumerable: cw.enumerable,
      get() { const x = cw.get.call(this); patchWindow(x, '[iframe]'); return x; }
    });
    if (cd && cd.get) Object.defineProperty(IP, 'contentDocument', {
      configurable: true, enumerable: cd.enumerable,
      get() { const d = cd.get.call(this); if (d) patchWindow(d.defaultView, '[iframe]'); return d; }
    });
  }

  function killAd(el, url, label) {
    console.log(TAG, label, 'рекламное видео не загружено:', String(url).slice(0, 120));
    if (!el) return;
    try { el.style.visibility = 'hidden'; } catch (e) {}
    setTimeout(() => { try { el.dispatchEvent(new Event('error')); } catch (e) {} }, 0);
  }

  function patchMedia(w, label) {
    const MP = w.HTMLMediaElement.prototype;
    const d = Object.getOwnPropertyDescriptor(MP, 'src');
    if (d && d.set) Object.defineProperty(MP, 'src', {
      configurable: true, enumerable: d.enumerable,
      get() { return d.get.call(this); },
      set(v) { if (isAdMedia(v)) { killAd(this, v, label); return; } d.set.call(this, v); }
    });
    const SP = w.HTMLSourceElement.prototype;
    const ds = Object.getOwnPropertyDescriptor(SP, 'src');
    if (ds && ds.set) Object.defineProperty(SP, 'src', {
      configurable: true, enumerable: ds.enumerable,
      get() { return ds.get.call(this); },
      set(v) { if (isAdMedia(v)) { killAd(this.parentElement, v, label); return; } ds.set.call(this, v); }
    });
    const sa = w.Element.prototype.setAttribute;
    w.Element.prototype.setAttribute = function (name, value) {
      const t = this.tagName;
      if (String(name).toLowerCase() === 'src' && (t === 'VIDEO' || t === 'AUDIO' || t === 'SOURCE') && isAdMedia(value)) {
        killAd(t === 'SOURCE' ? this.parentElement : this, value, label);
        return;
      }
      return sa.call(this, name, value);
    };
  }

  patchWindow(window, '[top]');

  function allDocs() {
    const docs = [document];
    for (const f of document.querySelectorAll('iframe')) {
      try { if (f.contentDocument) docs.push(f.contentDocument); } catch (e) {}
    }
    return docs;
  }

  function clickSkip(doc) {
    for (const el of doc.querySelectorAll('button, a, div, span')) {
      if (el.childElementCount === 0 && el.offsetParent !== null &&
          /^(пропустить|skip)/i.test((el.textContent || '').trim())) {
        el.click();
        console.log(TAG, 'нажата кнопка пропуска');
        return;
      }
    }
  }

  setInterval(() => {
    for (const doc of allDocs()) {
      for (const v of doc.querySelectorAll('video')) {
        const s = v.currentSrc || v.src;
        if (!isAdMedia(s)) continue;
        if (!v.__abSeen) { v.__abSeen = true; console.log(TAG, 'найдено рекламное видео, проматываю:', s.slice(0, 120)); }
        v.muted = true;
        v.style.visibility = 'hidden';
        try { v.playbackRate = 16; } catch (e) {}
        if (isFinite(v.duration) && v.duration > 0 && v.currentTime < v.duration - 0.2) v.currentTime = v.duration;
      }
      clickSkip(doc);
    }
  }, 300);

  const mo = new MutationObserver(muts => {
    for (const m of muts) for (const n of m.addedNodes) {
      if (blockNode(n, '[html]')) { n.remove(); continue; }
      if (n.tagName === 'IFRAME') { try { patchWindow(n.contentWindow, '[iframe]'); } catch (e) {} }
    }
  });
  mo.observe(document, { childList: true, subtree: true });
})();

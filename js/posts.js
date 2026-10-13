/* Posts — loads live posts from the Post Studio API.
   New / edited / deleted posts show up immediately: every page load fetches fresh data
   and an open page is refreshed through a live stream (with polling as a fallback). */
(function () {
  const page = document.body.dataset.page;
  if (page !== 'posts' && page !== 'post') return;

  const API = ((window.SITE_CONFIG && window.SITE_CONFIG.API_BASE) || '').replace(/\/+$/, '');
  const $ = (s, c = document) => c.querySelector(s);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const abs = u => !u ? '' : /^https?:|^data:/i.test(u) ? u : API + u;
  const fmtDate = iso => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

  const notConnected = /YOUR-STUDIO/.test(API);
  async function get(path) {
    const r = await fetch(API + path, { cache: 'no-store' });
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; throw e; }
    return r.json();
  }

  /* Live updates: re-run `refresh` whenever the Studio publishes a change */
  function live(refresh) {
    let timer = null;
    const poll = () => { clearInterval(timer); timer = setInterval(() => { if (!document.hidden) refresh(); }, 10000); };
    if (notConnected) return;
    if ('EventSource' in window) {
      try {
        const es = new EventSource(API + '/api/public/stream');
        es.onmessage = () => refresh();
        es.onerror = () => { es.close(); poll(); };
      } catch (e) { poll(); }
    } else poll();
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  }

  /* ---------------- list page ---------------- */
  if (page === 'posts') {
    const grid = $('#postGrid'), cats = $('#postCats'), search = $('#postSearch'), more = $('#postMore');
    let all = [], cat = '', q = '', shown = 9;
    const PAGE = 9;

    const state = (msg, cls) => { grid.replaceChildren(el('div', 'post-state ' + (cls || ''), msg)); more.hidden = true; };

    function buildCats() {
      const names = [...new Set(all.map(p => p.category).filter(Boolean))].sort();
      if (cat && !names.includes(cat)) cat = '';
      cats.replaceChildren();
      if (!names.length) return;
      [['', 'All'], ...names.map(n => [n, n])].forEach(([val, label]) => {
        const b = el('button', 'chip' + (val === cat ? ' on' : ''), label);
        b.type = 'button'; b.addEventListener('click', () => { cat = val; shown = PAGE; buildCats(); render(); });
        cats.appendChild(b);
      });
    }

    function card(p) {
      const a = el('a', 'post-card' + (p.cover ? '' : ' no-cover')); a.href = 'post.html?slug=' + encodeURIComponent(p.slug);
      let media = null;
      if (p.cover) {
        media = el('div', 'post-cover');
        const i = el('img'); i.src = abs(p.cover); i.alt = ''; i.loading = 'lazy';
        i.addEventListener('error', () => { media.remove(); a.classList.add('no-cover'); });      // broken image -> clean text card
        media.appendChild(i);
      }
      const body = el('div', 'post-body-sm');
      const meta = el('div', 'post-meta');
      meta.append(el('span', null, fmtDate(p.publishedAt)), el('span', null, p.readingTime + ' min read'));
      body.append(meta, el('h3', null, p.title), el('p', null, p.excerpt));
      const foot = el('div', 'post-foot');
      if (p.category) foot.appendChild(el('span', 'tagpill cat', p.category));
      (p.tags || []).slice(0, 3).forEach(t => foot.appendChild(el('span', 'tagpill', '#' + t)));
      body.appendChild(foot);
      media ? a.append(media, body) : a.append(body);
      return a;
    }

    function render() {
      const term = q.trim().toLowerCase();
      const list = all.filter(p => (!cat || p.category === cat) &&
        (!term || (p.title + ' ' + p.excerpt + ' ' + (p.tags || []).join(' ') + ' ' + (p.category || '')).toLowerCase().includes(term)));
      if (!all.length) return state('No posts yet — check back soon!');
      if (!list.length) return state('No posts match your search.');
      grid.replaceChildren(...list.slice(0, shown).map(card));
      more.hidden = list.length <= shown;
    }

    async function load(first) {
      if (notConnected) return state('The Posts page is not connected to the Post Studio yet. (Set STUDIO_URL in js/config.js.)', 'err');
      try {
        const d = await get('/api/public/posts?limit=200');
        const sig = JSON.stringify(d.posts.map(p => [p.id, p.updatedAt]));
        if (!first && sig === load.sig) return;
        load.sig = sig; all = d.posts; buildCats(); render();
      } catch (e) {
        if (first || !all.length) state('Posts could not be loaded right now. Please try again in a moment.', 'err');
      }
    }
    search.addEventListener('input', () => { q = search.value; shown = PAGE; render(); });
    more.addEventListener('click', () => { shown += PAGE; render(); });
    load(true); live(() => load(false));
  }


  /* ---------------- photo gallery (lightbox) with fit-to-screen + zoom ---------------- */
  function makeZoomer(stage, img, onChange) {
    let nw = 0, nh = 0, s = 1, fit = 1, tx = 0, ty = 0, gStart = 1, drag = null, pinch = null;
    const pts = new Map();
    const box = () => stage.getBoundingClientRect();
    const maxS = () => Math.max(fit * 10, 4);
    function clampPan() { const r = box(), w = nw * s, hh = nh * s; tx = w <= r.width ? (r.width - w) / 2 : Math.min(0, Math.max(r.width - w, tx)); ty = hh <= r.height ? (r.height - hh) / 2 : Math.min(0, Math.max(r.height - hh, ty)); }
    function apply() { clampPan(); img.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + s + ')'; stage.classList.toggle('zoomed', s > fit * 1.02); onChange && onChange(s, fit); }
    function layout(forceFit) {
      const r = box(); if (!nw || !r.width || !r.height) return;
      const old = fit, wasFit = Math.abs(s - old) < 0.001;
      fit = Math.min(r.width / nw, r.height / nh, 2);
      s = forceFit || wasFit ? fit : Math.min(maxS(), Math.max(fit, (s / old) * fit)); apply();
    }
    function zoomAt(f, cx, cy) { const ns = Math.min(maxS(), Math.max(fit, s * f)); if (ns === s) return; tx = cx - (cx - tx) * (ns / s); ty = cy - (cy - ty) * (ns / s); s = ns; apply(); }
    const center = () => { const r = box(); return [r.width / 2, r.height / 2]; };
    function load(src) {
      img.style.visibility = 'hidden'; nw = nh = 0;
      img.onload = () => { nw = img.naturalWidth; nh = img.naturalHeight; img.style.width = nw + 'px'; img.style.height = nh + 'px'; s = fit = 1; layout(true); img.style.visibility = 'visible'; };
      img.src = src;
    }
    stage.addEventListener('wheel', e => {
      e.preventDefault(); if (!nw) return;
      const r = box(); let dx = e.deltaX, dy = e.deltaY; if (e.deltaMode === 1) { dx *= 16; dy *= 16; } else if (e.deltaMode === 2) { dx *= 300; dy *= 300; }
      if (!e.ctrlKey && s > fit * 1.02 && Math.abs(dx) > Math.abs(dy)) { tx -= dx; apply(); return; }
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.012 : 0.0028)), e.clientX - r.left, e.clientY - r.top);        // touchpad pinch (ctrl+wheel), mouse wheel, two-finger scroll
    }, { passive: false });
    stage.addEventListener('pointerdown', e => {
      if (e.button > 0) return; stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) drag = { x: e.clientX, y: e.clientY, tx: tx, ty: ty, moved: false };
      if (pts.size === 2) { const v = [...pts.values()]; pinch = { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1, s: s }; drag = null; }
    });
    stage.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) { const v = [...pts.values()], r = box(), d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1; zoomAt((pinch.s * d / pinch.d) / s, (v[0].x + v[1].x) / 2 - r.left, (v[0].y + v[1].y) / 2 - r.top); }
      else if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true; if (drag.moved) { tx = drag.tx + dx; ty = drag.ty + dy; apply(); } }
    });
    const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (pts.size === 0) { const wasTap = drag && !drag.moved; drag = null; if (wasTap && stage.onTap) stage.onTap(e); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('dblclick', e => { if (!nw) return; const r = box(); if (s > fit * 1.05) { s = fit; apply(); } else zoomAt(Math.max(2.5, 1.2 / fit), e.clientX - r.left, e.clientY - r.top); });
    stage.addEventListener('gesturestart', e => { e.preventDefault(); gStart = s; });                   // Safari touchpad pinch
    stage.addEventListener('gesturechange', e => { e.preventDefault(); const c = center(); zoomAt((gStart * e.scale) / s, c[0], c[1]); });
    const onResize = () => layout(false); addEventListener('resize', onResize);
    return { load: load, zoomBy: f => { const c = center(); zoomAt(f, c[0], c[1]); }, reset: () => { s = fit; apply(); }, destroy: () => removeEventListener('resize', onResize) };
  }

  function openGallery(items, start) {
    let i = start, touchX = null;
    const prevFocus = document.activeElement;
    const img = el('img'); img.alt = ''; img.draggable = false;
    const cap = el('div', 'lb-cap'), count = el('div', 'lb-count'), pct = el('span', 'lb-pct', '100%');
    const stage = el('div', 'lb-stage'); stage.appendChild(img);
    const z = makeZoomer(stage, img, s => { pct.textContent = Math.round(s * 100) + '%'; });
    const btn = (cls, label, txt, fn) => { const b = el('button', cls, txt); b.type = 'button'; b.setAttribute('aria-label', label); b.title = label; b.addEventListener('click', fn); return b; };
    const closeBtn = btn('lb-close', 'Close', '✕', () => close());
    const prev = btn('lb-nav lb-prev', 'Previous photo', '‹', () => go(-1)), next = btn('lb-nav lb-next', 'Next photo', '›', () => go(1));
    const tools = el('div', 'lb-tools');
    tools.append(btn('lb-t', 'Zoom out', '−', () => z.zoomBy(0.8)), pct, btn('lb-t', 'Zoom in', '+', () => z.zoomBy(1.25)), btn('lb-t lb-fit', 'Fit to screen', 'Fit', () => z.reset()));
    const root = el('div', 'lb'); root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Photo viewer');
    root.append(count, tools, closeBtn, stage, prev, next, cap);
    stage.onTap = e => { const r = img.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) close(); };
    function show() {
      z.load(items[i].src); cap.textContent = items[i].caption || ''; cap.hidden = !items[i].caption;
      count.textContent = items.length > 1 ? (i + 1) + ' / ' + items.length : ''; prev.hidden = next.hidden = items.length < 2;
      [items[i + 1], items[i - 1]].forEach(n => { if (n) new Image().src = n.src; });
    }
    function go(d) { i = (i + d + items.length) % items.length; show(); }
    function close() { document.removeEventListener('keydown', onKey, true); z.destroy(); root.remove(); document.documentElement.style.overflow = ''; if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true }); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft' && items.length > 1) go(-1);
      else if (e.key === 'ArrowRight' && items.length > 1) go(1);
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); z.zoomBy(1.25); }
      else if (e.key === '-') { e.preventDefault(); z.zoomBy(0.8); }
      else if (e.key === '0') { e.preventDefault(); z.reset(); }
      else if (e.key === 'Tab') { e.preventDefault(); closeBtn.focus(); }
    }
    root.addEventListener('touchstart', e => { touchX = (e.touches.length === 1 && !stage.classList.contains('zoomed')) ? e.touches[0].clientX : null; }, { passive: true });
    root.addEventListener('touchend', e => { if (touchX == null || items.length < 2 || stage.classList.contains('zoomed')) return; const dx = e.changedTouches[0].clientX - touchX; if (Math.abs(dx) > 70) go(dx < 0 ? 1 : -1); touchX = null; });
    document.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden'; document.body.appendChild(root); show(); closeBtn.focus();
  }

  /* ---------------- reader statistics (shown only to the site owner, in the Studio) ----------------
     Counts one view per post per visit, plus reading time and how far the post was read.
     No personal details are collected; the reader is identified only by a random ID kept in their own browser. */
  function trackPost(post) {
    if (notConnected) return;
    let store = null, session = null;
    try { store = window.localStorage; session = window.sessionStorage; } catch (e) { /* storage blocked */ }
    try { if (store && store.getItem('sd_owner') === '1') return; } catch (e) { /* ignore */ }      // the site owner's own visits are not counted
    const seenKey = 'sd_seen_' + post.slug;
    try { if (session && session.getItem(seenKey)) return; if (session) session.setItem(seenKey, '1'); } catch (e) { /* ignore */ }
    let vid = null, returning = false;
    try { vid = store && store.getItem('sd_vid'); returning = !!vid; if (!vid) { vid = (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now().toString(36)).replace(/[^\w-]/g, '').slice(0, 40); if (store) store.setItem('sd_vid', vid); } } catch (e) { vid = vid || ('v' + Math.random().toString(36).slice(2) + Date.now().toString(36)); }
    let ref = '', internal = false;
    try { if (document.referrer) { const u = new URL(document.referrer); ref = u.hostname; internal = u.host === location.host; } } catch (e) { /* ignore */ }
    const url = API + '/api/public/';
    fetch(url + 'view', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ slug: post.slug, vid: vid, ret: returning, ref: ref, int: internal, w: window.innerWidth }), keepalive: true }).catch(() => {});

    let activeMs = 0, startedAt = document.hidden ? null : Date.now(), sentMs = 0, sentDepth = 0, maxDepth = 0, reached = [], sentReached = [], raf = 0;
    const pause = () => { if (startedAt) { activeMs += Date.now() - startedAt; startedAt = null; } };
    const measure = () => {
      raf = 0; const body = document.querySelector('.post-content'); if (!body) return;
      const r = body.getBoundingClientRect(); if (!r.height) return;
      const d = Math.max(0, Math.min(100, ((window.innerHeight - r.top) / r.height) * 100));
      if (d > maxDepth) maxDepth = Math.round(d);
      [25, 50, 75, 100].forEach(m => { if (maxDepth >= (m === 100 ? 97 : m) && !reached.includes(m)) reached.push(m); });
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(measure); };
    addEventListener('scroll', schedule, { passive: true }); addEventListener('resize', schedule); setTimeout(measure, 600);
    const flush = () => {
      pause(); measure();
      const sec = Math.round((activeMs - sentMs) / 1000), dd = maxDepth - sentDepth, ms = reached.filter(m => !sentReached.includes(m));
      if (!sec && !dd && !ms.length) return;
      sentMs += sec * 1000; sentDepth = maxDepth; sentReached = reached.slice();
      const body = JSON.stringify({ slug: post.slug, vid: vid, sec: sec, dd: dd, ms: ms });
      try { if (!(navigator.sendBeacon && navigator.sendBeacon(url + 'engage', new Blob([body], { type: 'text/plain' })))) throw 0; }
      catch (e) { fetch(url + 'engage', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: body, keepalive: true }).catch(() => {}); }
    };
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); else if (!startedAt) startedAt = Date.now(); });
    addEventListener('pagehide', flush);
  }

  /* ---------------- single post page ---------------- */
  if (page === 'post') {
    const view = $('#postView');
    const slug = new URLSearchParams(location.search).get('slug');

    const fail = (title, msg) => {
      view.replaceChildren();
      const box = el('div', 'post-state');
      box.append(el('h2', null, title), el('p', null, msg));
      const b = el('a', 'btn primary', '← All posts'); b.href = 'posts.html'; b.style.marginTop = '18px';
      box.appendChild(b); view.appendChild(box);
    };

    function render(p) {
      document.title = p.title + ' | Supriya Dutta';
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = p.excerpt;
      view.replaceChildren();
      const back = el('a', 'post-back', '← All posts'); back.href = 'posts.html';
      const head = el('header', 'post-head');
      const meta = el('div', 'post-meta');
      meta.append(el('span', null, fmtDate(p.publishedAt)), el('span', null, p.readingTime + ' min read'));
      if (p.category) meta.appendChild(el('span', 'tagpill cat', p.category));
      head.append(back, meta, el('h1', null, p.title));
      view.appendChild(head);
      const body = el('div', 'post-content');
      // Content is sanitised by the Studio server before it is stored. Media paths are made absolute here.
      body.innerHTML = String(p.content || '').replace(/(src|href|poster)="(\/uploads\/[^"]*)"/g, (m, a, u) => a + '="' + API + u + '"');
      body.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
      const pics = [...body.querySelectorAll('img')].filter(i => !i.closest('a'));
      pics.forEach((img, n) => {
        img.tabIndex = 0; img.setAttribute('role', 'button'); img.setAttribute('aria-label', (img.alt ? img.alt + ' — ' : '') + 'open photo ' + (n + 1) + ' of ' + pics.length);
        const open = () => openGallery(pics.map(x => ({ src: x.currentSrc || x.src, caption: (x.closest('figure') && x.closest('figure').querySelector('figcaption') && x.closest('figure').querySelector('figcaption').textContent.trim()) || x.alt || '' })), n);
        img.addEventListener('click', open);
        img.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
      });
      view.appendChild(body);
      if ((p.tags || []).length) { const t = el('div', 'post-foot post-tags'); p.tags.forEach(x => t.appendChild(el('span', 'tagpill', '#' + x))); view.appendChild(t); }
      const share = el('div', 'post-share');
      const copy = el('button', 'btn ghost', '🔗 Copy link'); copy.type = 'button';
      copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); copy.textContent = '✅ Link copied'; setTimeout(() => copy.textContent = '🔗 Copy link', 2000); } catch (e) { prompt('Copy this link', location.href); } });
      share.appendChild(copy); view.appendChild(share);
    }

    async function load(first) {
      if (notConnected) return fail('Not connected', 'Set STUDIO_URL in js/config.js to show posts.');
      if (!slug) return fail('Post not found', 'This link is missing a post address.');
      try {
        const d = await get('/api/public/posts/' + encodeURIComponent(slug));
        if (!first && load.ver === d.post.updatedAt) return;
        load.ver = d.post.updatedAt;
        const y = scrollY; render(d.post); if (!first) scrollTo(0, y); else trackPost(d.post);
      } catch (e) {
        if (e.status === 404) fail('Post not found', 'This post may have been removed or is not published.');
        else if (first) fail('Could not load post', 'Please check your connection and try again.');
      }
    }
    load(true); live(() => load(false));
  }
})();

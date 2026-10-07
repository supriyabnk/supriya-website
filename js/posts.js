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
      const a = el('a', 'post-card'); a.href = 'post.html?slug=' + encodeURIComponent(p.slug);
      const media = el('div', 'post-cover');
      if (p.cover) { const i = el('img'); i.src = abs(p.cover); i.alt = ''; i.loading = 'lazy'; i.addEventListener('error', () => { i.remove(); media.classList.add('noimg'); media.textContent = '📝'; }); media.appendChild(i); }
      else { media.classList.add('noimg'); media.textContent = '📝'; }
      const body = el('div', 'post-body-sm');
      const meta = el('div', 'post-meta');
      meta.append(el('span', null, fmtDate(p.publishedAt)), el('span', null, p.readingTime + ' min read'));
      body.append(meta, el('h3', null, p.title), el('p', null, p.excerpt));
      const foot = el('div', 'post-foot');
      if (p.category) foot.appendChild(el('span', 'tagpill cat', p.category));
      (p.tags || []).slice(0, 3).forEach(t => foot.appendChild(el('span', 'tagpill', '#' + t)));
      body.appendChild(foot);
      a.append(media, body);
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

  /* ---------------- single post page ---------------- */
  if (page === 'post') {
    const view = $('#postView');
    const slug = new URLSearchParams(location.search).get('slug');

    const fail = (title, msg) => {
      view.replaceChildren();
      const box = el('div', 'post-state'); box.style.marginTop = '150px';
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
      if (p.cover) { const f = el('figure', 'post-hero'); const i = el('img'); i.src = abs(p.cover); i.alt = ''; f.appendChild(i); view.appendChild(f); }
      const body = el('div', 'post-content');
      // Content is sanitised by the Studio server before it is stored. Media paths are made absolute here.
      body.innerHTML = String(p.content || '').replace(/(src|href|poster)="(\/uploads\/[^"]*)"/g, (m, a, u) => a + '="' + API + u + '"');
      body.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener noreferrer'; });
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
        const y = scrollY; render(d.post); if (!first) scrollTo(0, y);
      } catch (e) {
        if (e.status === 404) fail('Post not found', 'This post may have been removed or is not published.');
        else if (first) fail('Could not load post', 'Please check your connection and try again.');
      }
    }
    load(true); live(() => load(false));
  }
})();

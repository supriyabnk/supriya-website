/* Supriya Dutta — interactions */
(function () {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* theme */
  const saved = localStorage.getItem('sd-theme');
  if (saved) document.documentElement.dataset.theme = saved;
  const tbtn = $('#themeBtn');
  const setIcon = () => tbtn && (tbtn.textContent = document.documentElement.dataset.theme === 'light' ? '🌙' : '☀️');
  setIcon();
  tbtn && tbtn.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('sd-theme', t);
    setIcon();
    window.dispatchEvent(new Event('themechange'));
  });

  /* mobile drawer menu */
  const burger = $('#burger'), menu = $('#menu');
  if (burger && menu) {
    const ov = document.createElement('div'); ov.className = 'nav-overlay'; document.body.appendChild(ov);
    const head = document.createElement('li'); head.className = 'drawer-head'; head.textContent = 'Menu'; menu.prepend(head);
    const foot = document.createElement('li'); foot.className = 'drawer-foot';
    foot.innerHTML = '<a class="btn primary" href="mailto:supriyaduttadbg@proton.me">✉️ Email</a><a class="btn ghost" href="contact.html">💬 Message</a>';
    menu.appendChild(foot);
    const setMenu = open => {
      menu.classList.toggle('open', open); ov.classList.toggle('show', open);
      burger.textContent = open ? '✕' : '☰'; burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setMenu(!menu.classList.contains('open')));
    ov.addEventListener('click', () => setMenu(false));
    menu.addEventListener('click', e => { if (e.target.closest('a.link')) setMenu(false); });
    addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
    addEventListener('resize', () => { if (innerWidth > 900) setMenu(false); });
  }

  /* active link */
  let here = location.pathname.split('/').pop() || 'index.html';
  if (here === 'post.html') here = 'posts.html';
  $$('nav a.link').forEach(a => { if (a.getAttribute('href') === here) a.classList.add('active'); });

  /* progress bar, back to top */
  const bar = $('#progress'), top = $('#toTop');
  addEventListener('scroll', () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (bar) bar.style.width = p * 100 + '%';
    top && top.classList.toggle('show', h.scrollTop > 500);
  }, { passive: true });
  top && top.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* cursor glow */
  const glow = $('#glow');
  addEventListener('pointermove', e => { if (glow) { glow.style.left = e.clientX + 'px'; glow.style.top = e.clientY + 'px'; } });

  /* reveal + skill bars */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('.fill', e.target).forEach(f => f.style.width = f.dataset.w + '%');
    io.unobserve(e.target);
  }), { threshold: .15 });
  $$('.reveal').forEach(el => io.observe(el));

  /* 3D tilt */
  $$('[data-tilt]').forEach(el => {
    const max = +el.dataset.tilt || 10;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = `perspective(900px) rotateY(${x * max * 2}deg) rotateX(${-y * max * 2}deg)`;
    });
    el.addEventListener('pointerleave', () => el.style.transform = '');
  });

  /* typewriter */
  const tw = $('#typed');
  if (tw) {
    const words = ['Banker', 'Scale-I Officer', 'M.Com Graduate', 'Rural Banking Professional'];
    let w = 0, c = 0, del = false;
    (function tick() {
      const word = words[w];
      tw.textContent = word.slice(0, c);
      if (!del && c === word.length) { del = true; return setTimeout(tick, 1500); }
      if (del && c === 0) { del = false; w = (w + 1) % words.length; }
      c += del ? -1 : 1;
      setTimeout(tick, del ? 45 : 90);
    })();
  }

  /* age from DOB 21/03/1993 */
  $$('[data-age]').forEach(el => {
    const d = new Date(1993, 2, 21), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n < new Date(n.getFullYear(), 2, 21)) a--;
    el.textContent = a;
  });

  /* photo fallback */
  $$('.frame img').forEach(img => img.addEventListener('error', () => {
    img.style.display = 'none';
    const m = img.parentElement.querySelector('.monogram'); if (m) m.style.display = 'flex';
  }));

  /* tabs */
  $$('.tabs').forEach(t => {
    $$('.tab', t).forEach(b => b.addEventListener('click', () => {
      $$('.tab', t).forEach(x => x.classList.remove('on')); b.classList.add('on');
      const scope = t.parentElement;
      $$('.panel', scope).forEach(p => p.classList.toggle('on', p.id === b.dataset.t));
    }));
  });

  /* accordion */
  $$('.acc-q').forEach(q => q.addEventListener('click', () => {
    const it = q.parentElement, a = $('.acc-a', it), open = it.classList.toggle('open');
    a.style.maxHeight = open ? a.scrollHeight + 'px' : 0;
  }));

  /* contact form — delivers straight to Supriya's inbox via FormSubmit */
  const form = $('#contactForm');
  if (form) {
    const msg = $('#message'), cnt = $('#cnt'), st = $('#status'), btn = $('#sendBtn');
    const show = (cls, text) => { st.className = 'status ' + cls; st.textContent = text; };
    msg.addEventListener('input', () => cnt.textContent = msg.value.length + ' / 1000');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (form._gotcha.value) return;
      const v = n => form[n].value.trim();
      if (!v('name') || !v('email') || !v('subject') || !v('message')) { show('err', '⚠️ Please fill in your name, email, subject and message.'); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) { show('err', '⚠️ Please enter a valid email address.'); return; }
      btn.disabled = true; btn.textContent = 'Sending…'; st.className = 'status';
      try {
        const r = await fetch('https://formsubmit.co/ajax/supriyaduttadbg@proton.me', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            name: v('name'), email: v('email'), phone: v('phone'), subject: v('subject'), message: v('message'),
            _replyto: v('email'), _subject: 'Portfolio message: ' + v('subject'), _template: 'table', _captcha: 'false'
          })
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || String(j.success) !== 'true') throw new Error(j.message || 'Server error');
        show('ok', '✅ Thank you, ' + v('name').split(' ')[0] + '! Your message has been sent to Supriya.');
        form.reset(); cnt.textContent = '0 / 1000';
      } catch (err) {
        if (/activat/i.test(err.message)) {
          show('ok', '📨 Almost done! This form is being set up for the first time. An activation email has been sent to the site owner. Once it is confirmed, messages will be delivered automatically. Please try again shortly.');
        } else {
          if (/activat/i.test(err.message)) show('err', '⏳ One-time setup: an activation email has been sent to supriyaduttadbg@proton.me. Once the "Activate Form" link in it is clicked, messages will be delivered. Please try again after activation.');
        else show('err', '⚠️ Your message could not be sent (' + err.message + '). Please try again in a moment.');
        }
      }
      btn.disabled = false; btn.textContent = 'Send Message ✈';
    });
  }

  /* year */
  $$('[data-year]').forEach(e => e.textContent = new Date().getFullYear());
})();

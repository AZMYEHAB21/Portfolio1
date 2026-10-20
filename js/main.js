/* Azmy Ehab portfolio — JavaScript enhancement layer.
   HTML and CSS are untouched: everything here is added on top, and the site still works without it. */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } },
  };

  /* ---------------------------------------------------------------
     0. Styles used only by this script (kept here so CSS stays as-is)
  --------------------------------------------------------------- */
  const css = `
    .js-glow{position:fixed;top:0;left:0;width:420px;height:420px;margin:-210px 0 0 -210px;border-radius:50%;pointer-events:none;z-index:1;
      background:radial-gradient(circle,var(--glow-2),transparent 65%);opacity:0;transition:opacity .4s;will-change:transform}
    .js-glow.on{opacity:.55}
    .js-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0}
    .scene{cursor:grab;touch-action:pan-y}.scene.drag{cursor:grabbing}
    .tilting{transition:none!important;will-change:transform}
    .js .reveal{animation:none!important;opacity:0;transform:translateY(34px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
    .js .reveal.in{opacity:1;transform:none}
    .js .stagger>*{opacity:0;transform:translateY(14px) scale(.96);transition:opacity .45s,transform .45s}
    .js .stagger.in>*{opacity:1;transform:none}
    .js .tile__num{animation:none!important}
    .js .section h2::after{animation:none!important;transform:scaleX(0);transition:transform .8s .15s}
    .js .section h2.in::after{transform:scaleX(1)}
    .navbar{transition:transform .35s,box-shadow .3s,background .3s}
    .navbar.hide{transform:translateY(-100%)}.navbar.stuck{box-shadow:0 10px 30px -18px #000}
    .js-top{position:fixed;inset-inline-end:1.2rem;bottom:1.2rem;z-index:1500;width:46px;height:46px;border-radius:50%;border:1px solid var(--line);
      background:var(--surface);color:var(--cyan);font-size:1.2rem;cursor:pointer;opacity:0;transform:translateY(14px) scale(.8);pointer-events:none;transition:.3s}
    .js-top.show{opacity:1;transform:none;pointer-events:auto}.js-top:hover{border-color:var(--cyan);box-shadow:0 8px 24px -10px var(--cyan)}
    .console__bar{cursor:pointer}
    @media (prefers-reduced-motion:reduce){.js .reveal,.js .stagger>*{opacity:1;transform:none}.js .section h2::after{transform:none}}
  `;
  document.head.append(Object.assign(document.createElement('style'), { textContent: css }));
  root.classList.add('js');

  /* ---------------------------------------------------------------
     1. Language + theme: remembered between visits
        (the hidden checkboxes stay the source of truth for the CSS)
  --------------------------------------------------------------- */
  const langBox = $('#langToggle');
  const themeBox = $('#themeToggle');
  const arabicTitle = 'عزمي إيهاب — مطوّر برمجيات طموح | Backend';
  const englishTitle = document.title;

  function syncPreferences() {
    const ar = langBox.checked;
    root.lang = ar ? 'ar' : 'en';
    root.dir = ar ? 'rtl' : 'ltr';
    document.title = ar ? arabicTitle : englishTitle;
    root.style.colorScheme = themeBox.checked ? 'light' : 'dark';
    $('meta[name="theme-color"]')?.setAttribute('content', themeBox.checked ? '#f5f7fb' : '#07090f');
  }

  const savedLang = store.get('lang');
  const savedTheme = store.get('theme');
  langBox.checked = savedLang ? savedLang === 'ar' : (navigator.language || '').toLowerCase().startsWith('ar');
  themeBox.checked = savedTheme ? savedTheme === 'light' : matchMedia('(prefers-color-scheme: light)').matches;
  langBox.addEventListener('change', () => { store.set('lang', langBox.checked ? 'ar' : 'en'); syncPreferences(); });
  themeBox.addEventListener('change', () => { store.set('theme', themeBox.checked ? 'light' : 'dark'); syncPreferences(); });
  syncPreferences();

  /* ---------------------------------------------------------------
     2. Scroll reveal, staggered groups, counters, heading underlines
  --------------------------------------------------------------- */
  $$('.chips, .tech, .links, .path').forEach(el => {
    el.classList.add('stagger');
    [...el.children].forEach((c, i) => { c.style.transitionDelay = `${Math.min(i * 60, 480)}ms`; });
  });

  function countUp(el) {
    const to = +el.style.getPropertyValue('--to') || 0;
    if (reduceMotion) return el.style.setProperty('--n', to);
    const start = performance.now();
    const step = now => {
      const p = clamp((now - start) / 1400, 0, 1);
      el.style.setProperty('--n', Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  $$('.tile__num').forEach(el => el.style.setProperty('--n', 0));

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('in');
      if (target.matches('.tile__num')) countUp(target);
      revealObserver.unobserve(target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal, .stagger, .tile__num, .section h2').forEach(el => revealObserver.observe(el));

  /* ---------------------------------------------------------------
     3. Navbar behaviour, scroll progress fallback, back-to-top
  --------------------------------------------------------------- */
  const nav = $('#mainNav');
  const progress = $('.scrollbar-top');
  const needsProgressFallback = !CSS.supports('animation-timeline: scroll()');
  if (needsProgressFallback && progress) progress.style.cssText += 'display:block;position:fixed;top:0;inset-inline:0;height:3px;z-index:1100;background:linear-gradient(90deg,var(--cyan),var(--purple),var(--lime));transform-origin:0 50%;transform:scaleX(0)';

  const toTop = Object.assign(document.createElement('button'), { className: 'js-top', type: 'button', textContent: '↑' });
  toTop.setAttribute('aria-label', 'Back to top / العودة للأعلى');
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));
  document.body.append(toTop);

  let lastY = scrollY;
  function onScroll() {
    const y = scrollY;
    const menuOpen = $('#navMenu')?.classList.contains('show');
    nav.classList.toggle('stuck', y > 20);
    nav.classList.toggle('hide', y > lastY && y > 400 && !menuOpen);
    lastY = y;
    toTop.classList.toggle('show', y > 700);
    if (needsProgressFallback && progress) progress.style.transform = `scaleX(${y / (root.scrollHeight - innerHeight || 1)})`;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  $$('#navMenu .nav-link, #navMenu .cta').forEach(a =>
    a.addEventListener('click', () => window.bootstrap?.Collapse.getInstance('#navMenu')?.hide()));

  /* ---------------------------------------------------------------
     4. Hero 3D cube: drag to spin, with inertia
  --------------------------------------------------------------- */
  const scene = $('.scene');
  const cube = $('.cube');
  if (scene && cube && !reduceMotion) {
    cube.style.animation = 'none';
    let yaw = 0, pitch = -22, velYaw = 0.35, velPitch = 0, dragging = false, lx = 0, ly = 0;

    scene.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; scene.classList.add('drag'); scene.setPointerCapture(e.pointerId); });
    scene.addEventListener('pointermove', e => {
      if (!dragging) return;
      velYaw = (e.clientX - lx) * 0.5; velPitch = -(e.clientY - ly) * 0.5;
      yaw += velYaw; pitch = clamp(pitch + velPitch, -70, 70);
      lx = e.clientX; ly = e.clientY;
    });
    const release = () => { dragging = false; scene.classList.remove('drag'); };
    scene.addEventListener('pointerup', release);
    scene.addEventListener('pointercancel', release);

    (function spin() {
      if (!dragging) {
        yaw += velYaw;
        velYaw = lerp(velYaw, 0.35, 0.03);          // ease back to the slow idle spin
        pitch = lerp(pitch, -22, 0.03);             // settle to the resting tilt
      }
      cube.style.transform = `rotateX(${pitch}deg) rotateY(${yaw}deg)`;
      requestAnimationFrame(spin);
    })();
  }

  /* ---------------------------------------------------------------
     5. Hero particle network (canvas)
  --------------------------------------------------------------- */
  const hero = $('.hero');
  if (hero && !reduceMotion) {
    const canvas = Object.assign(document.createElement('canvas'), { className: 'js-canvas' });
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d');
    const mouse = { x: -999, y: -999 };
    let w = 0, h = 0, dots = [], color = '34,211,238', visible = true;

    const readColor = () => {
      const hex = getComputedStyle(root).getPropertyValue('--cyan').trim().replace('#', '');
      if (hex.length === 6) color = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = hero.clientWidth; h = hero.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = Array.from({ length: clamp(Math.round(w * h / 16000), 24, 80) }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
      }));
    };
    new ResizeObserver(resize).observe(hero);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
    hero.addEventListener('pointermove', e => { const r = hero.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    themeBox.addEventListener('change', readColor);
    readColor();

    (function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      ctx.clearRect(0, 0, w, h);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        const dm = Math.hypot(d.x - mouse.x, d.y - mouse.y);
        if (dm < 140) { d.x += (d.x - mouse.x) * 0.012; d.y += (d.y - mouse.y) * 0.012; }   // gently pushed away
        ctx.fillStyle = `rgba(${color},.6)`;
        ctx.beginPath(); ctx.arc(d.x, d.y, 1.6, 0, 6.283); ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) {
        const dist = Math.hypot(dots[i].x - dots[j].x, dots[i].y - dots[j].y);
        if (dist > 120) continue;
        ctx.strokeStyle = `rgba(${color},${(1 - dist / 120) * .28})`;
        ctx.beginPath(); ctx.moveTo(dots[i].x, dots[i].y); ctx.lineTo(dots[j].x, dots[j].y); ctx.stroke();
      }
    })();
  }

  /* ---------------------------------------------------------------
     6. Pointer effects: 3D tilt cards, magnetic buttons, cursor glow, orb parallax
        (fine pointers only — touch devices keep the plain CSS hover)
  --------------------------------------------------------------- */
  if (finePointer && !reduceMotion) {
    // 3D tilt that follows the cursor
    $$('.project, .cert, .tile, .skillgroup, .links a, .portrait, .edu').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.classList.add('tilting');
        card.style.transform = `perspective(900px) rotateX(${(-y * 9).toFixed(2)}deg) rotateY(${(x * 11).toFixed(2)}deg) translateY(-4px)`;
      });
      card.addEventListener('pointerleave', () => { card.classList.remove('tilting'); card.style.transform = ''; });
    });

    // buttons lean toward the cursor
    $$('.cta').forEach(btn => {
      btn.addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect();
        btn.classList.add('tilting');
        btn.style.transform = `translate(${((e.clientX - r.left) / r.width - .5) * 8}px, ${((e.clientY - r.top) / r.height - .5) * 8 - 2}px)`;
      });
      btn.addEventListener('pointerleave', () => { btn.classList.remove('tilting'); btn.style.transform = ''; });
    });

    // soft light that trails the cursor + parallax on the hero orbs
    const glow = Object.assign(document.createElement('div'), { className: 'js-glow', 'aria-hidden': 'true' });
    document.body.append(glow);
    const orbs = $$('.orbs i');
    let tx = 0, ty = 0, gx = 0, gy = 0;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; glow.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => glow.classList.remove('on'));
    (function follow() {
      gx = lerp(gx, tx, .12); gy = lerp(gy, ty, .12);
      glow.style.transform = `translate(${gx}px, ${gy}px)`;
      const px = gx / innerWidth - .5, py = gy / innerHeight - .5;
      orbs.forEach((o, i) => { o.style.translate = `${px * (30 + i * 20)}px ${py * (30 + i * 20)}px`; });
      requestAnimationFrame(follow);
    })();
  }

  /* ---------------------------------------------------------------
     7. SQL console: click the title bar to replay the typing animation
  --------------------------------------------------------------- */
  const bar = $('.console__bar');
  if (bar) {
    bar.title = 'Click to replay / انقر لإعادة التشغيل';
    bar.addEventListener('click', () => {
      $$('.tl, .console__result').forEach(el => { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; });
    });
  }
})();

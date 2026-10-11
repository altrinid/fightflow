/* FightFlow – Champion: scroll choreography, menu, form.
   Depends on gsap + ScrollTrigger + Lenis (js/vendor). The 3D glove lives in js/glove.js and is loaded on demand. */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    root.classList.remove('anim'); // libraries missing: show everything, no animation
    return;
  }
  gsap.registerPlugin(ScrollTrigger);
  gsap.config({ nullTargetWarn: false });

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.__lenis = lenis; // for debugging / automated checks
  }
  const scrollTo = (el, offset = 0) => {
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.5, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };

  /* ---------- header ---------- */
  const head = $('[data-head]');
  let lastY = 0;
  const onScroll = (y) => {
    head.classList.toggle('is-scrolled', y > 40);
    if (y > lastY + 8 && y > 240) head.classList.add('is-hidden');
    else if (y < lastY - 8 || y < 240) head.classList.remove('is-hidden');
    lastY = y;
  };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
  onScroll(scrollY);

  /* ---------- full-screen menu ---------- */
  const menu = $('[data-menu]');
  const burger = $('[data-burger]');
  const menuLinks = $$('.menu__nav a');
  let menuOpen = false;
  const openMenu = () => {
    menuOpen = true;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-open');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Menü schließen');
    root.classList.add('menu-open');
    lenis ? lenis.stop() : (document.body.style.overflow = 'hidden');
    if (!reduce) {
      gsap.fromTo(menuLinks, { y: 44, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .9, stagger: .06, ease: 'power3.out', delay: .12, overwrite: true });
      gsap.fromTo('.menu__foot', { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .8, delay: .45, overwrite: true });
    }
    menuLinks[0].focus({ preventScroll: true });
  };
  const closeMenu = () => {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Menü öffnen');
    root.classList.remove('menu-open');
    lenis ? lenis.start() : (document.body.style.overflow = '');
  };
  burger.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
  addEventListener('keydown', (e) => e.key === 'Escape' && closeMenu());

  /* ---------- anchors ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      // sticky/pinned sections: land on the section start, everything else slightly under the header
      scrollTo(el, el.matches('.glove, .gal') ? 0 : -(id === '#top' ? 0 : 0));
      history.replaceState(null, '', id);
    });
  });

  /* ---------- hero intro + parallax ---------- */
  const heroBg = $('[data-hero-bg]');
  if (!reduce) {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(heroBg.querySelector('img'), { scale: 1.18 }, { scale: 1, duration: 2.6, ease: 'power2.out' }, 0)
      /* y:0 explicitly – GSAP would otherwise keep the CSS translateY(110%) start state as a pixel offset */
      .fromTo('[data-hero-line]', { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, duration: 1.3, stagger: .12 }, .15)
      .fromTo('[data-hero-item]', { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.1, stagger: .14 }, .55)
      .fromTo('[data-hero-meta] li', { y: 22, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, stagger: .08 }, .95)
      .fromTo('.hero__scroll', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, 1.5);
    gsap.to(heroBg, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__content', { yPercent: -12, autoAlpha: .15, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: '25% top', end: 'bottom top', scrub: true } });
  }

  /* ---------- marquee: endless loop, reacts to scroll speed ---------- */
  const marquee = $('[data-marquee]');
  if (marquee && !reduce) {
    const loop = gsap.to(marquee, { xPercent: -50, ease: 'none', duration: 32, repeat: -1 });
    const skew = $('[data-marquee-skew]');
    let ts = 1;
    const onVel = (v) => {
      const c = Math.max(-80, Math.min(80, v));
      ts = 1 + Math.abs(c) / 14;
      gsap.to(loop, { timeScale: ts, duration: .5, overwrite: true });
      gsap.to(skew, { skewX: -c * .18, duration: .5, overwrite: true });
      gsap.to(skew, { skewX: 0, duration: 1.2, delay: .5, overwrite: false });
      gsap.to(loop, { timeScale: 1, duration: 1.8, delay: .5, overwrite: false });
    };
    if (lenis) lenis.on('scroll', ({ velocity }) => Math.abs(velocity) > 2 && onVel(velocity));
    else {
      let py = scrollY;
      addEventListener('scroll', () => { onVel((scrollY - py) * .6); py = scrollY; }, { passive: true });
    }
  }

  /* ---------- reveals ---------- */
  if (!reduce) {
    $$('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { y: 36, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1.15, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 91%', once: true } });
    });
    /* photos drifting inside their frames */
    $$('[data-parallax]').forEach((el) => {
      const s = parseFloat(el.dataset.parallax) || .1;
      gsap.fromTo(el, { yPercent: -s * 100 }, { yPercent: s * 100, ease: 'none', scrollTrigger: { trigger: el.closest('.media') || el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* whole frames moving at different speeds */
    $$('[data-speed]').forEach((el) => {
      const s = parseFloat(el.dataset.speed) || 0;
      gsap.fromTo(el, { y: -s * 420 }, { y: s * 420, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    /* numbers counting up */
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count);
      const o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } });
    });
    /* quote: words light up while scrolling */
    const quote = $('[data-words]');
    if (quote) {
      quote.innerHTML = quote.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
      gsap.fromTo(quote.querySelectorAll('.w'), { opacity: .14 }, { opacity: 1, stagger: .12, ease: 'none', scrollTrigger: { trigger: quote, start: 'top 82%', end: 'bottom 42%', scrub: .6 } });
    }
    /* footer wordmark rising in */
    gsap.fromTo('[data-foot-word]', { yPercent: 36 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  }

  /* ---------- 3D glove: sticky section, scroll drives rotation + steps ---------- */
  const gloveSec = $('[data-glove]');
  if (gloveSec) {
    const steps = $$('.glove__step', gloveSec);
    const dots = $$('[data-glove-dots] i', gloveSec);
    const word = $('[data-glove-word]', gloveSec);
    const canvas = $('[data-glove-canvas]', gloveSec);
    const poster = $('[data-glove-poster]', gloveSec);
    let glove = null, loading = false, current = -1;
    const setStep = (p) => {
      const i = Math.min(steps.length - 1, Math.floor(p * steps.length * .98));
      if (i === current) return;
      current = i;
      steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    };
    const loadGlove = async () => {
      if (loading || !canvas) return;
      loading = true;
      try {
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) throw new Error('Kein WebGL');
        const mod = await import('./glove.js'); // resolved relative to main.js
        glove = await mod.initGlove(canvas, { model: 'models/glove.glb', reduce });
        glove.setActive(true);
        gsap.to(poster, { autoAlpha: 0, duration: 1.4, ease: 'power2.out' });
      } catch (err) {
        console.warn('3D-Handschuh nicht verfügbar – Standbild bleibt.', err);
      }
    };
    ScrollTrigger.create({ trigger: gloveSec, start: 'top 160%', once: true, onEnter: loadGlove });
    ScrollTrigger.create({
      trigger: gloveSec, start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { setStep(self.progress); glove && glove.setProgress(self.progress); if (word && !reduce) word.style.transform = `translate(-50%,-50%) translateY(${(self.progress - .5) * -22}vh)`; },
      onToggle: (self) => glove && glove.setActive(self.isActive),
    });
    setStep(0);
    if (fine) gloveSec.addEventListener('mousemove', (e) => {
      if (!glove) return;
      glove.setPointer((e.clientX / innerWidth) * 2 - 1, (e.clientY / innerHeight) * 2 - 1);
    });
    /* on a reload mid-page the section may already be on screen */
    if (gloveSec.getBoundingClientRect().top < innerHeight * 1.6) loadGlove();
  }

  /* ---------- gym gallery: horizontal scroll pinned on desktop ---------- */
  const gal = $('[data-gallery]');
  if (gal) {
    const track = $('[data-gallery-track]', gal);
    const hint = $('[data-gallery-hint]', gal);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: gal, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1.1, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => { if (hint) hint.parentElement.style.opacity = self.progress > .05 ? .25 : 1; },
        },
      });
      $$('.gal__item', gal).forEach((item) => {
        gsap.fromTo(item.querySelector('.media__img'), { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: item, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      });
      return () => gsap.set(track, { clearProps: 'transform' });
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$('.faq__item').forEach((d) => {
    const sum = d.querySelector('summary');
    const body = d.querySelector('.faq__body');
    sum.addEventListener('click', (e) => {
      e.preventDefault();
      if (reduce) { d.open = !d.open; return; }
      if (d.open) {
        gsap.to(body, { height: 0, opacity: 0, duration: .45, ease: 'power2.inOut', onComplete: () => { d.open = false; gsap.set(body, { clearProps: 'all' }); } });
      } else {
        d.open = true;
        gsap.from(body, { height: 0, opacity: 0, duration: .6, ease: 'power3.out', clearProps: 'all', onComplete: () => ScrollTrigger.refresh() });
      }
    });
  });

  /* ---------- plan cards: light 3D tilt ---------- */
  if (fine && !reduce) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        gsap.to(card, { rotateY: x * 7, rotateX: -y * 7, y: -8, transformPerspective: 900, duration: .7, ease: 'power3.out' });
      });
      card.addEventListener('mouseleave', () => gsap.to(card, { rotateY: 0, rotateX: 0, y: 0, duration: 1, ease: 'power3.out' }));
    });
    /* magnetic buttons */
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .32, y: (e.clientY - r.top - r.height / 2) * .32, duration: .6, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1,.45)' }));
    });
  }

  /* ---------- form → e-mail ---------- */
  const form = $('[data-form]');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const name = String(f.get('name') || '').trim();
      const contact = String(f.get('contact') || '').trim();
      let ok = true;
      [['name', name], ['contact', contact]].forEach(([k, v]) => {
        const input = form.elements[k];
        input.classList.toggle('is-error', !v);
        if (!v) { ok = false; input.addEventListener('animationend', () => input.classList.remove('is-error'), { once: true }); }
      });
      if (!ok) { form.elements[name ? 'contact' : 'name'].focus(); return; }
      const body = [
        'Hallo FightFlow-Team,', '', 'ich möchte zum Probetraining kommen.', '',
        `Name: ${name}`, `Kontakt: ${contact}`, `Wunschtag: ${f.get('day')}`, `Erfahrung: ${f.get('experience')}`,
        `Nachricht: ${String(f.get('message') || '').trim() || '–'}`, '', 'Danke!',
      ].join('\n');
      location.href = `mailto:fightflow01@gmail.com?subject=${encodeURIComponent('Probetraining FightFlow – ' + name)}&body=${encodeURIComponent(body)}`;
      $('[data-form-label]').textContent = 'E-Mail-Programm geöffnet';
      $('[data-form-note]').textContent = 'Falls sich nichts geöffnet hat: schreib uns an fightflow01@gmail.com oder ruf an unter +43 678 780 3878.';
    });
  }

  /* ---------- keep measurements fresh ---------- */
  addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();

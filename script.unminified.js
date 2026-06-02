(() => {
  'use strict';

  const CONFIG = { frameCount: 192, batchSize: 12, initialFrames: 3 };
  const framePath = (i) => `frame_${String(i).padStart(3, '0')}.webp`;

  const canvas = document.getElementById('frame-canvas');
  const ctx = canvas.getContext('2d');
  const preloader = document.getElementById('preloader');
  const preloaderText = document.getElementById('preloader-text');
  const preloaderPercent = document.getElementById('preloader-percent');
  const preloaderBarFill = document.getElementById('preloader-bar-fill');
  const progressBar = document.getElementById('progress-bar');
  const scrollIndicator = document.getElementById('scroll-indicator');
  const navBar = document.getElementById('nav-bar');
  const vignette = document.getElementById('vignette');

  const images = new Array(CONFIG.frameCount);
  const frameState = { currentIndex: 0 };
  let canvasReady = false;

  /* ── Canvas resize (object-fit: cover) ── */
  const DPR = Math.min(window.devicePixelRatio || 1, 2); // cap at 2x for perf
  let rafPending = false;

  function getViewportHeight() {
    return window.visualViewport ? window.visualViewport.height : window.innerHeight;
  }

  function resizeCanvas() {
    const vw = window.innerWidth;
    const vh = getViewportHeight();
    canvas.width = vw * DPR;
    canvas.height = vh * DPR;
    canvas.style.width = vw + 'px';
    canvas.style.height = vh + 'px';
    if (canvasReady) drawFrame(frameState.currentIndex);
  }

  function drawFrame(index) {
    let img = images[index];
    // If this frame isn't loaded yet, find the nearest one that is
    if (!img || !img.complete) {
      for (let d = 1; d < CONFIG.frameCount; d++) {
        const lo = index - d, hi = index + d;
        if (lo >= 0 && images[lo] && images[lo].complete) { img = images[lo]; break; }
        if (hi < CONFIG.frameCount && images[hi] && images[hi].complete) { img = images[hi]; break; }
      }
    }
    if (!img || !img.complete) return;
    const cw = canvas.width, ch = canvas.height;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale, dh = ih * scale;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  /* ── Phase 1: Load first N frames, resolve so site appears immediately ── */
  function preloadInitial() {
    return new Promise((resolve) => {
      const n = CONFIG.initialFrames;
      let loaded = 0;
      for (let i = 0; i < n; i++) {
        const img = new Image();
        const idx = i;
        const done = () => {
          loaded++;
          const pct = Math.round((loaded / n) * 100);
          preloaderPercent.textContent = pct + '%';
          preloaderBarFill.style.width = pct + '%';
          preloaderText.textContent = 'LOADING... [' + pct + '%]';
          if (loaded === n) resolve();
        };
        img.onload = () => { images[idx] = img; done(); };
        img.onerror = done;
        img.src = framePath(i + 1);
      }
    });
  }

  /* ── Phase 2: Load remaining frames silently in the background ── */
  function preloadRemaining() {
    const batchSize = 8; // load in small batches to avoid network congestion
    let idx = CONFIG.initialFrames;
    function nextBatch() {
      if (idx >= CONFIG.frameCount) return;
      const end = Math.min(idx + batchSize, CONFIG.frameCount);
      let done = 0;
      const batchLen = end - idx;
      for (let i = idx; i < end; i++) {
        if (images[i]) { done++; if (done === batchLen) { idx = end; nextBatch(); } continue; }
        const img = new Image();
        const capturedIdx = i;
        img.onload = () => {
          images[capturedIdx] = img;
          done++;
          if (done === batchLen) { idx = end; nextBatch(); }
        };
        img.onerror = () => { done++; if (done === batchLen) { idx = end; nextBatch(); } };
        img.src = framePath(i + 1);
      }
    }
    nextBatch();
  }

  /* ── GSAP ScrollTrigger Init ── */
  function initScroll() {
    gsap.registerPlugin(ScrollTrigger);

    // ── Frame sequence scrub ──
    gsap.to(frameState, {
      currentIndex: CONFIG.frameCount - 1,
      snap: 'currentIndex',
      ease: 'none',
      scrollTrigger: {
        trigger: '#scroll-container',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
        onUpdate: () => {
          if (!rafPending) {
            rafPending = true;
            requestAnimationFrame(() => {
              drawFrame(Math.round(frameState.currentIndex));
              rafPending = false;
            });
          }
        },
      },
    });

    // ── Hero panels fade in/out ──
    document.querySelectorAll('.section-panel').forEach((panel) => {
      const content = panel.querySelector('.section-content');
      if (!content) return;

      // Fade in — all panels same
      gsap.fromTo(content,
        { opacity: 0, y: 60, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: panel, start: 'top 80%', end: 'top 30%', scrub: 1.5 } });

      // Fade out — skip the final panel
      if (!panel.classList.contains('section--final')) {
        if (panel.classList.contains('section--middle')) {
          // Middle card: don't fade until hero-3 is approaching
          gsap.to(content, { opacity: 0, y: -40, filter: 'blur(6px)',
            scrollTrigger: {
              trigger: '#hero-3',
              start: 'top 90%',
              end:   'top 40%',
              scrub: 1.5
            }
          });
        } else {
          gsap.to(content, { opacity: 0, y: -40, filter: 'blur(6px)',
            scrollTrigger: { trigger: panel, start: 'bottom 80%', end: 'bottom 20%', scrub: 1.5 } });
        }
      }
    });

    // ── Floating hand cards (appear near robot's open palms) ──
    const handContent = document.getElementById('hand-content');
    const handCards = document.querySelectorAll('.hand-card');
    if (handContent && handCards.length) {
      // Left card — fades/scales in from left palm
      gsap.fromTo('#hand-card-left',
        { opacity: 0, y: 30, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: '#scroll-container', start: '28% top', end: '35% top', scrub: 1.5 },
          onComplete: () => {
            gsap.to('#hand-card-left', { y: -8, duration: 2, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          }
        });
      gsap.to('#hand-card-left',
        { opacity: 0, y: -20, scrollTrigger: { trigger: '#scroll-container', start: '68% top', end: '75% top', scrub: 1.5 } });

      // Right card — fades/scales in from right palm (slightly staggered)
      gsap.fromTo('#hand-card-right',
        { opacity: 0, y: 40, scale: 0.85 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: '#scroll-container', start: '32% top', end: '40% top', scrub: 1.5 },
          onComplete: () => {
            gsap.to('#hand-card-right', { y: -8, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          }
        });
      gsap.to('#hand-card-right',
        { opacity: 0, y: -20, scrollTrigger: { trigger: '#scroll-container', start: '70% top', end: '77% top', scrub: 1.5 } });
    }

    // ── Hide canvas + vignette + hand cards when below-fold begins ──
    gsap.to([canvas, vignette, handContent], {
      opacity: 0,
      scrollTrigger: {
        trigger: '.below-fold',
        start: 'top 100%',
        end: 'top 60%',
        scrub: true,
      },
    });

    // ── Scroll indicator ──
    ScrollTrigger.create({
      trigger: '#scroll-container', start: 'top top', end: '5% top',
      onEnter: () => scrollIndicator.classList.remove('is-visible'),
      onLeaveBack: () => scrollIndicator.classList.add('is-visible'),
    });

    // ── Progress bar ──
    ScrollTrigger.create({
      trigger: 'body', start: 'top top', end: 'bottom bottom',
      onUpdate: (self) => { progressBar.style.width = (self.progress * 100).toFixed(1) + '%'; },
    });

    // ── Nav bar ──
    ScrollTrigger.create({
      trigger: '#scroll-container', start: '2% top',
      onEnter: () => navBar.classList.add('is-visible'),
      onLeaveBack: () => navBar.classList.remove('is-visible'),
    });

    // ══════════════════════════════════
    // BELOW-FOLD SECTION ANIMATIONS
    // ══════════════════════════════════

    // ── Value Proposition ──
    const vpInner = document.querySelector('.vp-inner');
    if (vpInner) {
      gsap.fromTo(vpInner,
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: '#value-prop', start: 'top 75%', end: 'top 35%', scrub: 1 } });
    }

    // ── Service Cards ──
    document.querySelectorAll('.service-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 60, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
          delay: i * 0.15 });
    });

    // ── Capabilities Cards ──
    document.querySelectorAll('.cap-card').forEach((card, i) => {
      gsap.fromTo(card,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 85%', toggleActions: 'play none none none' },
          delay: i * 0.15 });
    });

    // ── Footer CTA ──
    const footerInner = document.querySelector('.footer-cta__inner');
    if (footerInner) {
      gsap.fromTo(footerInner,
        { opacity: 0, y: 60, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out',
          scrollTrigger: { trigger: '#footer-cta', start: 'top 70%', toggleActions: 'play none none none' } });
    }
  }

  /* ── CTA Ripple Effect ── */
  function initCTA() {
    const style = document.createElement('style');
    style.textContent = '@keyframes rippleAnim { to { transform: scale(2.5); opacity: 0; } }';
    document.head.appendChild(style);
    document.querySelectorAll('.cta-button').forEach((btn) => {
      // Skip form submit buttons — they must not have preventDefault called
      if (btn.type === 'submit') return;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const href = btn.getAttribute('href');
        const r = document.createElement('span');
        const rect = btn.getBoundingClientRect();
        const sz = Math.max(rect.width, rect.height);
        r.style.cssText = 'position:absolute;width:'+sz+'px;height:'+sz+'px;left:'+(e.clientX-rect.left-sz/2)+'px;top:'+(e.clientY-rect.top-sz/2)+'px;border-radius:50%;background:rgba(255,255,255,.3);transform:scale(0);animation:rippleAnim .6s ease-out forwards;pointer-events:none;';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 600);
        if (href && href !== '#') {
          setTimeout(() => {
            document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
          }, 200);
        }
      });
    });
  }

  /* ── Assessment Modal ── */
  function initAssessmentModal() {
    const modal    = document.getElementById('assessment-modal');
    const triggerBtns = document.querySelectorAll('.btn-trigger-assessment');
    const btnClose = document.getElementById('amodal-close');
    const backdrop = document.getElementById('amodal-backdrop');
    const form     = document.getElementById('assessment-form');
    const status   = document.getElementById('aform-status');
    const submitBtn = document.getElementById('aform-submit-btn');
    if (!modal || !triggerBtns.length) return;

    const openModal = (e) => {
      if (e) e.preventDefault();
      modal.classList.add('is-active');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    triggerBtns.forEach(btn => btn.addEventListener('click', openModal));
    btnClose.addEventListener('click', closeModal);
    backdrop.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

    // POST form data to self-hosted backend → emails directly to info@adelphostech.com
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Sending…';
      status.style.display = 'none';
      status.className = 'aform-status';

      const get = (id) => (document.getElementById(id)?.value || '').trim();

      const payload = {
        name:      get('af-name'),
        title:     get('af-title'),
        email:     get('af-email'),
        phone:     get('af-phone'),
        company:   get('af-company'),
        website:   get('af-website'),
        size:      get('af-size'),
        industry:  get('af-industry'),
        aiUse:     get('af-ai-use'),
        challenge: get('af-challenge'),
        goal:      get('af-goal'),
      };

      try {
        const res = await fetch('/submit-lead', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          status.textContent = '✅ Thank you! Your details have been sent. Our team will reach out within 48 hours with your custom AI roadmap.';
          status.classList.add('aform-status--success');
          status.style.display = 'block';
          form.reset();
          submitBtn.innerHTML = 'Submitted ✓';
        } else {
          throw new Error(data.error || 'Submission failed');
        }
      } catch (err) {
        status.textContent = '❌ Something went wrong. Please email us directly at info@adelphostech.com';
        status.classList.add('aform-status--error');
        status.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Submit Assessment <span class="cta-arrow">→</span>';
      }
    });
  }

  /* ── TCO Calculator ── */
  function initCalculator() {
    const pillBtns = document.querySelectorAll('.calc-pill');
    if (!pillBtns.length) return;

    // ─── Real market pricing (GPT-4o, May 2025) ───
    // Input: $5/1M | Output: $15/1M → blended ~$8/1M at 50/50 ratio
    const CLOUD_COST_PER_M = 8; // blended $/1M tokens

    // Profiles: token volumes in millions/month (realistic business usage)
    // small:  50M tokens/mo = heavy chatbot + team assistant (~1,700 GPT-4o calls/day)
    // medium: 300M tokens/mo = 50-staff RAG brain + customer automation pipeline
    // large:  1,200M tokens/mo = 24/7 voice + docs + sales calls at scale
    const PROFILES = {
      small:  { tokens: 50,   hw: 8000,  ops: 100, label: 'Getting Started' },
      medium: { tokens: 300,  hw: 25000, ops: 200, label: 'Growing Team'    },
      large:  { tokens: 1200, hw: 80000, ops: 800, label: 'Full Operation'  },
    };

    let activeProfile = 'small';

    const elPricePerM   = document.getElementById('price-per-m');
    const elCloudMo     = document.getElementById('cloud-monthly');
    const elCloud3yr    = document.getElementById('cloud-3yr');
    const elCloudDay    = document.getElementById('cloud-day');
    const elSovMo       = document.getElementById('sovereign-monthly');
    const elSov3yr      = document.getElementById('sovereign-3yr');
    const elSovHw       = document.getElementById('sovereign-hw');
    const elSavings     = document.getElementById('savings-3yr');
    const elSavingsNote = document.getElementById('savings-note');
    const elBreakeven   = document.getElementById('breakeven-months');
    const elPerDay      = document.getElementById('savings-per-day');
    const elCalcCta     = document.querySelector('.calc-savings-cta .cta-button');

    function fmt(n, decimals = 0) {
      return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    function calc() {
      const p = PROFILES[activeProfile];

      // Cloud costs
      const cloudMo    = p.tokens * CLOUD_COST_PER_M;
      const cloudTotal = cloudMo * 36; // 3 years
      const cloudDay   = cloudMo / 30;

      // Sovereign costs — hardware amortised over 36mo + monthly ops
      const sovMonthlyEquiv = (p.hw / 36) + p.ops;
      const sovTotal        = p.hw + (p.ops * 36);

      // Savings
      const saving3yr   = cloudTotal - sovTotal;
      const savingPerDay = (cloudMo - p.ops) / 30;

      // Break-even: hw / (monthly cloud - monthly ops)
      const monthlyDiff = cloudMo - p.ops;
      const breakeven   = monthlyDiff > 0 ? Math.ceil(p.hw / monthlyDiff) : null;

      // Update DOM
      if (elPricePerM) elPricePerM.textContent = '$' + CLOUD_COST_PER_M.toFixed(2);
      elCloudMo.textContent  = fmt(cloudMo);
      elCloud3yr.textContent = fmt(cloudTotal);
      elCloudDay.textContent = '$' + Math.round(cloudDay).toLocaleString();
      elSovMo.textContent    = fmt(sovMonthlyEquiv);
      elSov3yr.textContent   = fmt(sovTotal);
      elSovHw.textContent    = fmt(p.hw);
      // Ops row: total over 36 mo + monthly rate shown inline
      const elSovOps = document.getElementById('sovereign-ops');
      if (elSovOps) {
        const opsTotal = p.ops * 36;
        elSovOps.innerHTML = fmt(opsTotal) + ' <span class="calc-total-sub">($' + p.ops.toLocaleString() + '/mo)</span>';
      }
      // ─── Savings banner — smart profile-aware messaging ───
      const elSavingsLabel = document.querySelector('.calc-savings-label');
      const elSavingsRight = document.querySelector('.calc-savings-right');
      if (activeProfile === 'small') {
        // Cloud makes sense at this scale — steer to training services
        elSavings.textContent      = 'Cloud AI Is Right For You';
        elSavings.style.color      = '#00897b';
        elSavings.style.fontSize   = '1.6rem';
        elSavings.style.lineHeight = '1.2';
        if (elSavingsLabel) elSavingsLabel.textContent = 'Our recommendation';
        elSavingsNote.textContent  = 'At this usage level cloud AI is cost-effective. Your biggest ROI is making your team efficient with it.';
        if (elSavingsRight) elSavingsRight.style.display = 'none';
        if (elCalcCta) elCalcCta.innerHTML = 'Explore AI Training &amp; Workflows <span class="cta-arrow">→</span>';
      } else {
        // Medium / Large — sovereign ROI is positive, steer to infra build
        elSavings.textContent      = fmt(saving3yr);
        elSavings.style.color      = '#43a047';
        elSavings.style.fontSize   = '';
        elSavings.style.lineHeight = '';
        if (elSavingsLabel) elSavingsLabel.textContent = 'Estimated 3-year savings';
        elSavingsNote.textContent  = 'by building sovereign AI vs. paying cloud API fees';
        if (elSavingsRight) elSavingsRight.style.display = '';
        elPerDay.textContent       = '$' + Math.round(Math.max(savingPerDay, 0)).toLocaleString();
        elBreakeven.textContent    = breakeven ? breakeven + ' mo' : '—';
        if (elCalcCta) elCalcCta.innerHTML = 'Build Your Sovereign AI <span class="cta-arrow">→</span>';
      }
    }

    pillBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        pillBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        activeProfile = btn.dataset.profile;
        calc();
      });
    });

    calc();

    // GSAP reveal
    const calcInner = document.querySelector('.calc-inner');
    if (calcInner && typeof gsap !== 'undefined') {
      gsap.fromTo(calcInner,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: '#tco-calculator', start: 'top 78%', toggleActions: 'play none none none' } });
    }
  }

  /* ── Mobile menu toggle ── */
  function initMobileMenu() {
    const toggleBtn = document.getElementById('nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (!toggleBtn || !navLinks) return;

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const active = navLinks.classList.toggle('is-active');
      toggleBtn.classList.toggle('is-active');
      document.body.style.overflow = active ? 'hidden' : '';
    });

    // Close mobile menu when clicking outside or clicking any nav link
    document.addEventListener('click', (e) => {
      if (navLinks.classList.contains('is-active') && !navLinks.contains(e.target) && e.target !== toggleBtn) {
        navLinks.classList.remove('is-active');
        toggleBtn.classList.remove('is-active');
        document.body.style.overflow = '';
      }
    });

    navLinks.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('is-active');
        toggleBtn.classList.remove('is-active');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Clean Scroll links without hashes in address bar ── */
  function initCleanScroll() {
    document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach((anchor) => {
      anchor.addEventListener('click', function (e) {
        let href = this.getAttribute('href');
        let targetId = href.includes('#') ? '#' + href.split('#')[1] : null;

        if (!targetId || targetId === '#') return;

        // Check if we are on the homepage
        const isHomePage = window.location.pathname === '/' || window.location.pathname === '/index.html' || window.location.pathname === '';
        
        if (isHomePage) {
          const target = document.querySelector(targetId);
          if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    });

    // Clean up URL if it contains hash on load, but make sure it still scrolls there
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const target = document.querySelector(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
        history.replaceState(null, document.title, window.location.pathname + window.location.search);
      }, 100);
    }
  }

  let remainingPreloadStarted = false;
  function startPreloadingRemainingOnce() {
    if (remainingPreloadStarted) return;
    remainingPreloadStarted = true;

    // Remove event listeners
    window.removeEventListener('scroll', startPreloadingRemainingOnce);
    window.removeEventListener('touchstart', startPreloadingRemainingOnce);
    window.removeEventListener('mousemove', startPreloadingRemainingOnce);

    // Silently load the rest of the frames in the background
    preloadRemaining();
  }

  /* ── Boot ── */
  async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    scrollIndicator.classList.add('is-visible');
    await preloadInitial();          // wait only for first N frames
    canvasReady = true;
    drawFrame(0);
    preloader.classList.add('loaded');
    setTimeout(() => {
      initScroll();
      initCTA();
      initAssessmentModal();
      initCalculator();
      initMobileMenu();
      initCleanScroll();
      preloader.remove();

      // Delay preloading of heavy remaining frames until user interaction
      window.addEventListener('scroll', startPreloadingRemainingOnce, { passive: true });
      window.addEventListener('touchstart', startPreloadingRemainingOnce, { passive: true });
      window.addEventListener('mousemove', startPreloadingRemainingOnce, { passive: true });

      // Idle fallback: start preloading after 5 seconds
      setTimeout(startPreloadingRemainingOnce, 5000);
    }, 900);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();

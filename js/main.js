/* GetGasNG — Main JS (content-driven) */

const STORAGE_KEY = 'gg_content';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

const checkSVG = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
const starSVG  = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>`;

// ── Content loading ───────────────────────────────────────────────────────────
async function loadContent() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try { return JSON.parse(stored); } catch (e) { /* fall through */ }
  }
  try {
    const res = await fetch('content.json');
    if (res.ok) return await res.json();
  } catch (e) { /* fall through */ }
  return null;
}

// ── Apply simple text fields (data-content attributes) ────────────────────────
function applyTextFields(c) {
  document.querySelectorAll('[data-content]').forEach(el => {
    const val = getPath(c, el.dataset.content);
    if (val !== undefined && val !== null) el.textContent = val;
  });
}

// ── Render: Steps ─────────────────────────────────────────────────────────────
const stepIcons = [
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`
];

function renderSteps(steps) {
  const grid = document.querySelector('.steps__grid');
  if (!grid || !steps?.items) return;
  grid.innerHTML = steps.items.map((s, i) => `
    <div class="step-card fade-up">
      <span class="step-num" aria-hidden="true">0${i + 1}</span>
      <div class="step-icon" aria-hidden="true">${stepIcons[i] || stepIcons[0]}</div>
      <h3>${s.title}</h3>
      <p>${s.description}</p>
    </div>`).join('');
}

// ── Render: Features ──────────────────────────────────────────────────────────
const featureStyles = [
  { bg: '#FFF7ED', stroke: '#F97316' },
  { bg: '#EFF6FF', stroke: '#2563EB' },
  { bg: '#F0FDF4', stroke: '#16A34A' },
  { bg: '#FFF7ED', stroke: '#F97316' },
  { bg: '#F5F3FF', stroke: '#7C3AED' },
  { bg: '#FFF1F2', stroke: '#E11D48' }
];
const featureIcons = [
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 16l4.553 2.276A1 1 0 0021 24.382V5.618a1 1 0 00-.553-.894L15 2m0 18V2m0 0L9 7"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"/></svg>`
];

function renderFeatures(features) {
  const grid = document.querySelector('.features__grid');
  if (!grid || !features?.items) return;
  grid.innerHTML = features.items.map((f, i) => {
    const s = featureStyles[i % featureStyles.length];
    return `
    <div class="feature-card fade-up">
      <div class="feature-icon" style="background:${s.bg};">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="${s.stroke}" stroke-width="1.8">
          ${featureIcons[i % featureIcons.length].replace(/<svg[^>]*>/, '').replace('</svg>', '')}
        </svg>
      </div>
      <h3>${f.title}</h3>
      <p>${f.description}</p>
    </div>`;
  }).join('');
}

// ── Render: Plans ─────────────────────────────────────────────────────────────
function renderPlans(plans) {
  const grid = document.querySelector('.plans__grid');
  if (!grid || !plans?.items) return;
  grid.innerHTML = plans.items.map(p => `
    <div class="plan-card fade-up${p.popular ? ' popular' : ''}">
      ${p.popular ? '<div class="plan-popular-tag">Most Popular</div>' : ''}
      <div class="plan-cylinder">${p.emoji}</div>
      <div class="plan-size">${p.size}</div>
      <div class="plan-desc">${p.description}</div>
      <div class="plan-price">
        <div class="plan-price-from">Refill from</div>
        <div class="plan-price-value">${p.price}</div>
        <div class="plan-price-unit">per refill</div>
      </div>
      <ul class="plan-features">
        ${p.features.map(f => `<li class="plan-feature">${checkSVG}${f}</li>`).join('')}
      </ul>
      <a href="#" class="plan-btn ${p.popular ? 'plan-btn--primary' : 'plan-btn--outline'}">${p.cta}</a>
    </div>`).join('');

  const note = document.querySelector('.plans-note');
  if (note && plans.note) note.innerHTML = plans.note;
}

// ── Render: Coverage areas ────────────────────────────────────────────────────
function renderAreas(coverage) {
  const wrap = document.querySelector('.coverage__areas');
  if (!wrap || !coverage?.areas) return;
  wrap.innerHTML = coverage.areas.map(a => `
    <div class="area-tag">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      ${a}
    </div>`).join('');
}

// ── Render: Testimonials ──────────────────────────────────────────────────────
function renderTestimonials(testimonials) {
  const grid = document.querySelector('.testimonials__grid');
  if (!grid || !testimonials?.items) return;
  grid.innerHTML = testimonials.items.map(t => `
    <div class="testi-card fade-up">
      <div class="testi-stars">${starSVG.repeat(5)}</div>
      <p class="testi-quote">${t.quote}</p>
      <div class="testi-author">
        <div class="testi-avatar" style="background:${t.color};">${t.initials}</div>
        <div>
          <div class="testi-name">${t.name}</div>
          <div class="testi-role">${t.role}</div>
        </div>
      </div>
    </div>`).join('');
}

// ── Render: App perks ─────────────────────────────────────────────────────────
const perkIcons = [
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 16l4.553 2.276A1 1 0 0021 24.382V5.618a1 1 0 00-.553-.894L15 2m0 18V2m0 0L9 7"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>`
];

function renderAppPerks(app) {
  const wrap = document.querySelector('.app-perks');
  if (!wrap || !app?.perks) return;
  wrap.innerHTML = app.perks.map((p, i) => `
    <div class="app-perk">
      <div class="app-perk-icon">${perkIcons[i % perkIcons.length]}</div>
      ${p}
    </div>`).join('');
}

// ── Render: FAQ ───────────────────────────────────────────────────────────────
function renderFAQ(faq) {
  const grid = document.querySelector('.faq__grid');
  if (!grid || !faq?.items) return;
  grid.innerHTML = faq.items.map((item, i) => `
    <div class="faq-item${i === 0 ? ' open' : ''}">
      <button class="faq-q" aria-expanded="${i === 0}">
        ${item.question}
        <span class="faq-chevron" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7"/></svg>
        </span>
      </button>
      <div class="faq-a" role="region">
        <div class="faq-a-inner">${item.answer}</div>
      </div>
    </div>`).join('');
  initFAQ();
}

// ── Apply all content ─────────────────────────────────────────────────────────
function applyContent(c) {
  if (!c) return;
  applyTextFields(c);
  renderSteps(c.steps);
  renderFeatures(c.features);
  renderPlans(c.plans);
  renderAreas(c.coverage);
  renderTestimonials(c.testimonials);
  renderAppPerks(c.app);
  renderFAQ(c.faq);
  // Re-observe new fade-up elements
  document.querySelectorAll('.fade-up:not(.visible)').forEach(el => revealObserver.observe(el));
}

// ── Scroll-reveal ─────────────────────────────────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); revealObserver.unobserve(e.target); }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-up').forEach(el => revealObserver.observe(el));

// ── Navbar scroll ─────────────────────────────────────────────────────────────
const nav = document.querySelector('.nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// ── Mobile menu ───────────────────────────────────────────────────────────────
const burger     = document.querySelector('.nav__burger');
const mobileMenu = document.querySelector('.mobile-menu');

burger.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
  const spans = burger.querySelectorAll('span');
  if (open) {
    spans[0].style.cssText = 'transform:rotate(45deg) translate(5px,5px)';
    spans[1].style.cssText = 'opacity:0';
    spans[2].style.cssText = 'transform:rotate(-45deg) translate(5px,-5px)';
  } else { spans.forEach(s => s.removeAttribute('style')); }
});
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    mobileMenu.classList.remove('open');
    burger.setAttribute('aria-expanded', false);
    burger.querySelectorAll('span').forEach(s => s.removeAttribute('style'));
  });
});

// ── FAQ accordion ─────────────────────────────────────────────────────────────
function initFAQ() {
  document.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-q').addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}
initFAQ();

// ── Cylinder selector ─────────────────────────────────────────────────────────
document.querySelectorAll('.cyl-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.cyl-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  });
});

// ── Animated counters ─────────────────────────────────────────────────────────
function animateCounter(el, target, suffix) {
  let v = 0;
  const step = target / 60;
  const t = setInterval(() => {
    v += step;
    if (v >= target) { v = target; clearInterval(t); }
    el.textContent = Math.floor(v).toLocaleString() + suffix;
  }, 25);
}
const statsObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('[data-count]').forEach(el => {
      animateCounter(el, parseInt(el.dataset.count), el.dataset.suffix || '');
    });
    statsObserver.unobserve(e.target);
  });
}, { threshold: 0.4 });
const statsSection = document.querySelector('.stats');
if (statsSection) statsObserver.observe(statsSection);

// ── Smooth scroll ─────────────────────────────────────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
loadContent().then(applyContent);

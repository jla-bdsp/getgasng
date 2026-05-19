/* AutoNG — Main Frontend Logic */

const PAYSTACK_PUBLIC_KEY = window.__ENV?.PAYSTACK_PUBLIC_KEY || '';
const INSPECT_FEE = 2500;
const HOLD_FEE = 20000;

// ── State ──────────────────────────────────────────────────────────────────
let allCars = [];
let filteredCars = [];
let expandedCardId = null;
let inspectCarId = null;
let countdownTimer = null;

// ── Mock data (fallback when API unavailable) ──────────────────────────────
const MOCK_CARS = [
  {
    id: 'mock-1',
    title: '2019 Toyota Camry XSE',
    make: 'Toyota', model: 'Camry', year: 2019,
    price: 12500000,
    location: 'Port Harcourt',
    mileage: 42000,
    condition: 'Excellent',
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    color: 'Pearl White',
    description: 'Well maintained Camry XSE. Single owner, full service history available. All factory options intact. Clean Nigeria Custom papers.',
    images: ['https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800&q=80',
             'https://images.unsplash.com/photo-1617469165786-8007eda3caa7?w=800&q=80',
             'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80'],
    status: 'available', is_approved: true
  },
  {
    id: 'mock-2',
    title: '2020 Mercedes-Benz C300',
    make: 'Mercedes-Benz', model: 'C300', year: 2020,
    price: 24000000,
    location: 'Lagos',
    mileage: 28000,
    condition: 'Excellent',
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    color: 'Obsidian Black',
    description: 'Locally used Merc C300. Panoramic roof, Burmester sound system, heated seats. Zero accident history.',
    images: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80',
             'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800&q=80'],
    status: 'available', is_approved: true
  },
  {
    id: 'mock-3',
    title: '2018 Honda Accord Sport',
    make: 'Honda', model: 'Accord', year: 2018,
    price: 9800000,
    location: 'Abuja',
    mileage: 61000,
    condition: 'Good',
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    color: 'Modern Steel',
    description: 'Clean Accord Sport. New tyres, serviced recently. Sunroof, Apple CarPlay, heated front seats.',
    images: ['https://images.unsplash.com/photo-1606152421802-db97b9c7a11b?w=800&q=80'],
    status: 'held', is_approved: true
  },
  {
    id: 'mock-4',
    title: '2021 Toyota RAV4 LE',
    make: 'Toyota', model: 'RAV4', year: 2021,
    price: 19500000,
    location: 'Port Harcourt',
    mileage: 15000,
    condition: 'Excellent',
    transmission: 'Automatic',
    fuel_type: 'Petrol',
    color: 'Magnetic Gray',
    description: 'Almost new RAV4. Well kept by expat owner. Toyota Safety Sense, lane assist, pre-collision system.',
    images: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&q=80',
             'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800&q=80'],
    status: 'available', is_approved: true
  }
];

// ── Bootstrap ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadCars();
  loadAuction();
  initFilters();
  initModals();
  initSellForm();
});

// ── Format helpers ─────────────────────────────────────────────────────────
function formatPrice(n) {
  return '₦' + Number(n).toLocaleString('en-NG');
}

function formatMileage(n) {
  return n ? Number(n).toLocaleString('en-NG') + ' km' : 'N/A';
}

// ── Load cars ──────────────────────────────────────────────────────────────
async function loadCars() {
  showLoading();
  try {
    const res = await fetch('/api/cars');
    if (!res.ok) throw new Error('API error');
    const { cars } = await res.json();
    allCars = cars || [];
  } catch {
    allCars = MOCK_CARS;
  }
  filteredCars = [...allCars];
  renderCars(filteredCars);
  updateCount(filteredCars.length);
}

// ── Load auction ───────────────────────────────────────────────────────────
async function loadAuction() {
  try {
    const res = await fetch('/api/auction/next');
    const { auction } = await res.json();
    if (auction) showAuctionBanner(auction);
  } catch { /* silent */ }
}

function showAuctionBanner(auction) {
  const banner = document.getElementById('auction-banner');
  if (!banner) return;
  document.getElementById('auction-title-text').textContent = auction.title;
  banner.classList.remove('hidden');
  startCountdown(auction.auction_date);
}

function startCountdown(dateStr) {
  if (countdownTimer) clearInterval(countdownTimer);

  function tick() {
    const diff = new Date(dateStr) - Date.now();
    if (diff <= 0) {
      clearInterval(countdownTimer);
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '00';
      });
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = pad(v); };
    set('cd-days', d); set('cd-hours', h); set('cd-mins', m); set('cd-secs', s);
  }

  tick();
  countdownTimer = setInterval(tick, 1000);
}

// ── Filters ────────────────────────────────────────────────────────────────
function initFilters() {
  const search = document.getElementById('search');
  const makeFilter = document.getElementById('filter-make');
  const locationFilter = document.getElementById('filter-location');
  const priceFilter = document.getElementById('filter-price');

  [search, makeFilter, locationFilter, priceFilter].forEach(el => {
    if (el) el.addEventListener('input', applyFilters);
  });
}

function applyFilters() {
  const q       = (document.getElementById('search')?.value || '').toLowerCase();
  const make    = document.getElementById('filter-make')?.value || '';
  const loc     = document.getElementById('filter-location')?.value || '';
  const price   = document.getElementById('filter-price')?.value || '';

  filteredCars = allCars.filter(car => {
    if (q && !`${car.title} ${car.make} ${car.model} ${car.year}`.toLowerCase().includes(q)) return false;
    if (make && car.make !== make) return false;
    if (loc && car.location !== loc) return false;
    if (price) {
      const [min, max] = price.split('-').map(Number);
      if (max && car.price > max) return false;
      if (!max && car.price < min) return false;
      if (car.price < min) return false;
    }
    return true;
  });

  if (expandedCardId) expandedCardId = null;
  renderCars(filteredCars);
  updateCount(filteredCars.length);
}

// ── Render cars ────────────────────────────────────────────────────────────
function showLoading() {
  const grid = document.getElementById('cars-grid');
  if (!grid) return;
  grid.innerHTML = `<div class="cars-loading"><div class="spinner"></div><p style="color:var(--muted)">Loading listings…</p></div>`;
}

function updateCount(n) {
  const el = document.getElementById('cars-count-text');
  if (el) el.innerHTML = `<strong>${n}</strong> listing${n !== 1 ? 's' : ''} found`;
}

function renderCars(cars) {
  const grid = document.getElementById('cars-grid');
  if (!grid) return;

  if (!cars.length) {
    grid.innerHTML = `<div class="cars-empty"><strong>No listings found</strong><p>Try adjusting your filters.</p></div>`;
    return;
  }

  grid.innerHTML = cars.map(car => carCardHTML(car)).join('');

  grid.querySelectorAll('.car-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.inspect-btn, .submit-pay-btn, .btn')) return;
      const id = card.dataset.id;
      toggleExpand(id);
    });
  });

  grid.querySelectorAll('.inspect-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openInspectModal(id);
    });
  });

  grid.querySelectorAll('.gallery-thumb').forEach(thumb => {
    thumb.addEventListener('click', e => {
      e.stopPropagation();
      const mainImg = thumb.closest('.gallery')?.querySelector('.gallery-main img');
      if (mainImg) mainImg.src = thumb.querySelector('img').src;
      thumb.closest('.gallery-thumbs').querySelectorAll('.gallery-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });
}

function carCardHTML(car) {
  const img = car.images?.[0] || 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?w=800&q=80';
  const statusLabel = car.status === 'held' ? 'Held — Under Inspection' : car.status === 'sold' ? 'Sold' : 'Available';
  const statusClass = car.status === 'held' ? 'badge-held' : car.status === 'sold' ? 'badge-sold' : 'badge-available';
  const isExpanded  = expandedCardId === car.id;
  const canInspect  = car.status !== 'sold';

  const specIcon = (path) => `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${path}"/></svg>`;
  const carIcon  = specIcon('M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5');
  const gearIcon = specIcon('M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 3a2 2 0 1 1-2 2 2 2 0 0 1 2-2zm0 14.2a7.2 7.2 0 0 1-6-10.56 2 2 0 0 0 3.46 2A2 2 0 0 0 12 9a2 2 0 0 0 2.54 1.64 2 2 0 0 0 3.46-2A7.2 7.2 0 0 1 12 19.2z');
  const fuelIcon = specIcon('M3 22V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4h1a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-1v2');

  const galleryThumbs = (car.images || []).slice(1).map((src, i) => `
    <div class="gallery-thumb"><img src="${src}" alt="View ${i+2}" loading="lazy"></div>
  `).join('');

  const specsGridHTML = `
    <div class="specs-grid">
      <div class="spec-item"><div class="spec-label">Year</div><div class="spec-value">${car.year}</div></div>
      <div class="spec-item"><div class="spec-label">Mileage</div><div class="spec-value">${formatMileage(car.mileage)}</div></div>
      <div class="spec-item"><div class="spec-label">Transmission</div><div class="spec-value">${car.transmission || 'N/A'}</div></div>
      <div class="spec-item"><div class="spec-label">Fuel</div><div class="spec-value">${car.fuel_type || 'N/A'}</div></div>
      <div class="spec-item"><div class="spec-label">Condition</div><div class="spec-value">${car.condition || 'N/A'}</div></div>
      <div class="spec-item"><div class="spec-label">Color</div><div class="spec-value">${car.color || 'N/A'}</div></div>
    </div>`;

  return `
  <div class="car-card${isExpanded ? ' expanded' : ''}" data-id="${car.id}">
    <div class="car-thumb">
      <img src="${img}" alt="${car.title}" loading="lazy">
      <div class="car-overlay">
        <span class="car-price">${formatPrice(car.price)}</span>
        <span class="car-location">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5"/></svg>
          ${car.location}
        </span>
      </div>
      <div class="car-status-badge ${statusClass}">${statusLabel}</div>
    </div>

    <div class="car-info">
      <div class="car-title">${car.title}</div>
      <div class="car-specs">
        <span class="spec-tag">${carIcon} ${car.year}</span>
        <span class="spec-tag">${gearIcon} ${car.transmission || '—'}</span>
        <span class="spec-tag">${fuelIcon} ${car.fuel_type || '—'}</span>
      </div>
      <div class="car-expand-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
      </div>
    </div>

    <div class="car-expand-panel">
      ${car.images?.length > 1 ? `
      <div class="gallery">
        <div class="gallery-main"><img src="${img}" alt="${car.title}"></div>
        <div class="gallery-thumbs">
          <div class="gallery-thumb active"><img src="${img}" alt="Main"></div>
          ${galleryThumbs}
        </div>
      </div>` : `
      <div style="margin-top:12px;border-radius:8px;overflow:hidden;aspect-ratio:16/9;">
        <img src="${img}" alt="${car.title}" style="width:100%;height:100%;object-fit:cover;">
      </div>`}

      <div class="expand-body">
        <div class="expand-details">
          <h3>${car.title}</h3>
          <div class="expand-price">${formatPrice(car.price)}</div>
          ${specsGridHTML}
          ${car.description ? `<p class="expand-desc">${car.description}</p>` : ''}
        </div>

        <div class="inspect-sidebar">
          <h4>Inspection Services</h4>
          <div class="fee-row"><span class="fee-label">Inspection fee</span><span class="fee-amount">${formatPrice(INSPECT_FEE)}</span></div>
          <div class="fee-row"><span class="fee-label">Hold fee (optional)</span><span class="fee-amount">${formatPrice(HOLD_FEE)}</span></div>
          <div class="fee-row"><span class="fee-label">Status</span><span class="fee-amount ${statusClass.replace('badge-','')==='held' ? '' : ''}" style="color:${car.status==='held'?'var(--yellow)':car.status==='sold'?'var(--red)':'var(--green)'}">${statusLabel}</span></div>
          ${canInspect ? `<button class="inspect-btn" data-id="${car.id}">Request Inspection →</button>` : `<button class="inspect-btn" disabled>Car Unavailable</button>`}
        </div>
      </div>
    </div>
  </div>`;
}

function toggleExpand(id) {
  if (expandedCardId === id) {
    expandedCardId = null;
  } else {
    expandedCardId = id;
  }
  renderCars(filteredCars);
  if (expandedCardId) {
    setTimeout(() => {
      const card = document.querySelector(`[data-id="${expandedCardId}"]`);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }
}

// ── Inspection Modal ───────────────────────────────────────────────────────
function initModals() {
  document.getElementById('modal-close')?.addEventListener('click', closeInspectModal);
  document.getElementById('inspect-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'inspect-overlay') closeInspectModal();
  });

  document.getElementById('hold-toggle-input')?.addEventListener('change', updateFeeSummary);

  document.getElementById('inspect-form')?.addEventListener('submit', handleInspectSubmit);
}

function openInspectModal(carId) {
  const car = allCars.find(c => c.id === carId);
  if (!car) return;
  inspectCarId = carId;

  document.getElementById('modal-car-title').textContent = car.title;
  document.getElementById('modal-car-price').textContent = formatPrice(car.price);
  document.getElementById('inspect-car-id').value = carId;

  const holdToggle = document.getElementById('hold-toggle-input');
  if (holdToggle) holdToggle.checked = false;

  if (car.status === 'held') {
    const holdArea = document.getElementById('hold-area');
    if (holdArea) {
      holdArea.innerHTML = `<div style="background:rgba(243,156,18,.08);border:1px solid rgba(243,156,18,.2);border-radius:8px;padding:12px 14px;font-size:13px;color:var(--yellow);">⚠ This car is currently held by another buyer. You can still request an inspection but cannot place a hold.</div>`;
    }
  }

  updateFeeSummary();

  const overlay = document.getElementById('inspect-overlay');
  if (overlay) overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeInspectModal() {
  const overlay = document.getElementById('inspect-overlay');
  if (overlay) overlay.classList.add('hidden');
  document.body.style.overflow = '';
  inspectCarId = null;

  const form = document.getElementById('inspect-form');
  if (form) form.reset();

  const holdArea = document.getElementById('hold-area');
  if (holdArea) holdArea.innerHTML = holdAreaDefault();
}

function holdAreaDefault() {
  return `
    <div class="hold-toggle" onclick="document.getElementById('hold-toggle-input').click();event.stopPropagation();">
      <div class="hold-toggle-header">
        <h4>Hold this car (₦${HOLD_FEE.toLocaleString()})</h4>
        <label class="toggle-switch" onclick="event.stopPropagation()">
          <input type="checkbox" id="hold-toggle-input">
          <span class="toggle-track"></span>
        </label>
      </div>
      <p class="hold-desc">Prevent the car from being sold while you inspect. Only one hold allowed per car. Refundable if car has a major undisclosed fault.</p>
    </div>`;
}

function updateFeeSummary() {
  const holdChecked = document.getElementById('hold-toggle-input')?.checked;
  const total = INSPECT_FEE + (holdChecked ? HOLD_FEE : 0);

  const inspFeeEl = document.getElementById('summary-inspect-fee');
  const holdFeeEl = document.getElementById('summary-hold-fee');
  const totalEl   = document.getElementById('summary-total');

  if (inspFeeEl) inspFeeEl.textContent = formatPrice(INSPECT_FEE);
  if (holdFeeEl) holdFeeEl.textContent = holdChecked ? formatPrice(HOLD_FEE) : '—';
  if (totalEl)   totalEl.textContent   = formatPrice(total);

  const btn = document.getElementById('pay-btn');
  if (btn) btn.textContent = `Pay ${formatPrice(total)} →`;
}

async function handleInspectSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('pay-btn');

  const name     = form.querySelector('#inp-name').value.trim();
  const email    = form.querySelector('#inp-email').value.trim();
  const phone    = form.querySelector('#inp-phone').value.trim();
  const whatsapp = form.querySelector('#inp-whatsapp').value.trim();
  const carId    = form.querySelector('#inspect-car-id').value;
  const wantsHold = document.getElementById('hold-toggle-input')?.checked || false;

  if (!name || !email || !phone) {
    toast('Please fill in all required fields.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Initialising payment…';

  try {
    const res = await fetch('/api/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ car_id: carId, name, email, phone, whatsapp, wants_hold: wantsHold })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to initialise');

    // Open Paystack inline
    const handler = PaystackPop.setup({
      key: data.publicKey || PAYSTACK_PUBLIC_KEY,
      email,
      amount: data.amount,
      ref: data.reference,
      currency: 'NGN',
      metadata: { name, phone },
      onSuccess: (txn) => verifyPayment(txn.reference),
      onCancel: () => {
        btn.disabled = false;
        updateFeeSummary();
        toast('Payment cancelled.', 'error');
      }
    });
    handler.openIframe();

  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    updateFeeSummary();
  }
}

async function verifyPayment(reference) {
  try {
    const res = await fetch('/api/payment/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    const data = await res.json();
    if (data.success) {
      closeInspectModal();
      toast('Payment confirmed! Our team will contact you within 24 hours.', 'success');
      loadCars();
    } else {
      toast(data.error || 'Payment verification failed.', 'error');
    }
  } catch {
    toast('Could not verify payment. Please contact support.', 'error');
  }
}

// ── Sell a Car Form ────────────────────────────────────────────────────────
function initSellForm() {
  const sellBtn = document.getElementById('sell-btn');
  if (sellBtn) sellBtn.addEventListener('click', openSellModal);

  const sellOverlay = document.getElementById('sell-overlay');
  if (sellOverlay) {
    sellOverlay.addEventListener('click', e => { if (e.target.id === 'sell-overlay') closeSellModal(); });
  }

  document.getElementById('sell-close')?.addEventListener('click', closeSellModal);

  const nextBtns = document.querySelectorAll('.sell-next-btn');
  nextBtns.forEach(btn => btn.addEventListener('click', () => goSellStep(parseInt(btn.dataset.step))));

  const backBtns = document.querySelectorAll('.sell-back-btn');
  backBtns.forEach(btn => btn.addEventListener('click', () => goSellStep(parseInt(btn.dataset.step))));

  initImageUpload();

  document.getElementById('sell-form')?.addEventListener('submit', handleSellSubmit);
}

let currentSellStep = 1;

function openSellModal() {
  currentSellStep = 1;
  goSellStep(1);
  document.getElementById('sell-overlay')?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSellModal() {
  document.getElementById('sell-overlay')?.classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('sell-form')?.reset();
  document.getElementById('image-previews').innerHTML = '';
  uploadedFiles = [];
  goSellStep(1);
}

function goSellStep(step) {
  currentSellStep = step;
  document.querySelectorAll('.step-panel').forEach((p, i) => {
    p.classList.toggle('active', i + 1 === step);
  });
  document.querySelectorAll('.step-dot').forEach((d, i) => {
    d.classList.toggle('active', i + 1 <= step);
  });
}

// image upload
let uploadedFiles = [];

function initImageUpload() {
  const area   = document.getElementById('upload-area');
  const input  = document.getElementById('image-input');
  const preview = document.getElementById('image-previews');
  if (!area || !input) return;

  area.addEventListener('click', () => input.click());
  area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
  area.addEventListener('dragleave', () => area.classList.remove('dragover'));
  area.addEventListener('drop', e => {
    e.preventDefault();
    area.classList.remove('dragover');
    addFiles([...e.dataTransfer.files]);
  });

  input.addEventListener('change', () => {
    addFiles([...input.files]);
    input.value = '';
  });

  function addFiles(files) {
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    imageFiles.slice(0, 10 - uploadedFiles.length).forEach(file => {
      uploadedFiles.push(file);
      const reader = new FileReader();
      reader.onload = ev => {
        const div = document.createElement('div');
        div.className = 'preview-thumb';
        div.innerHTML = `
          <img src="${ev.target.result}" alt="Preview">
          <button type="button" class="preview-remove">×</button>`;
        div.querySelector('.preview-remove').addEventListener('click', () => {
          const idx = [...preview.children].indexOf(div);
          uploadedFiles.splice(idx, 1);
          div.remove();
        });
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  }
}

async function handleSellSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn  = document.getElementById('sell-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  const fd = new FormData();
  fd.append('title',         form.querySelector('#sell-title').value);
  fd.append('make',          form.querySelector('#sell-make').value);
  fd.append('model',         form.querySelector('#sell-model').value);
  fd.append('year',          form.querySelector('#sell-year').value);
  fd.append('price',         form.querySelector('#sell-price').value);
  fd.append('location',      form.querySelector('#sell-location').value);
  fd.append('mileage',       form.querySelector('#sell-mileage').value);
  fd.append('condition',     form.querySelector('#sell-condition').value);
  fd.append('transmission',  form.querySelector('#sell-transmission').value);
  fd.append('fuel_type',     form.querySelector('#sell-fuel').value);
  fd.append('color',         form.querySelector('#sell-color').value);
  fd.append('description',   form.querySelector('#sell-description').value);
  fd.append('seller_name',   form.querySelector('#sell-seller-name').value);
  fd.append('seller_phone',  form.querySelector('#sell-seller-phone').value);
  fd.append('seller_email',  form.querySelector('#sell-seller-email').value);
  fd.append('seller_whatsapp', form.querySelector('#sell-seller-wa').value);

  uploadedFiles.forEach(f => fd.append('images', f));

  try {
    const res = await fetch('/api/cars/submit', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Submission failed');
    closeSellModal();
    toast('Your listing has been submitted and is pending review. We\'ll notify you once approved.', 'success');
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Submit Listing';
  }
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

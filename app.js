/* ═══════════════════════════════════════
   CoreInventory — Main JavaScript
   File: js/app.js
═══════════════════════════════════════ */

// ═══════════════════════════════════════════════════════
// DEFAULT DATA
// ═══════════════════════════════════════════════════════
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Steel Rods',     sku: 'STL-001', category: 'Raw Materials', unit: 'kg',  stock: 77, reorderAt: 20 },
  { id: 'p2', name: 'Office Chairs',  sku: 'FRN-042', category: 'Furniture',     unit: 'pcs', stock: 14, reorderAt: 10 },
  { id: 'p3', name: 'Copper Wire',    sku: 'ELC-007', category: 'Electrical',    unit: 'm',   stock: 6,  reorderAt: 15 },
  { id: 'p4', name: 'PVC Pipes',      sku: 'PLM-003', category: 'Plumbing',      unit: 'pcs', stock: 0,  reorderAt: 10 },
  { id: 'p5', name: 'Safety Helmets', sku: 'SAF-012', category: 'Safety',        unit: 'pcs', stock: 32, reorderAt: 10 },
];
const DEFAULT_RECEIPTS = [
  { id: 'REC-001', supplier: 'MetalCorp', product: 'Steel Rods',    qty: 50,  status: 'Done',    date: '2025-03-10', items: 1 },
  { id: 'REC-002', supplier: 'FurniHub',  product: 'Office Chairs', qty: 20,  status: 'Waiting', date: '2025-03-13', items: 1 },
  { id: 'REC-003', supplier: 'ElecParts', product: 'Copper Wire',   qty: 100, status: 'Ready',   date: '2025-03-14', items: 1 },
];
const DEFAULT_DELIVERIES = [
  { id: 'DEL-001', customer: 'ABC Corp', product: 'Steel Rods',    qty: 10, status: 'Done', date: '2025-03-09', items: 1 },
  { id: 'DEL-002', customer: 'XYZ Ltd',  product: 'Office Chairs', qty: 5,  status: 'Pick', date: '2025-03-14', items: 1 },
];
const DEFAULT_TRANSFERS = [
  { id: 'TRF-001', product: 'Steel Rods',  from: 'Main Warehouse', to: 'Production Floor', qty: 30, status: 'Done',  date: '2025-03-11' },
  { id: 'TRF-002', product: 'Copper Wire', from: 'Rack A',         to: 'Rack B',           qty: 10, status: 'Ready', date: '2025-03-14' },
];
const DEFAULT_ADJUSTMENTS = [
  { id: 'ADJ-001', product: 'Steel Rods', type: 'Decrease', qty: 3, reason: 'Damaged',        date: '2025-03-12', by: 'Rahul M.' },
  { id: 'ADJ-002', product: 'PVC Pipes',  type: 'Decrease', qty: 5, reason: 'Physical Count', date: '2025-03-13', by: 'Amit K.' },
];

// ═══════════════════════════════════════════════════════
// LIVE DATA VARIABLES
// ═══════════════════════════════════════════════════════
let products    = [];
let receipts    = [];
let deliveries  = [];
let transfers   = [];
let adjustments = [];
let moveHistory = [];
let warehouses  = ['Main Warehouse', 'Production Floor', 'Rack A', 'Rack B'];
let currentUser = null;

// ═══════════════════════════════════════════════════════
// LOCAL STORAGE — LOAD & SAVE
// ═══════════════════════════════════════════════════════
function loadData() {
  products    = JSON.parse(localStorage.getItem('ci_products'))    || JSON.parse(JSON.stringify(DEFAULT_PRODUCTS));
  receipts    = JSON.parse(localStorage.getItem('ci_receipts'))    || JSON.parse(JSON.stringify(DEFAULT_RECEIPTS));
  deliveries  = JSON.parse(localStorage.getItem('ci_deliveries'))  || JSON.parse(JSON.stringify(DEFAULT_DELIVERIES));
  transfers   = JSON.parse(localStorage.getItem('ci_transfers'))   || JSON.parse(JSON.stringify(DEFAULT_TRANSFERS));
  adjustments = JSON.parse(localStorage.getItem('ci_adjustments')) || JSON.parse(JSON.stringify(DEFAULT_ADJUSTMENTS));
  warehouses  = JSON.parse(localStorage.getItem('ci_warehouses'))  || warehouses.slice();
  rebuildHistory();
}

function saveData() {
  localStorage.setItem('ci_products',    JSON.stringify(products));
  localStorage.setItem('ci_receipts',    JSON.stringify(receipts));
  localStorage.setItem('ci_deliveries',  JSON.stringify(deliveries));
  localStorage.setItem('ci_transfers',   JSON.stringify(transfers));
  localStorage.setItem('ci_adjustments', JSON.stringify(adjustments));
  localStorage.setItem('ci_warehouses',  JSON.stringify(warehouses));
}

function rebuildHistory() {
  moveHistory = [];
  receipts.filter(r => r.status === 'Done').forEach(r => {
    const p = products.find(x => x.name === r.product);
    moveHistory.push({ date: r.date, ref: r.id, product: r.product, type: 'Receipt', movement: 'IN', qty: '+' + r.qty, unit: p ? p.unit : '', stockAfter: p ? p.stock : '—' });
  });
  deliveries.filter(d => d.status === 'Done').forEach(d => {
    const p = products.find(x => x.name === d.product);
    moveHistory.push({ date: d.date, ref: d.id, product: d.product, type: 'Delivery', movement: 'OUT', qty: '-' + d.qty, unit: p ? p.unit : '', stockAfter: p ? p.stock : '—' });
  });
  transfers.filter(t => t.status === 'Done').forEach(t => {
    moveHistory.push({ date: t.date, ref: t.id, product: t.product, type: 'Transfer', movement: t.from + '→' + t.to, qty: t.qty, unit: '', stockAfter: '—' });
  });
  adjustments.forEach(a => {
    const p = products.find(x => x.name === a.product);
    moveHistory.push({ date: a.date, ref: a.id, product: a.product, type: 'Adjustment', movement: a.type, qty: (a.type === 'Increase' ? '+' : '-') + a.qty, unit: p ? p.unit : '', stockAfter: p ? p.stock : '—' });
  });
  moveHistory.sort((a, b) => b.date.localeCompare(a.date));
}

// ═══════════════════════════════════════════════════════
// AUTH — Session helpers + PHP/MySQL API
// ═══════════════════════════════════════════════════════
const API = 'http://localhost/coreinventory-backend';

function getSession()   { return JSON.parse(localStorage.getItem('ci_session') || 'null'); }
function saveSession(u) { localStorage.setItem('ci_session', JSON.stringify(u)); }
function clearSession() { localStorage.removeItem('ci_session'); }

async function apiPost(endpoint, body) {
  const res = await fetch(API + endpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  return res.json();
}

// ═══════════════════════════════════════════════════════
// PAGE SWITCHER
// ═══════════════════════════════════════════════════════
const ALL_PAGES = ['role-select-page', 'manager-login-page', 'staff-login-page', 'dashboard-page'];

function showPage(id) {
  ALL_PAGES.forEach(p => document.getElementById(p).style.display = 'none');
  document.getElementById(id).style.display = 'flex';
}

function goToLogin(role) {
  showPage(role === 'manager' ? 'manager-login-page' : 'staff-login-page');
}

// ═══════════════════════════════════════════════════════
// AUTH FORM — Tab Switching
// ═══════════════════════════════════════════════════════
let mTab = 'login';
let sTab = 'login';

function mSwitchTab(t) {
  mTab = t;
  document.getElementById('m-tab-login').className  = 'tab' + (t === 'login'  ? ' active-manager' : '');
  document.getElementById('m-tab-signup').className = 'tab' + (t === 'signup' ? ' active-manager' : '');
  document.getElementById('m-name-field').style.display  = t === 'signup' ? 'block'  : 'none';
  document.getElementById('m-forgot-link').style.display = t === 'login'  ? 'inline' : 'none';
  document.getElementById('m-auth-btn').textContent = t === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('m-auth-error').style.display = 'none';
}

function sSwitchTab(t) {
  sTab = t;
  document.getElementById('s-tab-login').className  = 'tab' + (t === 'login'  ? ' active-staff' : '');
  document.getElementById('s-tab-signup').className = 'tab' + (t === 'signup' ? ' active-staff' : '');
  document.getElementById('s-name-field').style.display  = t === 'signup' ? 'block'  : 'none';
  document.getElementById('s-forgot-link').style.display = t === 'login'  ? 'inline' : 'none';
  document.getElementById('s-auth-btn').textContent = t === 'login' ? 'Sign In' : 'Create Account';
  document.getElementById('s-auth-error').style.display = 'none';
}

// Show/hide subsections inside each login box
function mShowAuth() {
  ['m-forgot-section', 'm-otp-section', 'm-newpw-section'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('m-auth-section').style.display = 'block';
}
function sShowAuth() {
  ['s-forgot-section', 's-otp-section', 's-newpw-section'].forEach(id => document.getElementById(id).style.display = 'none');
  document.getElementById('s-auth-section').style.display = 'block';
}
function mShowForgot() {
  document.getElementById('m-auth-section').style.display   = 'none';
  document.getElementById('m-forgot-section').style.display = 'block';
}
function sShowForgot() {
  document.getElementById('s-auth-section').style.display   = 'none';
  document.getElementById('s-forgot-section').style.display = 'block';
}

// ═══════════════════════════════════════════════════════
// AUTH — Sign In / Sign Up
// ═══════════════════════════════════════════════════════
async function handleAuth(role) {
  const p         = role === 'manager' ? 'm' : 's';
  const tab       = role === 'manager' ? mTab : sTab;
  const email     = document.getElementById(`${p}-inp-email`).value.trim();
  const pw        = document.getElementById(`${p}-inp-password`).value;
  const name      = document.getElementById(`${p}-inp-name`).value.trim();
  const errEl     = document.getElementById(`${p}-auth-error`);
  const roleLabel = role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff';
  const btn       = document.getElementById(`${p}-auth-btn`);

  if (!email || !pw) { showErr(errEl, 'Please fill in all fields.'); return; }

  btn.disabled    = true;
  btn.textContent = tab === 'login' ? 'Signing in…' : 'Creating account…';
  errEl.style.display = 'none';

  try {
    if (tab === 'login') {
      const data = await apiPost('/login.php', { email, password: pw, role: roleLabel });
      if (!data.success) { showErr(errEl, data.message); return; }
      saveSession(data.user);
      openDashboard(data.user);
    } else {
      if (!name) { showErr(errEl, 'Please enter your name.'); return; }
      const data = await apiPost('/signup.php', { name, email, password: pw, role: roleLabel });
      if (!data.success) { showErr(errEl, data.message); return; }
      saveSession(data.user);
      openDashboard(data.user);
    }
  } catch (e) {
    showErr(errEl, 'Cannot reach server. Is XAMPP running?');
  } finally {
    btn.disabled    = false;
    btn.textContent = tab === 'login' ? 'Sign In' : 'Create Account';
  }
}

// ═══════════════════════════════════════════════════════
// AUTH — OTP / Forgot Password
// ═══════════════════════════════════════════════════════
let otpForEmail = '';
const DEMO_OTP  = '123456';

async function sendOTP(role) {
  const p     = role === 'manager' ? 'm' : 's';
  const email = document.getElementById(`${p}-forgot-email`).value.trim();
  const errEl = document.getElementById(`${p}-forgot-error`);
  const roleLabel = role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff';

  if (!email) { showErr(errEl, 'Please enter your email.'); return; }

  const data = await apiPost('/forgot_password.php', { email, role: roleLabel });
  if (!data.success) { showErr(errEl, data.message); return; }

  otpForEmail = email;
  for (let i = 0; i < 6; i++) {
    const el = document.getElementById(`${p}-o${i}`);
    el.value = '';
    el.classList.remove('filled');
  }
  document.getElementById(`${p}-otp-hint`).innerHTML = `OTP sent to <b>${email}</b> &nbsp;|&nbsp; Demo: <b>123456</b>`;
  document.getElementById(`${p}-forgot-section`).style.display = 'none';
  document.getElementById(`${p}-otp-section`).style.display    = 'block';
  document.getElementById(`${p}-otp-error`).style.display      = 'none';
}

// Auto-advance to next box when a digit is typed
function otpType(p, i) {
  const el = document.getElementById(`${p}-o${i}`);
  el.value = el.value.replace(/[^0-9]/g, '');         // allow digits only
  el.classList.toggle('filled', el.value !== '');
  if (el.value && i < 5) document.getElementById(`${p}-o${i + 1}`).focus();
}

// Go back to previous box on Backspace
function otpBack(e, p, i) {
  if (e.key === 'Backspace' && !document.getElementById(`${p}-o${i}`).value && i > 0) {
    document.getElementById(`${p}-o${i - 1}`).focus();
  }
}

function verifyOTP(role) {
  const p       = role === 'manager' ? 'm' : 's';
  const entered = [0, 1, 2, 3, 4, 5].map(i => document.getElementById(`${p}-o${i}`).value).join('');
  const errEl   = document.getElementById(`${p}-otp-error`);
  if (entered !== DEMO_OTP) { showErr(errEl, 'Wrong OTP. Hint: 123456'); return; }
  errEl.style.display = 'none';
  document.getElementById(`${p}-otp-section`).style.display   = 'none';
  document.getElementById(`${p}-newpw-section`).style.display = 'block';
}

async function saveNewPassword(role) {
  const p         = role === 'manager' ? 'm' : 's';
  const pw        = document.getElementById(`${p}-inp-newpw`).value;
  const errEl     = document.getElementById(`${p}-newpw-error`);
  const roleLabel = role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff';

  if (pw.length < 6) { showErr(errEl, 'Min 6 characters required.'); return; }

  const data = await apiPost('/reset_password.php', { email: otpForEmail, password: pw, role: roleLabel });
  if (!data.success) { showErr(errEl, data.message); return; }

  alert('Password updated! Please sign in.');
  role === 'manager' ? mShowAuth() : sShowAuth();
}

// ═══════════════════════════════════════════════════════
// DASHBOARD — Open & Logout
// ═══════════════════════════════════════════════════════
function openDashboard(user) {
  currentUser = user;
  loadData();
  showPage('dashboard-page');

  // Set user info in sidebar
  document.getElementById('user-name').textContent     = user.name;
  document.getElementById('user-role-tag').textContent = user.role;
  document.getElementById('user-avatar').textContent   = user.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar').className     = 'user-avatar ' + (user.role === 'Inventory Manager' ? 'avatar-manager' : 'avatar-staff');

  // Set role badge in topbar
  const rt = document.getElementById('topbar-role-tag');
  rt.textContent = user.role;
  rt.className   = 'role-tag ' + (user.role === 'Inventory Manager' ? 'role-tag-manager' : 'role-tag-staff');

  // Set user info in settings panel
  document.getElementById('settings-user-info').innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;padding:4px 0">
      <div class="user-avatar ${user.role === 'Inventory Manager' ? 'avatar-manager' : 'avatar-staff'}" style="width:44px;height:44px;font-size:18px">
        ${user.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <div style="font-size:14px;font-weight:600">${user.name}</div>
        <div style="font-size:12px;color:#888">${user.email || ''}</div>
        <div style="margin-top:4px">
          <span class="role-tag ${user.role === 'Inventory Manager' ? 'role-tag-manager' : 'role-tag-staff'}">${user.role}</span>
        </div>
      </div>
    </div>`;

  renderAll();
}

function logout() {
  clearSession();
  currentUser = null;
  showPage('role-select-page');
  mShowAuth(); mSwitchTab('login');
  sShowAuth(); sSwitchTab('login');
}

// ═══════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ═══════════════════════════════════════════════════════
const pageTitles = {
  dashboard:   'Dashboard',
  products:    'Products',
  receipts:    'Receipts',
  deliveries:  'Delivery Orders',
  transfers:   'Internal Transfers',
  adjustments: 'Stock Adjustments',
  history:     'Move History',
  settings:    'Settings',
};

function goPage(page, btn) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
  document.getElementById('section-' + page).classList.add('active');
  document.getElementById('page-title').textContent = pageTitles[page] || page;
  document.getElementById('global-search').value = '';
  // Render the opened page
  if (page === 'products')    renderProducts();
  if (page === 'receipts')    renderReceipts();
  if (page === 'deliveries')  renderDeliveries();
  if (page === 'transfers')   renderTransfers();
  if (page === 'adjustments') renderAdjustments();
  if (page === 'history')     renderHistory();
  if (page === 'settings')    renderSettings();
}

function renderAll() {
  renderKPIs();
  renderAlerts();
  renderActivity();
  renderProducts();
  renderReceipts();
  renderDeliveries();
  renderTransfers();
  renderAdjustments();
  renderHistory();
  renderSettings();
}

// ═══════════════════════════════════════════════════════
// DASHBOARD — KPIs, Alerts, Activity Table
// ═══════════════════════════════════════════════════════
function renderKPIs() {
  const low = products.filter(p => p.stock > 0 && p.stock <= p.reorderAt).length;
  const out = products.filter(p => p.stock === 0).length;
  document.getElementById('kpi-total').textContent      = products.length;
  document.getElementById('kpi-low').textContent        = low;
  document.getElementById('kpi-out').textContent        = out;
  document.getElementById('kpi-receipts').textContent   = receipts.filter(r => r.status !== 'Done' && r.status !== 'Canceled').length;
  document.getElementById('kpi-deliveries').textContent = deliveries.filter(d => d.status !== 'Done' && d.status !== 'Canceled').length;
  document.getElementById('stock-badge').textContent    = low + out;
}

function renderAlerts() {
  const alerts = products.filter(p => p.stock <= p.reorderAt);
  document.getElementById('alert-count').textContent = alerts.length + ' items';
  document.getElementById('alert-list').innerHTML = alerts.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 4px;border-bottom:1px solid #f0f0f0">
      <div style="width:8px;height:8px;border-radius:50%;background:${p.stock === 0 ? '#ef4444' : '#f97316'};flex-shrink:0"></div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600">${p.name}</div>
        <div style="font-size:11px;color:#888;font-family:monospace">${p.sku}</div>
      </div>
      <div style="text-align:right">
        <div style="font-size:16px;font-weight:700;color:${p.stock === 0 ? '#ef4444' : '#f97316'}">${p.stock} ${p.unit}</div>
        <div style="font-size:11px;color:#aaa">min ${p.reorderAt}</div>
      </div>
    </div>`).join('') || '<p style="color:#aaa;padding:12px 0;font-size:13px">✅ No stock alerts right now.</p>';
}

let activeFilters = { type: 'All', status: 'All' };

function filterBy(key, value, btn) {
  activeFilters[key] = value;
  if (btn) {
    document.querySelectorAll('.filter-chip').forEach(c => {
      if (c.getAttribute('onclick') && c.getAttribute('onclick').includes(`'${key}'`))
        c.classList.remove('active');
    });
    btn.classList.add('active');
  }
  renderActivity();
}

const BC = { Done: 'badge-done', Waiting: 'badge-waiting', Ready: 'badge-ready', Draft: 'badge-draft', Pick: 'badge-pick', Pack: 'badge-pack', Canceled: 'badge-canceled' };

function renderActivity(search = '') {
  const all = [
    ...receipts.map(r    => ({ id: r.id, type: 'Receipts',    party: r.supplier, items: r.items || 1, date: r.date, status: r.status })),
    ...deliveries.map(d  => ({ id: d.id, type: 'Delivery',    party: d.customer, items: d.items || 1, date: d.date, status: d.status })),
    ...adjustments.map(a => ({ id: a.id, type: 'Adjustments', party: a.product,  items: 1,            date: a.date, status: 'Done' })),
  ];
  const f = activeFilters;
  const filtered = all.filter(op =>
    (f.type   === 'All' || op.type   === f.type) &&
    (f.status === 'All' || op.status === f.status) &&
    (!search || op.id.toLowerCase().includes(search) || op.party.toLowerCase().includes(search))
  );
  document.getElementById('activity-table').innerHTML = filtered.length
    ? filtered.map(op => `
        <tr>
          <td class="td-mono">${op.id}</td>
          <td><span style="background:#f1f5f9;color:#475569;border-radius:5px;padding:2px 8px;font-size:11px">${op.type}</span></td>
          <td>${op.party}</td>
          <td class="td-muted">${op.items}</td>
          <td class="td-muted" style="font-size:12px">${op.date}</td>
          <td><span class="badge ${BC[op.status] || 'badge-draft'}">${op.status}</span></td>
        </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:28px">No records match your filters.</td></tr>`;
}

// ═══════════════════════════════════════════════════════
// PRODUCTS MODULE
// ═══════════════════════════════════════════════════════
function stockStatus(p) {
  if (p.stock === 0)          return '<span class="badge badge-canceled">Out of Stock</span>';
  if (p.stock <= p.reorderAt) return '<span class="badge badge-waiting">Low Stock</span>';
  return '<span class="badge badge-done">In Stock</span>';
}

function stockBar(p) {
  const pct = Math.min(100, p.reorderAt > 0 ? Math.round(p.stock / p.reorderAt * 100) : 100);
  const col = p.stock === 0 ? '#ef4444' : p.stock <= p.reorderAt ? '#f97316' : '#22c55e';
  return `<div class="stock-bar-wrap">
    <span style="min-width:36px;font-size:13px;font-weight:600">${p.stock}</span>
    <div class="stock-bar"><div class="stock-bar-fill" style="width:${pct}%;background:${col}"></div></div>
  </div>`;
}

function renderProducts(search = '', cat = '') {
  const catVal = cat || document.getElementById('cat-filter').value;
  const rows = products.filter(p =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase())) &&
    (!catVal || p.category === catVal)
  );
  document.getElementById('products-table').innerHTML = rows.length
    ? rows.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td class="td-mono">${p.sku}</td>
          <td><span style="background:#f1f5f9;color:#475569;border-radius:5px;padding:2px 8px;font-size:11px">${p.category}</span></td>
          <td class="td-muted">${p.unit}</td>
          <td>${stockBar(p)}</td>
          <td class="td-muted">${p.reorderAt} ${p.unit}</td>
          <td>${stockStatus(p)}</td>
          <td><button class="act-btn red" onclick="deleteProduct('${p.id}')">Delete</button></td>
        </tr>`).join('')
    : `<tr><td colspan="8" style="text-align:center;color:#aaa;padding:28px">No products found.</td></tr>`;
}

function saveProduct() {
  const name = document.getElementById('p-name').value.trim();
  const sku  = document.getElementById('p-sku').value.trim();
  if (!name || !sku) { alert('Name and SKU are required.'); return; }
  const p = {
    id: 'p' + Date.now(),
    name, sku,
    category:  document.getElementById('p-cat').value,
    unit:      document.getElementById('p-unit').value,
    stock:     parseInt(document.getElementById('p-stock').value)   || 0,
    reorderAt: parseInt(document.getElementById('p-reorder').value) || 10,
  };
  products.push(p);
  if (p.stock > 0) {
    moveHistory.unshift({ date: today(), ref: 'INIT', product: p.name, type: 'Receipt', movement: 'IN', qty: '+' + p.stock, unit: p.unit, stockAfter: p.stock });
  }
  saveData();
  closeModal('product');
  renderAll();
  ['p-name', 'p-sku'].forEach(id => document.getElementById(id).value = '');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  products = products.filter(p => p.id !== id);
  saveData();
  renderAll();
}

// ═══════════════════════════════════════════════════════
// RECEIPTS MODULE
// ═══════════════════════════════════════════════════════
function renderReceipts(statusFilter = '') {
  const sf = statusFilter || document.getElementById('rec-status-filter').value;
  const rows = receipts.filter(r => !sf || r.status === sf);
  document.getElementById('receipts-table').innerHTML = rows.length
    ? rows.map(r => `
        <tr>
          <td class="td-mono">${r.id}</td>
          <td>${r.supplier}</td>
          <td><strong>${r.product}</strong> × ${r.qty}</td>
          <td class="td-muted">${r.date}</td>
          <td><span class="badge ${BC[r.status] || 'badge-draft'}">${r.status}</span></td>
          <td style="display:flex;gap:6px;flex-wrap:wrap">
            ${r.status === 'Waiting' ? `<button class="act-btn" onclick="updateReceipt('${r.id}','Ready')">Mark Ready</button>` : ''}
            ${r.status === 'Ready'   ? `<button class="act-btn green" onclick="validateReceipt('${r.id}')">✓ Validate</button>` : ''}
            ${r.status !== 'Done' && r.status !== 'Canceled' ? `<button class="act-btn red" onclick="updateReceipt('${r.id}','Canceled')">Cancel</button>` : ''}
          </td>
        </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:28px">No receipts found.</td></tr>`;
}

function updateReceipt(id, status) {
  const r = receipts.find(x => x.id === id);
  if (r) r.status = status;
  saveData();
  renderAll();
}

function validateReceipt(id) {
  const r = receipts.find(x => x.id === id);
  if (!r) return;
  const p = products.find(x => x.name === r.product);
  if (p) {
    p.stock += r.qty;
    moveHistory.unshift({ date: today(), ref: r.id, product: r.product, type: 'Receipt', movement: 'IN', qty: '+' + r.qty, unit: p.unit, stockAfter: p.stock });
  }
  r.status = 'Done';
  saveData();
  renderAll();
  alert(`✅ Receipt validated! Stock increased by ${r.qty} ${p ? p.unit : ''}.`);
}

function saveReceipt() {
  const sup  = document.getElementById('r-supplier').value.trim();
  const prod = document.getElementById('r-product').value;
  const qty  = parseInt(document.getElementById('r-qty').value) || 1;
  const date = document.getElementById('r-date').value || today();
  if (!sup) { alert('Supplier required.'); return; }
  receipts.unshift({ id: 'REC-' + String(receipts.length + 1).padStart(3, '0'), supplier: sup, product: prod, qty, status: 'Waiting', date, items: 1 });
  saveData();
  closeModal('receipt');
  renderAll();
  document.getElementById('r-supplier').value = '';
}

// ═══════════════════════════════════════════════════════
// DELIVERIES MODULE
// ═══════════════════════════════════════════════════════
function renderDeliveries(statusFilter = '') {
  const sf = statusFilter || document.getElementById('del-status-filter').value;
  const rows = deliveries.filter(d => !sf || d.status === sf);
  document.getElementById('deliveries-table').innerHTML = rows.length
    ? rows.map(d => `
        <tr>
          <td class="td-mono">${d.id}</td>
          <td>${d.customer}</td>
          <td><strong>${d.product}</strong> × ${d.qty}</td>
          <td class="td-muted">${d.date}</td>
          <td><span class="badge ${BC[d.status] || 'badge-draft'}">${d.status}</span></td>
          <td style="display:flex;gap:6px;flex-wrap:wrap">
            ${d.status === 'Pick' ? `<button class="act-btn" onclick="updateDelivery('${d.id}','Pack')">→ Pack</button>` : ''}
            ${d.status === 'Pack' ? `<button class="act-btn green" onclick="validateDelivery('${d.id}')">✓ Ship</button>` : ''}
            ${d.status !== 'Done' && d.status !== 'Canceled' ? `<button class="act-btn red" onclick="updateDelivery('${d.id}','Canceled')">Cancel</button>` : ''}
          </td>
        </tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;color:#aaa;padding:28px">No delivery orders found.</td></tr>`;
}

function updateDelivery(id, status) {
  const d = deliveries.find(x => x.id === id);
  if (d) d.status = status;
  saveData();
  renderAll();
}

function validateDelivery(id) {
  const d = deliveries.find(x => x.id === id);
  if (!d) return;
  const p = products.find(x => x.name === d.product);
  if (p) {
    if (p.stock < d.qty) { alert(`⚠️ Insufficient stock! Only ${p.stock} ${p.unit} available.`); return; }
    p.stock -= d.qty;
    moveHistory.unshift({ date: today(), ref: d.id, product: d.product, type: 'Delivery', movement: 'OUT', qty: '-' + d.qty, unit: p.unit, stockAfter: p.stock });
  }
  d.status = 'Done';
  saveData();
  renderAll();
  alert(`✅ Delivery shipped! Stock decreased by ${d.qty} ${p ? p.unit : ''}.`);
}

function saveDelivery() {
  const cust = document.getElementById('d-customer').value.trim();
  const prod = document.getElementById('d-product').value;
  const qty  = parseInt(document.getElementById('d-qty').value) || 1;
  const date = document.getElementById('d-date').value || today();
  if (!cust) { alert('Customer required.'); return; }
  deliveries.unshift({ id: 'DEL-' + String(deliveries.length + 1).padStart(3, '0'), customer: cust, product: prod, qty, status: 'Pick', date, items: 1 });
  saveData();
  closeModal('delivery');
  renderAll();
  document.getElementById('d-customer').value = '';
}

// ═══════════════════════════════════════════════════════
// TRANSFERS MODULE
// ═══════════════════════════════════════════════════════
function renderTransfers(statusFilter = '') {
  const sf = statusFilter || document.getElementById('trf-status-filter').value;
  const rows = transfers.filter(t => !sf || t.status === sf);
  document.getElementById('transfers-table').innerHTML = rows.length
    ? rows.map(t => `
        <tr>
          <td class="td-mono">${t.id}</td>
          <td><strong>${t.product}</strong></td>
          <td class="td-muted">${t.from}</td>
          <td class="td-muted">${t.to}</td>
          <td>${t.qty}</td>
          <td class="td-muted">${t.date}</td>
          <td><span class="badge ${BC[t.status] || 'badge-draft'}">${t.status}</span></td>
          <td style="display:flex;gap:6px">
            ${t.status === 'Draft' ? `<button class="act-btn" onclick="updateTransfer('${t.id}','Ready')">Mark Ready</button>` : ''}
            ${t.status === 'Ready' ? `<button class="act-btn green" onclick="validateTransfer('${t.id}')">✓ Complete</button>` : ''}
          </td>
        </tr>`).join('')
    : `<tr><td colspan="8" style="text-align:center;color:#aaa;padding:28px">No transfers found.</td></tr>`;
}

function updateTransfer(id, status) {
  const t = transfers.find(x => x.id === id);
  if (t) t.status = status;
  saveData();
  renderAll();
}

function validateTransfer(id) {
  const t = transfers.find(x => x.id === id);
  if (!t) return;
  moveHistory.unshift({ date: today(), ref: t.id, product: t.product, type: 'Transfer', movement: t.from + '→' + t.to, qty: t.qty, unit: '', stockAfter: '—' });
  t.status = 'Done';
  saveData();
  renderAll();
  alert(`✅ Transfer completed: ${t.product} moved from ${t.from} to ${t.to}.`);
}

function saveTransfer() {
  const prod = document.getElementById('t-product').value;
  const from = document.getElementById('t-from').value;
  const to   = document.getElementById('t-to').value;
  const qty  = parseInt(document.getElementById('t-qty').value) || 1;
  if (from === to) { alert('From and To locations cannot be the same.'); return; }
  transfers.unshift({ id: 'TRF-' + String(transfers.length + 1).padStart(3, '0'), product: prod, from, to, qty, status: 'Draft', date: today() });
  saveData();
  closeModal('transfer');
  renderAll();
}

// ═══════════════════════════════════════════════════════
// ADJUSTMENTS MODULE
// ═══════════════════════════════════════════════════════
function renderAdjustments() {
  document.getElementById('adjustments-table').innerHTML = adjustments.length
    ? adjustments.map(a => `
        <tr>
          <td class="td-mono">${a.id}</td>
          <td><strong>${a.product}</strong></td>
          <td><span class="badge ${a.type === 'Increase' ? 'badge-in' : 'badge-out'}">${a.type === 'Increase' ? '▲ Increase' : '▼ Decrease'}</span></td>
          <td>${a.qty}</td>
          <td class="td-muted">${a.reason}</td>
          <td class="td-muted">${a.date}</td>
          <td class="td-muted">${a.by || '—'}</td>
        </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;color:#aaa;padding:28px">No adjustments yet.</td></tr>`;
}

function saveAdjustment() {
  const prod   = document.getElementById('a-product').value;
  const type   = document.getElementById('a-type').value;
  const qty    = parseInt(document.getElementById('a-qty').value) || 1;
  const reason = document.getElementById('a-reason').value;
  const p      = products.find(x => x.name === prod);
  if (p) {
    if (type === 'Decrease' && p.stock < qty) { alert(`⚠️ Cannot decrease: only ${p.stock} ${p.unit} in stock.`); return; }
    p.stock += type === 'Increase' ? qty : -qty;
    moveHistory.unshift({ date: today(), ref: 'ADJ-' + String(adjustments.length + 1).padStart(3, '0'), product: prod, type: 'Adjustment', movement: type, qty: (type === 'Increase' ? '+' : '-') + qty, unit: p.unit, stockAfter: p.stock });
  }
  adjustments.unshift({ id: 'ADJ-' + String(adjustments.length + 1).padStart(3, '0'), product: prod, type, qty, reason, date: today(), by: currentUser ? currentUser.name : '—' });
  saveData();
  closeModal('adjustment');
  renderAll();
  alert(`✅ Stock ${type.toLowerCase()}d by ${qty} for ${prod}.`);
}

// ═══════════════════════════════════════════════════════
// MOVE HISTORY MODULE
// ═══════════════════════════════════════════════════════
function renderHistory(typeFilter = '', prodFilter = '') {
  const tf = typeFilter || document.getElementById('hist-type-filter').value;
  const pf = prodFilter || document.getElementById('hist-prod-filter').value;
  // Populate product filter dropdown
  const pSel     = document.getElementById('hist-prod-filter');
  const existing = Array.from(pSel.options).map(o => o.value);
  products.forEach(p => {
    if (!existing.includes(p.name)) {
      const o = document.createElement('option');
      o.value = p.name;
      o.textContent = p.name;
      pSel.appendChild(o);
    }
  });
  const rows = moveHistory.filter(h => (!tf || h.type === tf) && (!pf || h.product === pf));
  document.getElementById('history-table').innerHTML = rows.length
    ? rows.map(h => `
        <tr>
          <td class="td-muted">${h.date}</td>
          <td class="td-mono">${h.ref}</td>
          <td><strong>${h.product}</strong></td>
          <td><span style="background:#f1f5f9;color:#475569;border-radius:5px;padding:2px 8px;font-size:11px">${h.type}</span></td>
          <td class="td-muted" style="font-size:12px">${h.movement}</td>
          <td style="font-weight:700;color:${h.qty.toString().startsWith('-') ? '#ef4444' : '#22c55e'}">${h.qty} ${h.unit}</td>
          <td class="td-muted">${h.stockAfter}</td>
        </tr>`).join('')
    : `<tr><td colspan="7" style="text-align:center;color:#aaa;padding:28px">No history found.</td></tr>`;
}

// ═══════════════════════════════════════════════════════
// SETTINGS MODULE
// ═══════════════════════════════════════════════════════
function renderSettings() {
  document.getElementById('wh-list').innerHTML = warehouses.map((w, i) => `
    <div class="wh-card">
      <div>
        <div class="wh-name">🏭 ${w}</div>
        <div class="wh-loc">India</div>
      </div>
      ${i > 1
        ? `<button class="act-btn red" onclick="deleteWarehouse(${i})">Remove</button>`
        : '<span class="badge badge-done">Active</span>'}
    </div>`).join('');
}

function saveWarehouse() {
  const name = document.getElementById('wh-name').value.trim();
  if (!name) { alert('Warehouse name required.'); return; }
  warehouses.push(name);
  saveData();
  closeModal('warehouse');
  renderSettings();
  document.getElementById('wh-name').value = '';
  document.getElementById('wh-loc').value  = '';
}

function deleteWarehouse(idx) {
  if (!confirm('Remove this warehouse?')) return;
  warehouses.splice(idx, 1);
  saveData();
  renderSettings();
}

// ═══════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════
function openModal(type) {
  // Fill product dropdowns with current products
  ['r-product', 'd-product', 't-product', 'a-product'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.innerHTML = products.map(p => `<option value="${p.name}">${p.name} (${p.stock} ${p.unit})</option>`).join('');
    }
  });
  // Set today's date in date inputs
  ['r-date', 'd-date'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today();
  });
  document.getElementById('modal-' + type).classList.add('open');
}

function closeModal(type) {
  document.getElementById('modal-' + type).classList.remove('open');
}

// Close modal when clicking the dark overlay behind it
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ═══════════════════════════════════════════════════════
// GLOBAL SEARCH
// ═══════════════════════════════════════════════════════
function globalSearch(q) {
  const active = document.querySelector('.page-section.active');
  if (!active) return;
  const page = active.id.replace('section-', '');
  if (page === 'dashboard') renderActivity(q.toLowerCase());
  if (page === 'products')  renderProducts(q);
}

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════
function today() {
  return new Date().toISOString().split('T')[0];
}

function showErr(el, msg) {
  el.textContent = msg;
  el.style.display = 'block';
}

// ═══════════════════════════════════════════════════════
// BOOT — Auto-login if session exists
// ═══════════════════════════════════════════════════════
const session = getSession();
if (session) openDashboard(session);

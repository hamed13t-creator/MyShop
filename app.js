'use strict';
/* MyShop v2 - main app. Views are functions returning HTML; clicks are handled with data-act. */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = v => Math.round(v * 100) / 100;
const pick = a => a[Math.floor(Math.random() * a.length)];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'DZD', 'EGP', 'MAD', 'TND', 'CAD', 'TRY'];
const RATES0 = { USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67, DZD: 135, EGP: 49, MAD: 10, TND: 3.1, CAD: 1.37, TRY: 34 };
const ACCENTS = ['#14B8A6', '#7C3AED', '#EC4899', '#3B82F6', '#F97316', '#22C55E'];
const XPL = 100, MAX_PROFILES = 6, MAX_CUST = 12, RESTOCK_N = 5;
const PBASE = { generous: 50, regular: 30, picky: 20 }, PMULT = { generous: 8, regular: 5, picky: 3 };

const S = {
  lang: 'en', theme: 'dark', sound: true, pin: null, rates: Object.assign({}, RATES0),
  profiles: [], cur: null, products: [], customers: [], orders: [],
  cart: [], coupon: null, cpnErr: '', shopper: null, q: '', cat: 'all', day: null, gtab: 'missions',
  view: 'picker', back: 'picker', draft: null, idraft: null, cdraft: null, pay: null, cb: null, npct: 10, ncode: ''
};
let deferredInstall = null, PINCB = null, lastView = '';

const t = (k, v) => {
  let s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
};

/* ---------- icons (inline SVG, work offline) ---------- */
const ICONS = {
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', 'arrow-left': 'M19 12H5M12 19l-7-7 7-7', x: 'M18 6L6 18M6 6l12 12', check: 'M20 6L9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9 10c0-1.5 1.3-2 3-2s3 .6 3 2-1.3 1.8-3 2-3 .6-3 2 1.3 2 3 2 3-.5 3-2',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', shop: 'M3 9l2-5h14l2 5M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  volume: 'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07', mute: 'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.7-7.7 1.1-1.1a5.5 5.5 0 0 0 0-7.8z',
  cart: 'M6 6h15l-1.5 9h-12zM6 6L5 3H2M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  tag: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01',
  palette: 'M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1.5 3.3c.5.7.1 2.7-2.5 2.7zM6.5 12.5h.01M9.5 7.5h.01M14.5 7.5h.01M17.5 12.5h.01',
  trophy: 'M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3', 'chev-l': 'M15 18l-6-6 6-6', 'chev-r': 'M9 18l6-6-6-6',
  home: 'M3 12l9-9 9 9M5 10v10h14V10'
};
const ic = (n, s = 20) => '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>';
const back = (s = 20) => '<span class="flip">' + ic('arrow-left', s) + '</span>';

/* ---------- helpers ---------- */
async function hashPin(p) {
  try {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('myshop:' + p));
    return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    let h = 5381; for (const c of 'myshop:' + p) h = ((h << 5) + h + c.charCodeAt(0)) | 0; return 'x' + h;
  }
}
function applyLang() {
  document.documentElement.lang = S.lang;
  document.documentElement.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  document.title = t('appName');
}
function applyTheme(theme, accent) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--accent', accent || ACCENTS[0]);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = theme === 'dark' ? '#1B1F3B' : '#FFF6E5';
}
const curCode = () => (S.cur && S.cur.currency) || 'USD';
const rateOf = c => S.rates[c] || 1;
const rnd = (v, cur) => rateOf(cur || curCode()) >= 20 ? Math.round(v) : Math.round(v * 100) / 100;
const loc = (usd, cur) => rnd(usd * rateOf(cur || curCode()), cur);
function fmt(n, cur) {
  cur = cur || curCode();
  const l = S.lang === 'ar' ? 'ar-DZ' : 'en-US';
  try {
    return new Intl.NumberFormat(l, { style: 'currency', currency: cur, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  } catch (e) { return n + ' ' + cur; }
}
const money = (usd, cur) => fmt(loc(usd, cur), cur || curCode());
const hue = id => Array.from(String(id)).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const level = p => Math.floor(p.xp / XPL) + 1;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const dkey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return dkey(d); };
const dlabel = (k, o) => new Date(k + 'T12:00:00').toLocaleDateString(S.lang === 'ar' ? 'ar' : 'en', o || { weekday: 'short', month: 'short', day: 'numeric' });
const catEmoji = c => (CATS.find(x => x[0] === c) || CATS[CATS.length - 1])[1];
const unitLocal = x => loc(x.usd * (1 - (x.disc || 0) / 100));
const imgOrPh = (x, s) => x.img ? '<img src="' + x.img + '" alt="">' : '<div class="ph" style="--h:' + hue(x.id) + '">' + ic('box', s || 34) + '</div>';
const stars = n => '<span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';

/* toasts are queued so several messages in a row are all readable */
let toastBusy = false;
const toastQ = [];
function toast(msg) { toastQ.push(msg); if (!toastBusy) nextToast(); }
function nextToast() {
  const m = toastQ.shift();
  if (!m) { toastBusy = false; return; }
  toastBusy = true;
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = m;
  document.body.appendChild(d);
  setTimeout(() => { d.remove(); nextToast(); }, 1700);
}

function sheet(html) {
  let o = $('#ov');
  if (o) { $('.sheet', o).innerHTML = html; return; }
  o = document.createElement('div');
  o.className = 'ov'; o.id = 'ov';
  o.innerHTML = '<div class="sheet">' + html + '</div>';
  o.addEventListener('click', e => { if (e.target === o) closeSheet(); });
  document.body.appendChild(o);
}
function closeSheet() { const o = $('#ov'); if (o) o.remove(); }
function confirmBox(titleKey, yesKey, cb, extra, red) {
  S.cb = cb;
  sheet('<h2>' + t(titleKey) + '</h2>' + (extra ? '<p>' + extra + '</p>' : '') + '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('stay') + '</button><button class="btn ' + (red ? 'red' : '') + '" data-act="confirmYes">' + t(yesKey) + '</button></div>');
}
function askPin(cb) {
  PINCB = cb;
  sheet('<h2>' + t('enterPin') + '</h2><input id="pinin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="err" id="pinerr"></p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="pinok">' + t('ok') + '</button></div>');
  setTimeout(() => { const i = $('#pinin'); if (i) i.focus(); }, 60);
}

/* ---------- profile / game state helpers ---------- */
function normProfile(p) {
  if (p.cash == null) p.cash = p.coins != null ? p.coins : 20;
  delete p.coins;
  p.open = p.open !== false;
  p.owned = p.owned || []; p.eq = p.eq || {}; p.skin = p.skin || 'default';
  p.coupons = p.coupons || []; p.badges = p.badges || []; p.seq = p.seq || 0; p.xp = p.xp || 0;
  p.st = Object.assign({ rev: 0, sold: 0, orders: 0, delivered: 0, five: 0, math: 0, custs: 0, restock: 0, decor: 0, rsum: 0, rcount: 0 }, p.st || {});
  return p;
}
const saveP = () => DB.put('profiles', S.cur);

function addXp(n) {
  const p = S.cur, b = level(p);
  p.xp += n;
  if (level(p) > b) setTimeout(() => { sfx.up(); toast(t('levelUp') + ' ' + level(p)); }, 700);
}
function ensureMissions(p) {
  const d = dkey();
  if (!p.ms || p.ms.day !== d) {
    let h = 7;
    for (const ch of d + p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const a = MISSIONS.slice();
    for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); const x = a[i]; a[i] = a[j]; a[j] = x; }
    p.ms = { day: d, list: a.slice(0, 3).map(m => ({ id: m.id, prog: 0, claimed: false })) };
  }
  return p.ms;
}
function track(type, n) {
  const ms = ensureMissions(S.cur);
  ms.list.forEach(m => {
    const d = MISSIONS.find(x => x.id === m.id);
    if (d && d.type === type && !m.claimed && m.prog < d.goal) {
      m.prog = Math.min(d.goal, m.prog + n);
      if (m.prog >= d.goal) toast('🎯 ' + t('missionDone'));
    }
  });
}
function checkBadges() {
  const p = S.cur;
  for (const b of BADGES) {
    if (!p.badges.includes(b.id) && b.test(p)) {
      p.badges.push(b.id);
      setTimeout(() => sfx.star(), 400);
      toast(b.e + ' ' + t('newBadge', { n: t('b_' + b.id) }));
    }
  }
}
const avgUsd = () => S.products.length ? S.products.reduce((s, x) => s + x.usd, 0) / S.products.length : 5;
const walletTarget = c => round2(Math.max(PBASE[c.pers] || 30, (PMULT[c.pers] || 5) * avgUsd()));
async function refill() {
  const today = dkey();
  for (const c of S.customers) {
    if (c.day !== today) { c.wallet = walletTarget(c); c.day = today; await DB.put('customers', c); }
  }
}
async function seedCustomers(pid) {
  const names = NAMES[S.lang].slice().sort(() => Math.random() - 0.5), ms = MASCOTS.slice().sort(() => Math.random() - 0.5);
  const list = [['generous', 0], ['regular', 1]].map(([pers, i]) => ({ id: uid(), pid, name: names[i], mascot: ms[i], hat: i ? '' : '🎀', color: BGS[i + 1], pers, wallet: 0, day: '', orders: 0, spent: 0, created: Date.now() + i }));
  await DB.putMany('customers', list);
}
async function loadProfileData(id) {
  S.cur = S.profiles.find(p => p.id === id);
  S.products = (await DB.byPid('products', id)).sort((a, b) => a.created - b.created);
  S.customers = (await DB.byPid('customers', id)).sort((a, b) => a.created - b.created);
  S.orders = (await DB.byPid('orders', id)).sort((a, b) => a.ts - b.ts);
  if (!S.cur.seeded) {   // profiles made before customers existed (v1) get starter customers once
    if (!S.customers.length) { await seedCustomers(id); S.customers = (await DB.byPid('customers', id)).sort((a, b) => a.created - b.created); }
    S.cur.seeded = true; await saveP();
  }
  ensureMissions(S.cur);
  await refill();
}

/* ---------- views ---------- */
const head = (title, right, act) => '<header class="top"><button class="ibtn" data-act="' + (act || 'back') + '" aria-label="' + t('back') + '">' + back() + '</button><h2 style="margin:0;flex:1;text-align:center">' + title + '</h2>' + (right || '<span style="width:42px"></span>') + '</header>';

function installBlock() {
  if (isStandalone()) return '';
  if (deferredInstall) return '<button class="btn blue big" data-act="install">' + ic('download') + ' ' + t('install') + '</button>';
  if (isIOS()) return '<div class="hint">' + t('iosInstall') + '</div>';
  return '';
}

function setupView() {
  return '<header class="top"><div class="brand">' + ic('shop', 26) + ' ' + t('appName') + '</div><button class="ibtn" data-act="lang">' + ic('globe') + ' ' + (S.lang === 'en' ? 'العربية' : 'English') + '</button></header>' +
    '<div class="hero">' + mas('fox', 110) + '<h1>' + t('welcome') + '</h1><p class="muted">' + t('welcomeSub') + '</p></div>' +
    '<div class="card"><h2 style="margin-top:0">' + t('parentSetup') + '</h2><label>' + t('createPin') + '</label>' +
    '<input id="setpin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off">' +
    '<p class="muted small">' + t('pinHint') + '</p><p class="err" id="seterr"></p><button class="btn big" data-act="setupDone">' + t('next') + '</button></div>';
}

function pickerView() {
  const cards = S.profiles.map(p => '<button class="pcard" data-act="open" data-id="' + p.id + '">' + mas(p.mascot, 84) + '<b>' + esc(p.name) + '</b><small>' + esc(p.shopName) + '</small></button>').join('');
  return '<header class="top"><div class="brand">' + ic('shop', 26) + ' ' + t('appName') + '</div><div class="row">' +
    '<button class="ibtn" data-act="theme" aria-label="' + t('theme') + '">' + ic(S.theme === 'dark' ? 'sun' : 'moon') + '</button>' +
    '<button class="ibtn" data-act="lang">' + ic('globe') + ' ' + (S.lang === 'en' ? 'العربية' : 'English') + '</button>' +
    '<button class="ibtn" data-act="parent" aria-label="' + t('parent') + '">' + ic('lock') + '</button></div></header>' +
    '<h1>' + t('chooseProfile') + '</h1><div class="profiles">' + cards +
    '<button class="pcard add" data-act="newProfile">' + ic('plus', 34) + '<b>' + t('addProfile') + '</b></button></div>' + installBlock();
}

function pformView() {
  const d = S.draft;
  return head(d.id ? t('customize') : t('addProfile'), null, 'cancelForm') +
    '<div class="hero">' + mas(d.mascot, 96) + '</div>' +
    '<label>' + t('name') + '<input id="f_name" class="inp" maxlength="20" value="' + esc(d.name) + '"></label>' +
    '<label>' + t('shopName') + '<input id="f_shop" class="inp" maxlength="28" value="' + esc(d.shopName) + '"></label>' +
    '<label>' + t('chooseBuddy') + '</label><div class="mgrid">' + MASCOTS.map(k => '<button class="mc ' + (d.mascot === k ? 'sel' : '') + '" data-act="pickMascot" data-k="' + k + '">' + mas(k, 52) + '</button>').join('') + '</div>' +
    '<label>' + t('theme') + '</label><div class="seg"><button class="' + (d.theme === 'dark' ? 'sel' : '') + '" data-act="pickTheme" data-v="dark">' + ic('moon', 16) + ' ' + t('dark') + '</button><button class="' + (d.theme === 'cream' ? 'sel' : '') + '" data-act="pickTheme" data-v="cream">' + ic('sun', 16) + ' ' + t('cream') + '</button></div>' +
    '<label>' + t('color') + '</label><div class="sw">' + ACCENTS.map(c => '<button class="' + (d.accent === c ? 'sel' : '') + '" style="background:' + c + '" data-act="pickAccent" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<label>' + t('currency') + '<select id="f_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (d.currency === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label>' +
    '<button class="btn big" data-act="saveProfile">' + ic('check') + ' ' + t('save') + '</button>';
}

/* ----- the seller's shop ----- */
function priceTag(x) {
  const d = x.disc || 0;
  return (d ? '<s class="old">' + fmt(loc(x.usd)) + '</s>' : '') + '<span class="tag">' + fmt(unitLocal(x)) + '</span>';
}
function productCard(x) {
  const out = x.qty < 1, d = x.disc || 0;
  return '<button class="prod" data-act="prod" data-id="' + x.id + '"><div class="pimg">' + imgOrPh(x) +
    (d ? '<span class="off">-' + d + '%</span>' : '') +
    (out ? '<span class="so">' + t('soldOut') + '</span>' : '<span class="qty">×' + x.qty + '</span>') +
    '</div><div class="pname">' + catEmoji(x.cat) + ' ' + esc(x.name) + '</div><div class="prices">' + priceTag(x) + '</div></button>';
}

function sceneHtml(p) {
  const signEq = p.eq.sign, items = SLOTS.filter(s => s !== 'sign' && p.eq[s]).map(s => (DECOR.find(d => d.id === p.eq[s]) || {}).e).filter(Boolean);
  return '<div class="shopwrap" data-skin="' + p.skin + '"><div class="awning"></div><div class="scene"><h1 class="shoptitle ' + (signEq || '') + '">' + esc(p.shopName) + '</h1>' +
    '<div class="decor">' + (items.length ? items.map((e, i) => '<span class="dec d' + (i % 3) + '">' + e + '</span>').join('') : '<span class="muted small">' + t('decorHint') + '</span>') + '</div></div></div>';
}

function shopView() {
  const p = S.cur, pr = (p.xp % XPL) * (100 / XPL), open = p.open !== false;
  const rating = p.st.rcount ? (p.st.rsum / p.st.rcount).toFixed(1) : '–';
  const todo = S.orders.filter(o => o.status !== 'delivered').length;
  const tool = (act, icn, label, badge) => '<button class="tool" data-act="' + act + '">' + ic(icn, 24) + '<span>' + label + '</span>' + (badge ? '<i class="nb">' + badge + '</i>' : '') + '</button>';
  return '<header class="top"><button class="ibtn" data-act="home" aria-label="' + t('back') + '">' + back() + '</button>' +
    '<div class="me">' + mas(p.mascot, 34) + '<b>' + esc(p.name) + '</b></div>' +
    '<div class="row"><button class="ibtn" data-act="sound" aria-label="' + t('sound') + '">' + ic(S.sound ? 'volume' : 'mute') + '</button>' +
    '<button class="ibtn" data-act="customize" aria-label="' + t('customize') + '">' + ic('sliders') + '</button></div></header>' +
    '<div class="stats"><span class="pill lv">' + ic('star', 15) + ' ' + t('level', { n: level(p) }) + '</span>' +
    '<button class="pill gold" id="cash" data-act="orders" aria-label="' + t('dailySales') + '">' + ic('coin', 15) + ' ' + money(p.cash) + '</button>' +
    '<span class="pill">⭐ ' + rating + '</span>' +
    '<button class="opensign ' + (open ? 'open' : 'closed') + '" data-act="toggleOpen">' + (open ? t('open') : t('closed')) + '</button></div>' +
    '<div class="xp"><i style="width:' + pr + '%"></i></div>' + sceneHtml(p) +
    '<div class="tools">' + tool('custs', 'users', t('customers')) + tool('orders', 'truck', t('orders'), todo || '') + tool('goals', 'target', t('goals')) + tool('decor', 'palette', t('decor')) + tool('deals', 'tag', t('deals')) + '</div>' +
    (S.products.length ? '<div class="shelf">' + S.products.map(productCard).join('') + '</div>' : '<div class="empty">' + ic('box', 48) + '<p>' + t('emptyShop') + '</p></div>') +
    '<div class="dock"><button class="btn ghost" data-act="custs">' + ic('users') + ' ' + t('customers') + '</button><button class="btn" data-act="addItem">' + ic('plus') + ' ' + t('addItem') + '</button></div>';
}

function itemView() {
  const d = S.idraft, cur = d.cur || S.cur.currency, edit = !!d.id;
  return head(edit ? t('editItem') : t('addItem'), null, 'cancelItem') +
    '<div class="photo">' + (d.img ? '<img src="' + d.img + '" alt="">' : ic('camera', 44)) + '</div>' +
    '<div class="row two"><label class="btn" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fcam" accept="image/*" capture="environment" hidden>' + ic('camera') + ' ' + t('takePhoto') + '</label>' +
    '<label class="btn blue" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fup" accept="image/*" hidden>' + ic('upload') + ' ' + t('upload') + '</label></div>' +
    '<label>' + t('itemName') + '<input id="i_name" class="inp" maxlength="40" value="' + esc(d.name) + '"></label>' +
    '<div class="row two"><label>' + t('price') + '<input id="i_price" class="inp" inputmode="decimal" value="' + esc(d.price == null ? '' : d.price) + '"></label>' +
    '<label>' + t('currency') + '<select id="i_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (cur === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label></div>' +
    '<label>' + t('category') + '</label><div class="chips wrap">' + CATS.map(c => '<button class="chip ' + (d.cat === c[0] ? 'sel' : '') + '" data-act="pickCat" data-v="' + c[0] + '">' + c[1] + ' ' + t('cat_' + c[0]) + '</button>').join('') + '</div>' +
    '<label>' + t('discount') + '</label><div class="seg wrap">' + DISCS.map(n => '<button class="' + (d.disc === n ? 'sel' : '') + '" data-act="pickDisc" data-v="' + n + '">' + (n ? '-' + n + '%' : t('none')) + '</button>').join('') + '</div>' +
    (edit ? '<p class="muted small">' + t('inStock', { n: d.qty }) + ' · ' + t('restockHint') + '</p>' :
      '<label>' + t('quantity') + '<input id="i_qty" class="inp" type="number" inputmode="numeric" min="1" max="99" value="' + esc(d.qty) + '"></label>') +
    '<button class="btn big" data-act="saveItem">' + ic('check') + ' ' + t('save') + '</button>';
}

/* ----- customers ----- */
function custsView() {
  const cards = S.customers.map(c => '<div class="ccard"><button class="pcard" data-act="shopAs" data-id="' + c.id + '">' + avatar(c.mascot, 72, c.hat, c.color) + '<b>' + esc(c.name) + '</b><span class="pill gold">' + ic('coin', 14) + ' ' + money(c.wallet) + '</span><small>' + t('pers_' + c.pers) + '</small></button>' +
    '<button class="ibtn ed" data-act="editCust" data-id="' + c.id + '" aria-label="' + t('edit') + '">' + ic('edit', 16) + '</button></div>').join('');
  return head(t('customers'), null, 'toShop') + '<p class="muted small" style="margin-top:0">' + t('custHint') + '</p><div class="cgrid">' + cards +
    '<button class="pcard add" data-act="newCust">' + ic('plus', 34) + '<b>' + t('newCustomer') + '</b></button></div>';
}
function cformView() {
  const d = S.cdraft;
  return head(d.id ? t('editCustomer') : t('newCustomer'), null, 'cancelCust') +
    '<div class="hero">' + avatar(d.mascot, 100, d.hat, d.color) + '</div>' +
    '<label>' + t('name') + '<input id="c_name" class="inp" maxlength="16" value="' + esc(d.name) + '"></label>' +
    '<label>' + t('chooseBuddy') + '</label><div class="mgrid">' + MASCOTS.map(k => '<button class="mc ' + (d.mascot === k ? 'sel' : '') + '" data-act="pickCm" data-k="' + k + '">' + mas(k, 52) + '</button>').join('') + '</div>' +
    '<label>' + t('hat') + '</label><div class="hats">' + HATS.map(h => '<button class="' + (d.hat === h ? 'sel' : '') + '" data-act="pickHat" data-v="' + h + '">' + (h || '∅') + '</button>').join('') + '</div>' +
    '<label>' + t('bgcolor') + '</label><div class="sw">' + BGS.map(c => '<button class="' + (d.color === c ? 'sel' : '') + '" style="background:' + c + '" data-act="pickBg" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<label>' + t('personality') + '</label><div class="seg">' + PERS.map(x => '<button class="' + (d.pers === x ? 'sel' : '') + '" data-act="pickPers" data-v="' + x + '">' + t('pers_' + x) + '</button>').join('') + '</div>' +
    '<p class="muted small">' + t('persd_' + d.pers) + '</p>' +
    '<button class="btn big" data-act="saveCust">' + ic('check') + ' ' + t('save') + '</button>' +
    (d.id ? '<button class="btn red big" data-act="delCust">' + ic('trash') + ' ' + t('delete') + '</button>' : '');
}

/* ----- the customer's storefront ----- */
function storeGrid() {
  const q = S.q.trim().toLowerCase();
  const list = S.products.filter(x => (S.cat === 'all' || (S.cat === 'fav' ? x.fav : x.cat === S.cat)) && (!q || x.name.toLowerCase().includes(q)));
  if (!list.length) return '<div class="empty" style="grid-column:1/-1">' + ic('search', 40) + '<p>' + t('noResults') + '</p></div>';
  return list.map(x => {
    const out = x.qty < 1, inCart = (S.cart.find(l => l.id === x.id) || {}).qty || 0, d = x.disc || 0;
    return '<div class="prod ' + (out ? 'out' : '') + '"><div class="pimg" data-act="pview" data-id="' + x.id + '">' + imgOrPh(x) +
      (d ? '<span class="off">-' + d + '%</span>' : '') +
      '<button class="heart ' + (x.fav ? 'on' : '') + '" data-act="fav" data-id="' + x.id + '" aria-label="' + t('favorites') + '">' + ic('heart', 16) + '</button>' +
      (out ? '<span class="so">' + t('soldOut') + '</span>' : '') + '</div>' +
      '<div class="pname">' + esc(x.name) + '</div><div class="prices">' + priceTag(x) + '</div>' +
      '<button class="btn sm" data-act="addCart" data-id="' + x.id + '"' + (out ? ' disabled' : '') + '>' + ic('cart', 16) + ' ' + (inCart ? t('inCart', { n: inCart }) : t('addCart')) + '</button></div>';
  }).join('');
}
const cartBadge = n => '<i class="nb" id="nb" style="display:' + (n ? 'flex' : 'none') + '">' + n + '</i>';
function cartBar() {
  const T = cartTotals();
  return '<div class="dock" id="cartbar"><button class="btn" data-act="cart">' + ic('cart') + ' ' + t('viewCart') + ' (' + T.count + ') · ' + fmt(T.total) + '</button></div>';
}
function storeView() {
  const c = S.shopper, p = S.cur, T = cartTotals();
  return '<header class="top"><button class="ibtn" data-act="back" aria-label="' + t('back') + '">' + back() + '</button>' +
    '<div class="me">' + avatar(c.mascot, 36, c.hat, c.color) + '<b>' + esc(c.name) + '</b></div>' +
    '<div class="row"><span class="pill gold" id="wallet">' + ic('coin', 15) + ' ' + money(c.wallet) + '</span><button class="ibtn" id="cbtn" data-act="cart" aria-label="' + t('yourCart') + '">' + ic('cart') + cartBadge(T.count) + '</button></div></header>' +
    '<h1 class="shoptitle" style="margin-top:0">' + esc(p.shopName) + '</h1>' +
    '<div class="search">' + ic('search', 18) + '<input id="q" class="inp" placeholder="' + t('search') + '" value="' + esc(S.q) + '"></div>' +
    '<div class="chips"><button class="chip ' + (S.cat === 'all' ? 'sel' : '') + '" data-act="setCat" data-v="all">' + t('all') + '</button><button class="chip ' + (S.cat === 'fav' ? 'sel' : '') + '" data-act="setCat" data-v="fav">♥ ' + t('favorites') + '</button>' +
    CATS.map(x => '<button class="chip ' + (S.cat === x[0] ? 'sel' : '') + '" data-act="setCat" data-v="' + x[0] + '">' + x[1] + ' ' + t('cat_' + x[0]) + '</button>').join('') + '</div>' +
    '<div class="shelf" id="grid">' + storeGrid() + '</div>' + cartBar();
}
function updateStore() {
  const g = $('#grid'), cb = $('#cartbar'), nb = $('#nb'), T = cartTotals();
  if (g) g.innerHTML = storeGrid();
  if (cb) cb.outerHTML = cartBar();
  if (nb) { nb.textContent = T.count; nb.style.display = T.count ? 'flex' : 'none'; }
}

/* cart maths (everything is calculated in the shop currency, as the kid sees it) */
function cartLines() {
  return S.cart.map(l => { const x = S.products.find(p => p.id === l.id); return x ? { x, qty: l.qty, unit: unitLocal(x) } : null; }).filter(Boolean);
}
function cartTotals() {
  const ls = cartLines(), cur = curCode();
  const sub = rnd(ls.reduce((s, l) => s + l.unit * l.qty, 0), cur), pct = S.coupon ? S.coupon.pct : 0;
  const disc = rnd(sub * pct / 100, cur);
  return { ls, sub, disc, pct, total: rnd(sub - disc, cur), count: ls.reduce((s, l) => s + l.qty, 0) };
}
function cartHtml() {
  const T = cartTotals(), c = S.shopper;
  if (!T.ls.length) return '<h2>' + t('yourCart') + '</h2><div class="empty">' + ic('cart', 44) + '<p>' + t('cartEmpty') + '</p></div><button class="btn big" data-act="closeSheet">' + t('keepShopping') + '</button>';
  const short = T.total > loc(c.wallet);
  return '<h2>' + t('yourCart') + '</h2>' + T.ls.map(l => '<div class="line"><div class="thumb">' + imgOrPh(l.x, 20) + '</div><div class="lt"><b>' + esc(l.x.name) + '</b><span class="muted small">' + fmt(l.unit) + '</span></div>' +
    '<div class="stp"><button class="ibtn" data-act="qtyMinus" data-id="' + l.x.id + '" aria-label="-">' + ic('minus', 16) + '</button><b>' + l.qty + '</b><button class="ibtn" data-act="qtyPlus" data-id="' + l.x.id + '" aria-label="+">' + ic('plus', 16) + '</button></div>' +
    '<b class="lp">' + fmt(rnd(l.unit * l.qty)) + '</b></div>').join('') +
    '<div class="row" style="margin-top:12px"><input id="cpn" class="inp" style="flex:1" placeholder="' + t('coupon') + '" value="' + (S.coupon ? esc(S.coupon.code) : '') + '"><button class="btn ghost" style="flex:none" data-act="applyCoupon">' + t('apply') + '</button></div>' +
    (S.cpnErr ? '<p class="err" style="margin:4px 0">' + S.cpnErr + '</p>' : '') +
    '<div class="tot"><span>' + t('subtotal') + '</span><b>' + fmt(T.sub) + '</b></div>' +
    (T.disc ? '<div class="tot"><span>' + t('coupon') + ' (-' + T.pct + '%)</span><b>-' + fmt(T.disc) + '</b></div>' : '') +
    '<div class="tot big"><span>' + t('total') + '</span><b>' + fmt(T.total) + '</b></div>' +
    '<div class="tot muted small"><span>' + t('wallet') + '</span><b>' + money(c.wallet) + '</b></div>' +
    (short ? '<p class="err">' + t('noFunds') + '</p>' : '') +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('keepShopping') + '</button><button class="btn" data-act="checkout">' + ic('check') + ' ' + t('checkout') + '</button></div>';
}
function niceUp(v) {
  for (let e = 1; e <= 1e8; e *= 10) for (const m of [e, 2 * e, 5 * e]) if (m > v) return m;
  return Math.ceil(v) + 1;
}
function payHtml() {
  const P = S.pay, c = S.shopper, change = rnd(P.bill - P.total);
  return '<h2>' + t('checkout') + '</h2><p class="center muted">' + t('customerPays', { n: esc(c.name) }) + '</p>' +
    '<div class="note">' + fmt(P.bill) + '</div>' +
    '<div class="tot"><span>' + t('total') + '</span><b>' + fmt(P.total) + '</b></div>' +
    '<p class="center" style="font-size:18px">' + t('giveChange') + '</p>' +
    (P.reveal ? '<div class="note ok">' + fmt(change) + '</div><button class="btn big" data-act="payDone" data-m="0">' + t('next') + '</button>' :
      '<input id="chg" class="inp pin" style="letter-spacing:2px" inputmode="decimal" placeholder="?" autocomplete="off"><p class="err" id="chgerr">' + (P.err || '') + '</p>' +
      '<div class="row"><button class="btn ghost" data-act="payDone" data-m="0">' + t('skip') + '</button><button class="btn" data-act="payCheck">' + ic('check') + ' ' + t('check') + '</button></div>');
}
function doneHtml(o, math) {
  return '<div class="center sold"><div class="okwrap"><div class="okbig">' + ic('check', 46) + '</div>' + [-60, -20, 20, 60].map((x, i) => '<span class="coin" style="--dx:' + x + 'px;--d:' + (0.3 + i * 0.1) + 's"></span>').join('') + '</div>' +
    '<h2>' + t('orderPlaced') + '</h2><p class="muted">#' + o.n + ' · ' + fmt(o.total, o.cur) + (math ? ' · +5 XP 🧮' : '') + '</p>' +
    '<p>' + t('thanks', { n: esc(o.cname) }) + '</p><p class="muted small">' + t('thanksSub') + '</p>' +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('keepShopping') + '</button><button class="btn" data-act="toShop">' + ic('shop') + ' ' + t('myShop') + '</button></div></div>';
}

/* ----- orders and daily sales ----- */
function orderRow(o) {
  return '<button class="orow" data-act="order" data-id="' + o.id + '"><span class="muted">#' + o.n + '</span>' + avatar(o.cmas, 34, o.chat, o.ccol) + '<b class="gr">' + esc(o.cname) + '</b><span class="st ' + o.status + '">' + t('st_' + o.status) + '</span><b>' + fmt(o.total, o.cur) + '</b></button>';
}
function ordersView() {
  const today = dkey(), day = S.day || today;
  const dayOrders = S.orders.filter(o => o.day === day);
  const rev = dayOrders.reduce((s, o) => s + o.usd, 0), items = dayOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(day, i - 6));
  const sums = days.map(k => S.orders.filter(o => o.day === k).reduce((s, o) => s + o.usd, 0)), mx = Math.max(...sums, 0.0001);
  const todo = S.orders.filter(o => o.status !== 'delivered').sort((a, b) => a.ts - b.ts);
  const done = dayOrders.filter(o => o.status === 'delivered').sort((a, b) => b.ts - a.ts);
  return head(t('dailySales'), null, 'toShop') +
    '<div class="datenav"><button class="ibtn" data-act="dayPrev" aria-label="' + t('prev') + '"><span class="flip">' + ic('chev-l') + '</span></button><b>' + (day === today ? t('today') + ' · ' : '') + dlabel(day) + '</b><button class="ibtn" data-act="dayNext" aria-label="' + t('next') + '" ' + (day >= today ? 'style="opacity:.35"' : '') + '><span class="flip">' + ic('chev-r') + '</span></button></div>' +
    '<div class="metrics"><div class="metric"><b>' + money(rev) + '</b><span>' + t('revenue') + '</span></div><div class="metric"><b>' + dayOrders.length + '</b><span>' + t('orders') + '</span></div><div class="metric"><b>' + items + '</b><span>' + t('itemsSold') + '</span></div></div>' +
    '<div class="bars">' + days.map((k, i) => '<button class="bar ' + (k === day ? 'sel' : '') + '" data-act="pickDay" data-v="' + k + '"><i style="height:' + Math.max(3, Math.round(sums[i] / mx * 70)) + 'px"></i><span>' + dlabel(k, { weekday: 'narrow' }) + '</span></button>').join('') + '</div>' +
    '<h2>' + t('toProcess') + ' (' + todo.length + ')</h2>' + (todo.length ? todo.map(orderRow).join('') : '<p class="muted small">' + t('allDone') + '</p>') +
    '<h2>' + t('delivered') + '</h2>' + (done.length ? done.map(orderRow).join('') : '<p class="muted small">' + t('noOrders') + '</p>');
}
function orderHtml(o) {
  const idx = ST.indexOf(o.status), rv = o.review;
  return '<div class="oh"><h2 style="margin:0">' + t('order') + ' #' + o.n + '</h2><span class="st ' + o.status + '">' + t('st_' + o.status) + '</span></div>' +
    '<div class="who">' + avatar(o.cmas, 40, o.chat, o.ccol) + '<b>' + esc(o.cname) + '</b></div>' +
    '<div class="tl">' + ST.map((s, i) => '<div class="step ' + (i <= idx ? 'on' : '') + '"><span class="dot">' + ic(ST_ICON[s], 18) + '</span><small>' + t('st_' + s) + '</small></div>').join('') + '</div>' +
    o.items.map(i => '<div class="tot"><span>' + esc(i.name) + ' ×' + i.qty + '</span><b>' + fmt(rnd(i.unit * i.qty, o.cur), o.cur) + '</b></div>').join('') +
    (o.disc ? '<div class="tot"><span>' + esc(o.code) + ' (-' + o.pct + '%)</span><b>-' + fmt(o.disc, o.cur) + '</b></div>' : '') +
    '<div class="tot big"><span>' + t('total') + '</span><b>' + fmt(o.total, o.cur) + '</b></div>' +
    (rv ? '<div class="review">' + stars(rv.stars) + '<p>“' + t('rv' + rv.stars + '_' + rv.k) + '”</p>' + (o.tip ? '<p class="tag">+' + money(o.tip) + ' ' + t('tip') + '</p>' : '') + '</div>' : '') +
    (o.status !== 'delivered' ? '<button class="btn big" data-act="advance" data-id="' + o.id + '">' + ic(ST_ICON[ST[idx + 1]]) + ' ' + t('adv_' + o.status) + '</button>' : '') +
    '<button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ----- goals: missions, badges, ranks ----- */
function goalsView() {
  const p = S.cur, tab = S.gtab;
  let body = '';
  if (tab === 'missions') {
    body = '<p class="muted small">' + t('missionsHint') + '</p>' + ensureMissions(p).list.map(m => {
      const d = MISSIONS.find(x => x.id === m.id), ok = m.prog >= d.goal;
      return '<div class="mis"><div class="row" style="margin:0"><b style="flex:1">' + t('m_' + d.id, { n: d.goal }) + '</b><span class="pill gold">' + ic('coin', 14) + ' ' + money(d.r) + '</span></div>' +
        '<div class="xp" style="margin:8px 0"><i style="width:' + Math.round(m.prog / d.goal * 100) + '%"></i></div>' +
        '<div class="row" style="margin:0"><span class="muted small" style="flex:1">' + m.prog + ' / ' + d.goal + '</span>' +
        (m.claimed ? '<span class="st delivered">' + t('claimed') + ' ✓</span>' : '<button class="btn sm" style="width:auto;margin:0" data-act="claim" data-id="' + m.id + '"' + (ok ? '' : ' disabled') + '>' + t('claim') + '</button>') + '</div></div>';
    }).join('');
  } else if (tab === 'badges') {
    body = '<div class="bgrid">' + BADGES.map(b => { const on = p.badges.includes(b.id); return '<div class="badge-t ' + (on ? '' : 'lock') + '"><i>' + b.e + '</i><b>' + t('b_' + b.id) + '</b><small class="muted">' + t('bd_' + b.id) + '</small></div>'; }).join('') + '</div>';
  } else {
    const rows = S.profiles.slice().sort((a, b) => b.st.rev - a.st.rev);
    body = rows.map((x, i) => '<div class="prow"><b style="flex:none;width:26px">' + (['🥇', '🥈', '🥉'][i] || (i + 1)) + '</b>' + mas(x.mascot, 40) + '<div class="gr"><b>' + esc(x.name) + '</b><div class="muted small">' + t('level', { n: level(x) }) + ' · ' + t('sold') + ': ' + x.st.sold + '</div></div><span class="pill gold">' + money(x.st.rev) + '</span></div>').join('');
  }
  return head(t('goals'), null, 'toShop') + '<div class="seg">' + ['missions', 'badges', 'ranks'].map(k => '<button class="' + (tab === k ? 'sel' : '') + '" data-act="gtab" data-v="' + k + '">' + t('tab_' + k) + '</button>').join('') + '</div><div style="margin-top:10px">' + body + '</div>';
}

/* ----- decoration shop and deals ----- */
function decorHtml() {
  const p = S.cur;
  const skins = SKINS.map(([k, lv]) => { const ok = level(p) >= lv; return '<button class="chip ' + (p.skin === k ? 'sel' : '') + '" data-act="skin" data-v="' + k + '">' + (ok ? '' : '🔒 ') + t('skin_' + k) + (ok ? '' : ' · ' + t('level', { n: lv })) + '</button>'; }).join('');
  const sec = SLOTS.map(s => '<h3 class="sech">' + t('slot_' + s) + '</h3><div class="dgrid">' + DECOR.filter(d => d.slot === s).map(d => {
    const own = p.owned.includes(d.id), eq = p.eq[s] === d.id;
    return '<div class="dcard ' + (eq ? 'eq' : '') + '"><i>' + d.e + '</i><b>' + t('d_' + d.id) + '</b>' + (own ? '<button class="btn sm ' + (eq ? 'ghost' : '') + '" data-act="equip" data-id="' + d.id + '">' + (eq ? t('unequip') : t('equip')) + '</button>' : '<button class="btn sm blue" data-act="buyDecor" data-id="' + d.id + '">' + money(d.p) + '</button>') + '</div>';
  }).join('') + '</div>').join('');
  return '<div class="oh"><h2 style="margin:0">' + t('decor') + '</h2><span class="pill gold">' + ic('coin', 14) + ' ' + money(p.cash) + '</span></div>' +
    '<h3 class="sech">' + t('shopTheme') + '</h3><div class="chips wrap">' + skins + '</div>' + sec + '<button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}
function dealsHtml() {
  const p = S.cur;
  return '<h2>' + t('deals') + '</h2><p class="muted small">' + t('dealsHint') + '</p>' +
    (p.coupons.length ? p.coupons.map(c => '<div class="prow"><b class="gr">' + esc(c.code) + '</b><span class="pill gold">-' + c.pct + '%</span><button class="ibtn red" data-act="delCoupon" data-code="' + esc(c.code) + '" aria-label="' + t('delete') + '">' + ic('trash') + '</button></div>').join('') : '<p class="muted small">' + t('noCoupons') + '</p>') +
    '<label>' + t('couponCode') + '<input id="ncode" class="inp" maxlength="12" autocapitalize="characters" style="text-transform:uppercase" value="' + esc(S.ncode) + '"></label>' +
    '<div class="seg wrap">' + [5, 10, 15, 20, 30, 50].map(n => '<button class="' + (S.npct === n ? 'sel' : '') + '" data-act="npct" data-v="' + n + '">-' + n + '%</button>').join('') + '</div>' +
    '<button class="btn big" data-act="addCoupon">' + ic('plus') + ' ' + t('add') + '</button><button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ----- parent panel ----- */
function parentView() {
  const rows = S.profiles.map(p => '<div class="prow">' + mas(p.mascot, 40) + '<div class="gr"><b>' + esc(p.name) + '</b><div class="muted small">' + t('level', { n: level(p) }) + ' · ' + t('sold') + ': ' + p.st.sold + ' · ' + t('revenue') + ': ' + fmt(loc(p.st.rev, p.currency), p.currency) + (p.st.rcount ? ' · ⭐ ' + (p.st.rsum / p.st.rcount).toFixed(1) : '') + '</div></div>' +
    '<button class="ibtn red" data-act="delProfile" data-id="' + p.id + '" aria-label="' + t('delete') + '">' + ic('trash') + '</button></div>').join('');
  return head(t('parent'), null, 'parentDone') +
    '<h2>' + t('profiles') + '</h2>' + rows + '<button class="btn big" data-act="newProfile">' + ic('plus') + ' ' + t('addProfile') + '</button>' +
    '<h2>' + t('rates') + '</h2><div class="rates">' + CURRENCIES.filter(c => c !== 'USD').map(c => '<label>' + c + '<input class="inp" data-rate="' + c + '" inputmode="decimal" value="' + S.rates[c] + '"></label>').join('') + '</div>' +
    '<h2>' + t('backup') + '</h2><p class="muted small">' + t('backupHint') + '</p>' +
    '<div class="row two"><button class="btn blue" data-act="exportData">' + ic('download') + ' ' + t('export') + '</button><label class="btn ghost" style="margin:0"><input type="file" id="fimp" accept="application/json,.json" hidden>' + ic('upload') + ' ' + t('import') + '</label></div>' +
    '<button class="btn ghost big" data-act="changePin">' + ic('lock') + ' ' + t('changePin') + '</button>' + installBlock() +
    '<button class="btn big" data-act="parentDone">' + ic('check') + ' ' + t('done') + '</button>';
}

const VIEWS = { setup: setupView, picker: pickerView, pform: pformView, shop: shopView, item: itemView, custs: custsView, cform: cformView, store: storeView, orders: ordersView, goals: goalsView, parent: parentView };

function render() {
  const y = window.scrollY;
  $('#app').innerHTML = VIEWS[S.view]();
  window.scrollTo(0, S.view === lastView ? y : 0);
  lastView = S.view;
}
const setView = v => { S.view = v; render(); };

/* ---------- drafts ---------- */
const newDraft = () => ({ id: null, name: '', shopName: '', mascot: 'fox', theme: S.theme, accent: ACCENTS[0], currency: 'USD' });
function syncDraft() {
  const n = $('#f_name');
  if (n) { S.draft.name = n.value; S.draft.shopName = $('#f_shop').value; S.draft.currency = $('#f_cur').value; }
}
function syncItem() {
  const n = $('#i_name');
  if (n) {
    S.idraft.name = n.value; S.idraft.price = $('#i_price').value; S.idraft.cur = $('#i_cur').value;
    const q = $('#i_qty'); if (q) S.idraft.qty = q.value;
  }
}
function syncCust() { const n = $('#c_name'); if (n) S.cdraft.name = n.value; }
function shrink(file, max) {
  max = max || 640;
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas');
      c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      res(c.toDataURL('image/jpeg', 0.8));
    };
    im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
    im.src = u;
  });
}

async function openProfile(id) {
  await loadProfileData(id);
  applyTheme(S.cur.theme, S.cur.accent);
  S.cart = []; S.coupon = null;
  setView('shop');
}

/* ---------- orders: create, deliver ---------- */
async function finishOrder(math) {
  const p = S.cur, c = S.shopper, T = cartTotals(), cur = curCode(), r = rateOf(cur);
  if (!T.count) return;
  const usd = round2(T.total / r);
  p.seq = (p.seq || 0) + 1;
  const o = {
    id: uid(), pid: p.id, n: p.seq, cid: c.id, cname: c.name, cmas: c.mascot, chat: c.hat, ccol: c.color, pers: c.pers,
    items: T.ls.map(l => ({ id: l.x.id, name: l.x.name, qty: l.qty, unit: l.unit })),
    sub: T.sub, disc: T.disc, pct: T.pct, code: S.coupon ? S.coupon.code : '', total: T.total, cur, usd,
    status: 'ordered', day: dkey(), ts: Date.now(), review: null, tip: 0
  };
  for (const l of T.ls) { l.x.qty -= l.qty; await DB.put('products', l.x); }
  c.wallet = Math.max(0, round2(c.wallet - usd)); c.orders = (c.orders || 0) + 1; c.spent = round2((c.spent || 0) + usd);
  await DB.put('customers', c);
  p.cash = round2(p.cash + usd);              // the real value of the purchase goes into the cash
  p.st.rev = round2(p.st.rev + usd); p.st.sold += T.count; p.st.orders++;
  addXp(10 + (math ? 5 : 0));
  if (math) { p.st.math++; track('math', 1); }
  track('items', T.count); track('order', 1); if (T.count >= 3) track('big', 1);
  S.orders.push(o); await DB.put('orders', o);
  checkBadges(); await saveP();
  S.cart = []; S.coupon = null; S.cpnErr = '';
  sfx.cha();
  sheet(doneHtml(o, math));
  render();
}
function starsFor(pers) {
  const r = Math.random();
  if (pers === 'generous') return r < 0.85 ? 5 : 4;
  if (pers === 'picky') return r < 0.3 ? 3 : r < 0.7 ? 4 : 5;
  return r < 0.5 ? 5 : 4;
}
async function deliver(o) {
  const p = S.cur, st = starsFor(o.pers);
  o.review = { stars: st, k: Math.floor(Math.random() * 2) };
  o.tip = (o.pers === 'generous' && st === 5) ? round2(o.usd * 0.1) : 0;
  p.cash = round2(p.cash + o.tip);
  p.st.delivered++; p.st.rsum += st; p.st.rcount++;
  if (st === 5) { p.st.five++; track('five', 1); }
  track('deliver', 1);
  addXp(5 + st);
  checkBadges();
  await saveP();
  sfx.bell();
  toast('⭐ ' + st + '/5' + (o.tip ? ' · +' + money(o.tip) : ''));
}

/* ---------- navigation: the phone's back button ---------- */
function exitApp() {
  S.exiting = true;
  history.go(-2);
  setTimeout(() => { try { window.close(); } catch (e) { /* ignore */ } S.exiting = false; }, 400);
}
function handleBack() {
  if ($('#ov')) { closeSheet(); return; }           // 1. close an open sheet first
  const v = S.view;
  if (v === 'shop') { confirmBox('leaveShopQ', 'leave', () => ACT.home()); return; }
  if (v === 'picker' || v === 'setup') { confirmBox('exitQ', 'exit', exitApp); return; }
  if (v === 'store') { ACT.leaveStore(); return; }
  const m = { item: 'cancelItem', pform: 'cancelForm', cform: 'cancelCust', custs: 'toShop', orders: 'toShop', goals: 'toShop', parent: 'parentDone' }[v];
  if (m) ACT[m]();
}
window.addEventListener('popstate', () => {
  if (S.exiting) return;
  history.pushState({ g: 1 }, '');                  // keep one guard entry so back never leaves by accident
  handleBack();
});

/* ---------- actions ---------- */
const ACT = {
  closeSheet,
  back() { handleBack(); },
  confirmYes() { const cb = S.cb; S.cb = null; closeSheet(); if (cb) cb(); },
  async install() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); },
  async lang() { S.lang = S.lang === 'en' ? 'ar' : 'en'; await setMeta('lang', S.lang); applyLang(); render(); },
  async theme() { S.theme = S.theme === 'dark' ? 'cream' : 'dark'; await setMeta('theme', S.theme); applyTheme(S.theme, ACCENTS[0]); render(); },
  async sound() { S.sound = !S.sound; SFX.on = S.sound; await setMeta('sound', S.sound); if (S.sound) sfx.coin(); render(); },

  async setupDone() {
    const v = $('#setpin').value;
    if (!/^\d{4}$/.test(v)) { $('#seterr').textContent = t('pinFour'); return; }
    S.pin = await hashPin(v); await setMeta('pin', S.pin);
    S.draft = newDraft(); S.back = 'picker'; setView('pform');
  },
  async pinok() {
    const i = $('#pinin'); if (!i) return;
    if ((await hashPin(i.value)) === S.pin) { closeSheet(); const cb = PINCB; PINCB = null; if (cb) cb(); }
    else { $('#pinerr').textContent = t('wrongPin'); sfx.err(); i.value = ''; i.focus(); }
  },
  parent() { askPin(() => setView('parent')); },
  newProfile() {
    if (S.profiles.length >= MAX_PROFILES) { toast(t('maxProfiles')); return; }
    const go = () => { S.draft = newDraft(); S.back = S.view === 'parent' ? 'parent' : 'picker'; setView('pform'); };
    if (S.view === 'parent') go(); else askPin(go);
  },
  async parentDone() {
    document.querySelectorAll('[data-rate]').forEach(i => {
      const v = parseFloat(String(i.value).replace(',', '.'));
      if (v > 0) S.rates[i.dataset.rate] = v;
    });
    await setMeta('rates', S.rates);
    setView('picker');
  },
  changePin() {
    sheet('<h2>' + t('newPin') + '</h2><input id="npin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="err" id="nerr"></p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="changePinOk">' + t('save') + '</button></div>');
  },
  async changePinOk() {
    const v = $('#npin').value;
    if (!/^\d{4}$/.test(v)) { $('#nerr').textContent = t('pinFour'); return; }
    S.pin = await hashPin(v); await setMeta('pin', S.pin); closeSheet(); toast(t('saved'));
  },
  delProfile(d) {
    const p = S.profiles.find(x => x.id === d.id);
    confirmBox('confirmDelete', 'yes', async () => {
      for (const x of await DB.byPid('products', d.id)) await DB.del('products', x.id);
      for (const x of await DB.byPid('customers', d.id)) await DB.del('customers', x.id);
      for (const x of await DB.byPid('orders', d.id)) await DB.del('orders', x.id);
      await DB.del('profiles', d.id);
      S.profiles = S.profiles.filter(q => q.id !== d.id); render();
    }, esc(p.name), true);
  },
  async exportData() {
    const data = { app: 'myshop', v: 2, ts: Date.now(), meta: { lang: S.lang, theme: S.theme, pin: S.pin, rates: S.rates, sound: S.sound },
      profiles: await DB.all('profiles'), products: await DB.all('products'), customers: await DB.all('customers'), orders: await DB.all('orders') };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), name = 'myshop-backup-' + dkey() + '.json';
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast(t('saved'));
  },

  open(d) { openProfile(d.id); },
  home() { S.cur = null; S.cart = []; applyTheme(S.theme, ACCENTS[0]); setView('picker'); },
  toShop() { closeSheet(); S.cart = []; S.coupon = null; S.shopper = null; setView('shop'); },
  customize() { S.draft = Object.assign({}, S.cur); S.back = 'shop'; setView('pform'); },
  pickMascot(d) { syncDraft(); S.draft.mascot = d.k; render(); },
  pickTheme(d) { syncDraft(); S.draft.theme = d.v; applyTheme(d.v, S.draft.accent); render(); },
  pickAccent(d) { syncDraft(); S.draft.accent = d.v; applyTheme(S.draft.theme, d.v); render(); },
  cancelForm() {
    if (S.back === 'shop' && S.cur) applyTheme(S.cur.theme, S.cur.accent); else applyTheme(S.theme, ACCENTS[0]);
    setView(S.back);
  },
  async saveProfile() {
    syncDraft();
    const d = S.draft, name = d.name.trim();
    if (!name) { toast(t('nameReq')); sfx.err(); return; }
    const old = d.id ? S.profiles.find(x => x.id === d.id) : null;
    const rec = normProfile(Object.assign(old || { id: uid(), cash: 20, xp: 0, created: Date.now() }, {
      name, shopName: (d.shopName || '').trim() || t('shopOf', { n: name }), mascot: d.mascot, theme: d.theme, accent: d.accent, currency: d.currency
    }));
    await DB.put('profiles', rec);
    if (!old) { S.profiles.push(rec); await seedCustomers(rec.id); }
    sfx.coin();
    await openProfile(rec.id);
  },
  toggleOpen() { S.cur.open = !S.cur.open; saveP(); S.cur.open ? sfx.bell() : sfx.whoosh(); toast(S.cur.open ? t('nowOpen') : t('nowClosed')); render(); },

  /* items */
  addItem() { S.idraft = { id: null, name: '', price: '', cur: S.cur.currency, qty: 1, img: '', cat: 'toys', disc: 0 }; setView('item'); },
  cancelItem() { setView('shop'); },
  pickCat(d) { syncItem(); S.idraft.cat = d.v; render(); },
  pickDisc(d) { syncItem(); S.idraft.disc = parseInt(d.v, 10); render(); },
  prod(d) {
    const x = S.products.find(p => p.id === d.id), cost = round2(x.usd * 0.5 * RESTOCK_N);
    sheet('<div class="bigimg">' + imgOrPh(x, 60) + '</div><h2 style="margin:0">' + catEmoji(x.cat) + ' ' + esc(x.name) + '</h2>' +
      '<p class="prices">' + priceTag(x) + ' <span class="muted">' + t('inStock', { n: x.qty }) + '</span></p>' +
      '<button class="btn blue big" style="margin-top:4px" data-act="restock" data-id="' + x.id + '">' + ic('box') + ' ' + t('restock') + ' +' + RESTOCK_N + ' · ' + money(cost) + '</button>' +
      '<div class="row"><button class="btn ghost" data-act="editItem" data-id="' + x.id + '">' + ic('edit') + ' ' + t('edit') + '</button><button class="btn red" data-act="delItem" data-id="' + x.id + '">' + ic('trash') + ' ' + t('delete') + '</button></div>');
  },
  async restock(d) {
    const x = S.products.find(p => p.id === d.id), cost = round2(x.usd * 0.5 * RESTOCK_N), p = S.cur;
    if (p.cash < cost) { toast(t('notEnough')); sfx.err(); return; }
    if (x.qty + RESTOCK_N > 99) { toast(t('maxStock')); sfx.err(); return; }
    p.cash = round2(p.cash - cost); x.qty += RESTOCK_N; p.st.restock++;
    await DB.put('products', x); checkBadges(); await saveP();
    sfx.whoosh(); closeSheet(); render(); toast('📦 +' + RESTOCK_N);
  },
  editItem(d) {
    closeSheet();
    const x = S.products.find(p => p.id === d.id);
    S.idraft = { id: x.id, name: x.name, price: x.price, cur: x.cur, qty: x.qty, img: x.img, created: x.created, cat: x.cat || 'other', disc: x.disc || 0, fav: x.fav };
    setView('item');
  },
  delItem(d) {
    confirmBox('confirmDelete', 'yes', async () => {
      await DB.del('products', d.id); S.products = S.products.filter(p => p.id !== d.id); render();
    }, null, true);
  },
  async saveItem() {
    syncItem();
    const d = S.idraft, name = d.name.trim(), price = parseFloat(String(d.price).replace(',', '.'));
    if (!name) { toast(t('nameReq')); sfx.err(); return; }
    if (!(price > 0)) { toast(t('priceReq')); sfx.err(); return; }
    const qty = d.id ? d.qty : Math.max(1, Math.min(99, parseInt(d.qty, 10) || 1));
    const rec = { id: d.id || uid(), pid: S.cur.id, name, price, cur: d.cur, usd: price / rateOf(d.cur), qty, img: d.img || '', created: d.created || Date.now(), cat: d.cat || 'other', disc: d.disc || 0, fav: !!d.fav };
    await DB.put('products', rec);
    const i = S.products.findIndex(p => p.id === rec.id);
    if (i >= 0) S.products[i] = rec; else { S.products.push(rec); track('add', 1); await saveP(); }
    sfx.coin(); setView('shop'); toast(t('saved'));
  },

  /* customers */
  async custs() { await refill(); setView('custs'); },
  newCust() {
    if (S.customers.length >= MAX_CUST) { toast(t('maxCust')); return; }
    S.cdraft = { id: null, name: '', mascot: pick(MASCOTS), hat: '', color: pick(BGS), pers: 'regular' }; setView('cform');
  },
  editCust(d) { const c = S.customers.find(x => x.id === d.id); S.cdraft = { id: c.id, name: c.name, mascot: c.mascot, hat: c.hat, color: c.color, pers: c.pers }; setView('cform'); },
  cancelCust() { setView('custs'); },
  pickCm(d) { syncCust(); S.cdraft.mascot = d.k; render(); },
  pickHat(d) { syncCust(); S.cdraft.hat = d.v; render(); },
  pickBg(d) { syncCust(); S.cdraft.color = d.v; render(); },
  pickPers(d) { syncCust(); S.cdraft.pers = d.v; render(); },
  async saveCust() {
    syncCust();
    const d = S.cdraft, name = d.name.trim();
    if (!name) { toast(t('nameReq')); sfx.err(); return; }
    const old = d.id ? S.customers.find(x => x.id === d.id) : null;
    const rec = Object.assign(old || { id: uid(), pid: S.cur.id, wallet: 0, day: '', orders: 0, spent: 0, created: Date.now() }, { name, mascot: d.mascot, hat: d.hat, color: d.color, pers: d.pers });
    if (old && old.pers !== d.pers) rec.day = '';   // refill with the new personality's wallet
    await DB.put('customers', rec);
    if (!old) { S.customers.push(rec); S.cur.st.custs++; checkBadges(); await saveP(); }
    await refill(); sfx.coin(); setView('custs'); toast(t('saved'));
  },
  delCust() {
    const id = S.cdraft.id;
    confirmBox('confirmDelete', 'yes', async () => {
      await DB.del('customers', id); S.customers = S.customers.filter(c => c.id !== id); setView('custs');
    }, null, true);
  },

  /* the storefront */
  shopAs(d) {
    if (!S.cur.open) { toast(t('closedMsg')); sfx.err(); return; }
    if (!S.products.length) { toast(t('noItems')); sfx.err(); return; }
    S.shopper = S.customers.find(c => c.id === d.id); S.cart = []; S.coupon = null; S.cpnErr = ''; S.q = ''; S.cat = 'all';
    sfx.whoosh(); setView('store');
  },
  leaveStore() {
    const go = () => { S.cart = []; S.coupon = null; setView('custs'); };
    if (S.cart.length) confirmBox('leaveStoreQ', 'leave', go, t('cartLost')); else go();
  },
  setCat(d) { S.cat = d.v; render(); },
  fav(d) { const x = S.products.find(p => p.id === d.id); x.fav = !x.fav; DB.put('products', x); if (x.fav) sfx.star(); updateStore(); },
  pview(d) {
    const x = S.products.find(p => p.id === d.id), out = x.qty < 1;
    sheet('<div class="bigimg">' + imgOrPh(x, 60) + '</div><h2 style="margin:0">' + catEmoji(x.cat) + ' ' + esc(x.name) + '</h2><p class="prices">' + priceTag(x) + ' <span class="muted">' + t('inStock', { n: x.qty }) + '</span></p>' +
      '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('back') + '</button><button class="btn" data-act="addCart" data-id="' + x.id + '" data-close="1"' + (out ? ' disabled' : '') + '>' + ic('cart') + ' ' + t('addCart') + '</button></div>');
  },
  addCart(d) {
    const x = S.products.find(p => p.id === d.id), l = S.cart.find(q => q.id === d.id), have = l ? l.qty : 0;
    if (!x || have >= x.qty) { toast(t('noMore')); sfx.err(); return; }
    if (l) l.qty++; else S.cart.push({ id: d.id, qty: 1 });
    sfx.pop();
    if (d.close) closeSheet();
    updateStore();
    const nb = $('#cbtn'); if (nb) { nb.classList.remove('bump'); void nb.offsetWidth; nb.classList.add('bump'); }
  },
  cart() { S.cpnErr = ''; sheet(cartHtml()); },
  qtyPlus(d) { ACT.addCart({ id: d.id }); sheet(cartHtml()); },
  qtyMinus(d) {
    const l = S.cart.find(q => q.id === d.id); if (!l) return;
    l.qty--; if (l.qty < 1) S.cart = S.cart.filter(q => q.id !== d.id);
    sfx.tick(); updateStore(); sheet(cartHtml());
  },
  applyCoupon() {
    const v = ($('#cpn').value || '').trim().toUpperCase(), c = S.cur.coupons.find(x => x.code === v);
    if (c) { S.coupon = c; S.cpnErr = ''; sfx.coin(); } else { S.coupon = null; S.cpnErr = v ? t('badCoupon') : ''; if (v) sfx.err(); }
    updateStore(); sheet(cartHtml());
  },
  checkout() {
    const T = cartTotals(), c = S.shopper;
    if (!T.count) return;
    if (T.total > loc(c.wallet)) { toast(t('noFunds')); sfx.err(); return; }
    S.pay = { total: T.total, bill: niceUp(T.total), tries: 0, reveal: false, err: '' };
    sheet(payHtml());
    setTimeout(() => { const i = $('#chg'); if (i) i.focus(); }, 80);
  },
  payCheck() {
    const P = S.pay, i = $('#chg'), v = parseFloat(String(i.value).replace(',', '.'));
    const change = rnd(P.bill - P.total);
    if (Math.abs(v - change) < 0.006) { sfx.star(); finishOrder(true); return; }
    P.tries++; sfx.err();
    if (P.tries >= 2) { P.reveal = true; P.err = ''; } else P.err = t('tryAgain');
    sheet(payHtml());
  },
  payDone() { finishOrder(false); },

  /* orders */
  orders() { S.day = dkey(); setView('orders'); },
  dayPrev() { S.day = addDays(S.day || dkey(), -1); render(); },
  dayNext() { const n = addDays(S.day || dkey(), 1); if (n <= dkey()) { S.day = n; render(); } },
  pickDay(d) { S.day = d.v; render(); },
  order(d) { sheet(orderHtml(S.orders.find(o => o.id === d.id))); },
  async advance(d) {
    const o = S.orders.find(x => x.id === d.id);
    if (!o || o.status === 'delivered') return;
    o.status = ST[ST.indexOf(o.status) + 1];
    if (o.status === 'delivered') await deliver(o); else sfx.whoosh();
    await DB.put('orders', o);
    sheet(orderHtml(o)); render();
  },

  /* goals, decor, deals */
  goals() { S.gtab = 'missions'; setView('goals'); },
  gtab(d) { S.gtab = d.v; render(); },
  async claim(d) {
    const p = S.cur, m = ensureMissions(p).list.find(x => x.id === d.id), def = MISSIONS.find(x => x.id === d.id);
    if (!m || m.claimed || m.prog < def.goal) return;
    m.claimed = true; p.cash = round2(p.cash + def.r); addXp(5);
    sfx.coin(); checkBadges(); await saveP(); render(); toast('+' + money(def.r));
  },
  decor() { sheet(decorHtml()); },
  async buyDecor(d) {
    const x = DECOR.find(q => q.id === d.id), p = S.cur;
    if (p.cash < x.p) { toast(t('notEnough')); sfx.err(); return; }
    p.cash = round2(p.cash - x.p); p.owned.push(x.id); p.eq[x.slot] = x.id; p.st.decor++;
    sfx.cha(); checkBadges(); await saveP(); sheet(decorHtml()); render();
  },
  async equip(d) {
    const x = DECOR.find(q => q.id === d.id), p = S.cur;
    if (p.eq[x.slot] === x.id) delete p.eq[x.slot]; else p.eq[x.slot] = x.id;
    sfx.pop(); await saveP(); sheet(decorHtml()); render();
  },
  async skin(d) {
    const p = S.cur, s = SKINS.find(x => x[0] === d.v);
    if (level(p) < s[1]) { toast(t('lockedLevel', { n: s[1] })); sfx.err(); return; }
    p.skin = d.v; sfx.star(); await saveP(); sheet(decorHtml()); render();
  },
  deals() { S.ncode = ''; sheet(dealsHtml()); },
  npct(d) { const i = $('#ncode'); if (i) S.ncode = i.value; S.npct = parseInt(d.v, 10); sheet(dealsHtml()); },
  async addCoupon() {
    const code = ($('#ncode').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), p = S.cur;
    S.ncode = code;
    if (code.length < 3) { toast(t('codeShort')); sfx.err(); return; }
    if (p.coupons.length >= 5) { toast(t('maxCoupons')); sfx.err(); return; }
    p.coupons = p.coupons.filter(c => c.code !== code); p.coupons.push({ code, pct: S.npct });
    S.ncode = ''; sfx.coin(); await saveP(); sheet(dealsHtml());
  },
  async delCoupon(d) { S.cur.coupons = S.cur.coupons.filter(c => c.code !== d.code); await saveP(); sheet(dealsHtml()); }
};

let armed = false;
function armGuard() { if (!armed) { armed = true; history.pushState({ g: 1 }, ''); } }
document.addEventListener('click', e => {
  armGuard();
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.act];
  if (f) { sfx.tick(); f(el.dataset, el, e); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'pinin') ACT.pinok();
  if (e.key === 'Enter' && e.target.id === 'chg') ACT.payCheck();
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { S.q = e.target.value; const g = $('#grid'); if (g) g.innerHTML = storeGrid(); }
});
document.addEventListener('change', async e => {
  const f = e.target, file = f.files && f.files[0];
  if (f.id === 'fcam' || f.id === 'fup') {
    if (!file) return;
    syncItem();
    try { S.idraft.img = await shrink(file); } catch (_) { toast(t('imgErr')); }
    render();
  } else if (f.id === 'fimp') {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'myshop' || !Array.isArray(data.profiles)) throw new Error('bad');
      confirmBox('restoreQ', 'restore', () => restoreData(data), t('restoreWarn'), true);
    } catch (_) { toast(t('badBackup')); sfx.err(); }
    f.value = '';
  }
});
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  if (S.view === 'picker' || S.view === 'parent') render();
});

async function restoreData(d) {
  for (const s of ['profiles', 'products', 'customers', 'orders']) { await DB.clear(s); await DB.putMany(s, d[s] || []); }
  const m = d.meta || {};
  if (m.pin) await setMeta('pin', m.pin);
  if (m.rates) await setMeta('rates', m.rates);
  if (m.lang) await setMeta('lang', m.lang);
  if (m.theme) await setMeta('theme', m.theme);
  await loadAll(); applyLang(); applyTheme(S.theme, ACCENTS[0]); setView('picker'); toast(t('restored'));
}

/* ---------- boot ---------- */
async function loadAll() {
  S.lang = await getMeta('lang', (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en');
  S.theme = await getMeta('theme', 'dark');
  S.sound = await getMeta('sound', true); SFX.on = S.sound;
  S.pin = await getMeta('pin', null);
  S.rates = Object.assign({}, RATES0, await getMeta('rates', {}));
  S.profiles = (await DB.all('profiles')).map(normProfile).sort((a, b) => a.created - b.created);
  S.view = S.pin ? 'picker' : 'setup';
}
async function boot() {
  try { await DB.open(); } catch (e) { $('#app').innerHTML = '<p style="padding:20px">Storage is not available in this browser mode.</p>'; return; }
  await loadAll();
  applyLang(); applyTheme(S.theme, ACCENTS[0]); render();
  history.replaceState({ root: 1 }, '');
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

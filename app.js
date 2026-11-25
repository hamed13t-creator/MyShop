'use strict';
/* MyShop - main app. Views are plain functions returning HTML; clicks are handled with data-act. */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'DZD', 'EGP', 'MAD', 'TND', 'CAD', 'TRY'];
const RATES0 = { USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67, DZD: 135, EGP: 49, MAD: 10, TND: 3.1, CAD: 1.37, TRY: 34 };
const ACCENTS = ['#14B8A6', '#7C3AED', '#EC4899', '#3B82F6', '#F97316', '#22C55E'];
const XP_PER_LEVEL = 50, XP_PER_SALE = 10, COINS_PER_SALE = 10, MAX_PROFILES = 6;

const S = { lang: 'en', theme: 'dark', pin: null, rates: Object.assign({}, RATES0), profiles: [], cur: null, products: [], view: 'picker', back: 'picker', draft: null, idraft: null };
let deferredInstall = null, PINCB = null, lastView = '';

const t = (k, v) => {
  let s = (I18N[S.lang] && I18N[S.lang][k]) || I18N.en[k] || k;
  if (v) for (const x in v) s = s.split('{' + x + '}').join(v[x]);
  return s;
};

/* ---------- icons (inline SVG, work offline) ---------- */
const ICONS = {
  plus: 'M12 5v14M5 12h14', 'arrow-left': 'M19 12H5M12 19l-7-7 7-7', x: 'M18 6L6 18M6 6l12 12', check: 'M20 6L9 17l-5-5',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', camera: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18',
  star: 'M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v10M9 10c0-1.5 1.3-2 3-2s3 .6 3 2-1.3 1.8-3 2-3 .6-3 2 1.3 2 3 2 3-.5 3-2',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8', shop: 'M3 9l2-5h14l2 5M3 9v11h18V9M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M9 20v-6h6v6',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3'
};
const ic = (n, s = 20) => '<svg class="ic" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[n] + '"/></svg>';

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
function fmt(n, cur) {
  const loc = S.lang === 'ar' ? 'ar-DZ' : 'en-US';
  try {
    return new Intl.NumberFormat(loc, { style: 'currency', currency: cur, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  } catch (e) { return n + ' ' + cur; }
}
function money(usd, cur) {
  cur = cur || (S.cur && S.cur.currency) || 'USD';
  const r = S.rates[cur] || 1;
  let v = usd * r;
  v = r >= 20 ? Math.round(v) : Math.round(v * 100) / 100;
  return fmt(v, cur);
}
const hue = id => Array.from(String(id)).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const level = p => Math.floor(p.xp / XP_PER_LEVEL) + 1;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

function toast(msg) {
  const d = document.createElement('div');
  d.className = 'toast'; d.textContent = msg;
  document.body.appendChild(d);
  setTimeout(() => d.remove(), 2100);
}
function sheet(html, lock) {
  closeSheet();
  const d = document.createElement('div');
  d.className = 'ov'; d.id = 'ov';
  d.innerHTML = '<div class="sheet">' + html + '</div>';
  d.addEventListener('click', e => { if (e.target === d && !lock) closeSheet(); });
  document.body.appendChild(d);
}
function closeSheet() { const o = $('#ov'); if (o) o.remove(); }

function askPin(cb) {
  PINCB = cb;
  sheet('<h2>' + t('enterPin') + '</h2><input id="pinin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="err" id="pinerr"></p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="pinok">' + t('ok') + '</button></div>');
  setTimeout(() => { const i = $('#pinin'); if (i) i.focus(); }, 60);
}

/* ---------- views ---------- */
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
  return '<header class="top"><button class="ibtn" data-act="cancelForm" aria-label="' + t('back') + '">' + ic('arrow-left') + '</button><h2 style="margin:0">' + (d.id ? t('customize') : t('addProfile')) + '</h2><span style="width:42px"></span></header>' +
    '<div class="hero">' + mas(d.mascot, 96) + '</div>' +
    '<label>' + t('name') + '<input id="f_name" class="inp" maxlength="20" value="' + esc(d.name) + '"></label>' +
    '<label>' + t('shopName') + '<input id="f_shop" class="inp" maxlength="28" value="' + esc(d.shopName) + '"></label>' +
    '<label>' + t('chooseBuddy') + '</label><div class="mgrid">' + MASCOTS.map(k => '<button class="mc ' + (d.mascot === k ? 'sel' : '') + '" data-act="pickMascot" data-k="' + k + '">' + mas(k, 62) + '</button>').join('') + '</div>' +
    '<label>' + t('theme') + '</label><div class="seg"><button class="' + (d.theme === 'dark' ? 'sel' : '') + '" data-act="pickTheme" data-v="dark">' + ic('moon', 16) + ' ' + t('dark') + '</button><button class="' + (d.theme === 'cream' ? 'sel' : '') + '" data-act="pickTheme" data-v="cream">' + ic('sun', 16) + ' ' + t('cream') + '</button></div>' +
    '<label>' + t('color') + '</label><div class="sw">' + ACCENTS.map(c => '<button class="' + (d.accent === c ? 'sel' : '') + '" style="background:' + c + '" data-act="pickAccent" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<label>' + t('currency') + '<select id="f_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (d.currency === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label>' +
    '<button class="btn big" data-act="saveProfile">' + ic('check') + ' ' + t('save') + '</button>';
}

function productCard(x) {
  const out = x.qty < 1;
  return '<button class="prod" data-act="prod" data-id="' + x.id + '"><div class="pimg">' +
    (x.img ? '<img src="' + x.img + '" alt="">' : '<div class="ph" style="--h:' + hue(x.id) + '">' + ic('box', 34) + '</div>') +
    (out ? '<span class="so">' + t('soldOut') + '</span>' : '<span class="qty">×' + x.qty + '</span>') +
    '</div><div class="pname">' + esc(x.name) + '</div><span class="tag">' + money(x.usd) + '</span></button>';
}

function shopView() {
  const p = S.cur, pr = (p.xp % XP_PER_LEVEL) * (100 / XP_PER_LEVEL);
  return '<header class="top"><button class="ibtn" data-act="home" aria-label="' + t('back') + '">' + ic('arrow-left') + '</button>' +
    '<div class="me">' + mas(p.mascot, 34) + '<b>' + esc(p.name) + '</b></div>' +
    '<div class="row"><span class="pill lv">' + ic('star', 15) + ' ' + t('level', { n: level(p) }) + '</span><span class="pill gold" id="coins">' + ic('coin', 15) + ' ' + p.coins + '</span>' +
    '<button class="ibtn" data-act="customize" aria-label="' + t('customize') + '">' + ic('sliders') + '</button></div></header>' +
    '<div class="xp"><i style="width:' + pr + '%"></i></div><div class="awning"></div>' +
    '<h1 class="shoptitle">' + esc(p.shopName) + '</h1>' +
    (S.products.length ? '<div class="shelf">' + S.products.map(productCard).join('') + '</div>' : '<div class="empty">' + ic('box', 48) + '<p>' + t('emptyShop') + '</p></div>') +
    '<div class="dock"><button class="btn ghost" data-act="customers">' + ic('shop') + ' ' + t('customers') + '</button><button class="btn" data-act="addItem">' + ic('plus') + ' ' + t('addItem') + '</button></div>';
}

function itemView() {
  const d = S.idraft, cur = d.cur || S.cur.currency;
  return '<header class="top"><button class="ibtn" data-act="cancelItem" aria-label="' + t('back') + '">' + ic('arrow-left') + '</button><h2 style="margin:0">' + (d.id ? t('editItem') : t('addItem')) + '</h2><span style="width:42px"></span></header>' +
    '<div class="photo">' + (d.img ? '<img src="' + d.img + '" alt="">' : ic('camera', 44)) + '</div>' +
    '<div class="row two"><label class="btn" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fcam" accept="image/*" capture="environment" hidden>' + ic('camera') + ' ' + t('takePhoto') + '</label>' +
    '<label class="btn blue" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fup" accept="image/*" hidden>' + ic('upload') + ' ' + t('upload') + '</label></div>' +
    '<label>' + t('itemName') + '<input id="i_name" class="inp" maxlength="40" value="' + esc(d.name) + '"></label>' +
    '<div class="row two"><label>' + t('price') + '<input id="i_price" class="inp" inputmode="decimal" value="' + esc(d.price == null ? '' : d.price) + '"></label>' +
    '<label>' + t('currency') + '<select id="i_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (cur === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label></div>' +
    '<label>' + t('quantity') + '<input id="i_qty" class="inp" type="number" inputmode="numeric" min="1" max="99" value="' + esc(d.qty) + '"></label>' +
    '<button class="btn big" data-act="saveItem">' + ic('check') + ' ' + t('save') + '</button>';
}

function parentView() {
  const rows = S.profiles.map(p => '<div class="prow">' + mas(p.mascot, 40) + '<b>' + esc(p.name) + '</b><button class="ibtn red" data-act="delProfile" data-id="' + p.id + '" aria-label="' + t('delete') + '">' + ic('trash') + '</button></div>').join('');
  return '<header class="top"><button class="ibtn" data-act="parentDone" aria-label="' + t('back') + '">' + ic('arrow-left') + '</button><h2 style="margin:0">' + t('parent') + '</h2><span style="width:42px"></span></header>' +
    '<h2>' + t('profiles') + '</h2>' + rows + '<button class="btn big" data-act="newProfile">' + ic('plus') + ' ' + t('addProfile') + '</button>' +
    '<h2>' + t('rates') + '</h2><div class="rates">' + CURRENCIES.filter(c => c !== 'USD').map(c => '<label>' + c + '<input class="inp" data-rate="' + c + '" inputmode="decimal" value="' + S.rates[c] + '"></label>').join('') + '</div>' +
    '<button class="btn ghost big" data-act="changePin">' + ic('lock') + ' ' + t('changePin') + '</button>' + installBlock() +
    '<button class="btn big" data-act="parentDone">' + ic('check') + ' ' + t('done') + '</button>';
}

const VIEWS = { setup: setupView, picker: pickerView, pform: pformView, shop: shopView, item: itemView, parent: parentView };

function render() {
  const y = window.scrollY;
  $('#app').innerHTML = VIEWS[S.view]();
  window.scrollTo(0, S.view === lastView ? y : 0);
  lastView = S.view;
}

/* ---------- drafts ---------- */
const newDraft = () => ({ id: null, name: '', shopName: '', mascot: 'fox', theme: S.theme, accent: ACCENTS[0], currency: 'USD' });
function syncDraft() {
  const n = $('#f_name');
  if (n) { S.draft.name = n.value; S.draft.shopName = $('#f_shop').value; S.draft.currency = $('#f_cur').value; }
}
function syncItem() {
  const n = $('#i_name');
  if (n) { S.idraft.name = n.value; S.idraft.price = $('#i_price').value; S.idraft.cur = $('#i_cur').value; S.idraft.qty = $('#i_qty').value; }
}
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
  S.cur = S.profiles.find(p => p.id === id);
  S.products = (await DB.byPid(id)).sort((a, b) => a.created - b.created);
  applyTheme(S.cur.theme, S.cur.accent);
  S.view = 'shop'; render();
}

/* ---------- actions ---------- */
const ACT = {
  closeSheet,
  async install() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); },
  async lang() { S.lang = S.lang === 'en' ? 'ar' : 'en'; await setMeta('lang', S.lang); applyLang(); render(); },
  async theme() { S.theme = S.theme === 'dark' ? 'cream' : 'dark'; await setMeta('theme', S.theme); applyTheme(S.theme, ACCENTS[0]); render(); },

  async setupDone() {
    const v = $('#setpin').value;
    if (!/^\d{4}$/.test(v)) { $('#seterr').textContent = t('pinFour'); return; }
    S.pin = await hashPin(v); await setMeta('pin', S.pin);
    S.draft = newDraft(); S.back = 'picker'; S.view = 'pform'; render();
  },
  async pinok() {
    const i = $('#pinin'); if (!i) return;
    if ((await hashPin(i.value)) === S.pin) { closeSheet(); const cb = PINCB; PINCB = null; if (cb) cb(); }
    else { $('#pinerr').textContent = t('wrongPin'); i.value = ''; i.focus(); }
  },
  parent() { askPin(() => { S.view = 'parent'; render(); }); },
  newProfile() {
    if (S.profiles.length >= MAX_PROFILES) { toast(t('maxProfiles')); return; }
    const go = () => { S.draft = newDraft(); S.back = S.view === 'parent' ? 'parent' : 'picker'; S.view = 'pform'; render(); };
    if (S.view === 'parent') go(); else askPin(go);
  },
  async parentDone() {
    document.querySelectorAll('[data-rate]').forEach(i => {
      const v = parseFloat(String(i.value).replace(',', '.'));
      if (v > 0) S.rates[i.dataset.rate] = v;
    });
    await setMeta('rates', S.rates);
    S.view = 'picker'; render();
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
    sheet('<h2>' + t('confirmDelete') + '</h2><p>' + esc(p.name) + '</p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn red" data-act="delProfileYes" data-id="' + p.id + '">' + t('yes') + '</button></div>');
  },
  async delProfileYes(d) {
    const items = await DB.byPid(d.id);
    for (const x of items) await DB.del('products', x.id);
    await DB.del('profiles', d.id);
    S.profiles = S.profiles.filter(p => p.id !== d.id);
    closeSheet(); render();
  },

  open(d) { openProfile(d.id); },
  home() { S.cur = null; applyTheme(S.theme, ACCENTS[0]); S.view = 'picker'; render(); },
  customize() { S.draft = Object.assign({}, S.cur); S.back = 'shop'; S.view = 'pform'; render(); },
  pickMascot(d) { syncDraft(); S.draft.mascot = d.k; render(); },
  pickTheme(d) { syncDraft(); S.draft.theme = d.v; applyTheme(d.v, S.draft.accent); render(); },
  pickAccent(d) { syncDraft(); S.draft.accent = d.v; applyTheme(S.draft.theme, d.v); render(); },
  cancelForm() {
    if (S.back === 'shop' && S.cur) applyTheme(S.cur.theme, S.cur.accent); else applyTheme(S.theme, ACCENTS[0]);
    S.view = S.back; render();
  },
  async saveProfile() {
    syncDraft();
    const d = S.draft, name = d.name.trim();
    if (!name) { toast(t('nameReq')); return; }
    const old = d.id ? S.profiles.find(x => x.id === d.id) : null;
    const rec = Object.assign(old || { id: uid(), coins: 20, xp: 0, created: Date.now() }, {
      name, shopName: (d.shopName || '').trim() || t('shopOf', { n: name }), mascot: d.mascot, theme: d.theme, accent: d.accent, currency: d.currency
    });
    await DB.put('profiles', rec);
    if (!old) S.profiles.push(rec);
    await openProfile(rec.id);
  },

  addItem() { S.idraft = { id: null, name: '', price: '', cur: S.cur.currency, qty: 1, img: '' }; S.view = 'item'; render(); },
  cancelItem() { S.view = 'shop'; render(); },
  prod(d) {
    const x = S.products.find(p => p.id === d.id);
    sheet('<div class="bigimg">' + (x.img ? '<img src="' + x.img + '" alt="">' : '<div class="ph" style="--h:' + hue(x.id) + ';height:100%">' + ic('box', 60) + '</div>') + '</div>' +
      '<h2 style="margin:0">' + esc(x.name) + '</h2><p><span class="tag">' + money(x.usd) + '</span> <span class="muted">' + t('inStock', { n: x.qty }) + '</span></p>' +
      '<div class="row"><button class="btn ghost" data-act="editItem" data-id="' + x.id + '">' + ic('edit') + ' ' + t('edit') + '</button><button class="btn red" data-act="delItem" data-id="' + x.id + '">' + ic('trash') + ' ' + t('delete') + '</button></div>');
  },
  editItem(d) {
    closeSheet();
    const x = S.products.find(p => p.id === d.id);
    S.idraft = { id: x.id, name: x.name, price: x.price, cur: x.cur, qty: x.qty, img: x.img, created: x.created };
    S.view = 'item'; render();
  },
  delItem(d) {
    sheet('<h2>' + t('confirmDelete') + '</h2><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn red" data-act="delItemYes" data-id="' + d.id + '">' + t('yes') + '</button></div>');
  },
  async delItemYes(d) {
    await DB.del('products', d.id);
    S.products = S.products.filter(p => p.id !== d.id);
    closeSheet(); render();
  },
  async saveItem() {
    syncItem();
    const d = S.idraft, name = d.name.trim(), price = parseFloat(String(d.price).replace(',', '.'));
    if (!name) { toast(t('nameReq')); return; }
    if (!(price > 0)) { toast(t('priceReq')); return; }
    const qty = Math.max(1, Math.min(99, parseInt(d.qty, 10) || 1));
    const rec = { id: d.id || uid(), pid: S.cur.id, name, price, cur: d.cur, usd: price / (S.rates[d.cur] || 1), qty, img: d.img || '', created: d.created || Date.now() };
    await DB.put('products', rec);
    const i = S.products.findIndex(p => p.id === rec.id);
    if (i >= 0) S.products[i] = rec; else S.products.push(rec);
    S.view = 'shop'; render(); toast(t('saved'));
  },

  customers() {
    const stock = S.products.filter(x => x.qty > 0);
    if (!stock.length) { toast(t('noItems')); return; }
    const x = stock[Math.floor(Math.random() * stock.length)];
    const others = MASCOTS.filter(k => k !== S.cur.mascot), ck = others[Math.floor(Math.random() * others.length)];
    sheet('<div id="deal"><div class="stage"><div class="cust walk">' + mas(ck, 58) + '</div><div class="pi">' + (x.img ? '<img src="' + x.img + '" alt="">' : '<div class="ph" style="--h:' + hue(x.id) + ';height:100%">' + ic('box', 40) + '</div>') + '</div>' +
      '<div class="stamp">' + t('sold') + '</div><span class="coin" style="--dx:-30px;--d:.3s"></span><span class="coin" style="--dx:0px;--d:.4s"></span><span class="coin" style="--dx:30px;--d:.5s"></span><span class="coin" style="--dx:60px;--d:.6s"></span></div>' +
      '<p class="bubble">' + t('bubble', { item: esc(x.name) }) + '</p><p class="center"><span class="tag">' + money(x.usd) + '</span></p>' +
      '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('notNow') + '</button><button class="btn" data-act="sellNow" data-id="' + x.id + '">' + t('sell') + '</button></div></div>', true);
  },
  async sellNow(d, el) {
    const x = S.products.find(p => p.id === d.id), p = S.cur;
    if (!x || x.qty < 1) { closeSheet(); return; }
    document.querySelectorAll('#deal .btn').forEach(b => { b.disabled = true; });
    const before = level(p);
    x.qty -= 1; p.coins += COINS_PER_SALE; p.xp += XP_PER_SALE;
    await DB.put('products', x); await DB.put('profiles', p);
    const deal = $('#deal'); if (deal) deal.classList.add('sold');
    const up = level(p) > before;
    setTimeout(() => { closeSheet(); render(); const c = $('#coins'); if (c) c.classList.add('bump'); toast(up ? t('levelUp') : '+' + COINS_PER_SALE); }, 1300);
  }
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const f = ACT[el.dataset.act];
  if (f) f(el.dataset, el, e);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'pinin') ACT.pinok();
});
document.addEventListener('change', async e => {
  const f = e.target;
  if (f.id !== 'fcam' && f.id !== 'fup') return;
  const file = f.files && f.files[0];
  if (!file) return;
  syncItem();
  try { S.idraft.img = await shrink(file); } catch (_) { toast(t('imgErr')); }
  render();
});
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  if (S.view === 'picker' || S.view === 'parent') render();
});

/* ---------- boot ---------- */
async function boot() {
  try { await DB.open(); } catch (e) { $('#app').innerHTML = '<p style="padding:20px">Storage is not available in this browser mode.</p>'; return; }
  S.lang = await getMeta('lang', (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en');
  S.theme = await getMeta('theme', 'dark');
  S.pin = await getMeta('pin', null);
  S.rates = Object.assign({}, RATES0, await getMeta('rates', {}));
  S.profiles = (await DB.all('profiles')).sort((a, b) => a.created - b.created);
  S.view = S.pin ? 'picker' : 'setup';
  applyLang(); applyTheme(S.theme, ACCENTS[0]); render();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

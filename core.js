'use strict';
/* MyShop core: state, text, icons, theme, feature flags, toasts and sheets. Loaded first of the app modules. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const round2 = v => Math.round(v * 100) / 100;
/* kids may type Arabic-Indic digits and Arabic separators: turn them into normal numbers */
const normDigits = s => {
  let v = String(s == null ? '' : s).replace(/[\u0660-\u0669]/g, c => c.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, c => c.charCodeAt(0) - 0x6F0).replace(/[\u2212\u2013]/g, '-').replace(/\s/g, '');
  if (/^-?\d{1,3}([,\u066C\u060C]\d{3})+(\.\d+)?$/.test(v)) return v.replace(/[,\u066C\u060C]/g, '');   // 1,500 means fifteen hundred
  return v.replace(/[\u066B\u060C,]/g, '.').replace(/\u066C/g, '');                                          // 1,5 means one and a half
};
const parseNum = s => parseFloat(normDigits(s));
const pick = a => a[Math.floor(Math.random() * a.length)];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'SAR', 'AED', 'DZD', 'EGP', 'MAD', 'TND', 'CAD', 'TRY'];
const RATES0 = { USD: 1, EUR: 0.92, GBP: 0.79, SAR: 3.75, AED: 3.67, DZD: 135, EGP: 49, MAD: 10, TND: 3.1, CAD: 1.37, TRY: 34 };
const ACCENTS = ['#14B8A6', '#7C3AED', '#EC4899', '#3B82F6', '#F97316', '#22C55E'];
const XPL = 100, MAX_PROFILES = 6, MAX_CUST = 12, RESTOCK_N = 5;
const PMULT = { generous: 6, regular: 4, picky: 3 };   // hidden daily budget = this many average items (varies by day)

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
function applySkin() {          // shop theme: wallpaper tile behind every screen of the profile
  const p = S.cur, h = document.documentElement.dataset;
  h.skin = p ? p.skin : 'default';
  h.pic = p && feat(p, 'pic') ? 'on' : 'off';
  h.wall = p && p.skin !== 'default' && p.wall !== false ? 'on' : 'off';
}
function applyTheme(theme, accent) {
  applySkin();
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.setProperty('--accent', accent || ACCENTS[0]);
  const m = document.querySelector('meta[name=theme-color]');
  if (m) m.content = theme === 'dark' ? '#1B1F3B' : '#FFF6E5';
}
const feat = (p, k) => { p = p || S.cur; if (!p) return false; if (p.ft && k in p.ft) return !!p.ft[k]; return (PRESET[p.lvl] || PRESET.explorer).includes(k); };
const curCode = () => (S.cur && S.cur.currency) || 'USD';
const rateOf = c => S.rates[c] || 1;


/* toasts are queued so several messages in a row are all readable. Each one leads with a picture (emoji);
   picture mode shows it big, for longer, and keeps the last messages in a log. */
let toastBusy = false;
const toastQ = [], LOG = [];
const EMO = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:\uFE0F|\u200D|\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
const picOn = () => !!S.cur && feat(S.cur, 'pic');
function toast(msg, e) {
  msg = String(msg);
  const m = msg.match(EMO);
  const item = { e: m ? m[1] : (e || '💬'), msg: m ? msg.slice(m[0].length) : msg };
  if (S.cur) { LOG.unshift(Object.assign({ ts: Date.now() }, item)); LOG.length = Math.min(LOG.length, 20); }
  toastQ.push(item); if (!toastBusy) nextToast();
}
function nextToast() {
  const m = toastQ.shift();
  if (!m) { toastBusy = false; return; }
  toastBusy = true;
  const pic = picOn(), ms = pic ? 5000 : 3500;
  const d = document.createElement('div'), i = document.createElement('i'), s = document.createElement('span');
  d.className = 'toast' + (pic ? ' pic' : ''); d.setAttribute('role', 'status'); d.style.animationDuration = ms + 'ms';
  i.textContent = m.e; s.textContent = m.msg;
  d.appendChild(i); d.appendChild(s);
  document.body.appendChild(d);
  setTimeout(() => { d.remove(); nextToast(); }, ms);
}
function logHtml() {
  return '<h2>🔔 ' + t('msgLog') + '</h2>' + (LOG.length ? LOG.map(m => '<div class="logrow"><i>' + esc(m.e) + '</i><span class="gr">' + esc(m.msg) + '</span><small class="muted">' + new Date(m.ts).toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit' }) + '</small></div>').join('') : '<p class="muted center">' + t('msgNone') + '</p>') +
    '<button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}
const failToast = e => { if (e) console.error(e); toast(t('saveErr'), '⚠️'); sfx.err(); };

function sheet(html) {
  let o = $('#ov');
  if (o) { $('.sheet', o).innerHTML = html; return; }
  o = document.createElement('div');
  o.className = 'ov'; o.id = 'ov';
  o.innerHTML = '<div class="sheet">' + html + '</div>';
  o.addEventListener('click', e => { if (e.target === o) closeSheet(); });
  document.body.appendChild(o);
}
function closeSheet() { S.cartOpen = false; const o = $('#ov'); if (o) o.remove(); }
function confirmBox(titleKey, yesKey, cb, extra, red) {
  S.cb = cb;
  sheet('<h2>' + t(titleKey) + '</h2>' + (extra ? '<p>' + extra + '</p>' : '') + '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('stay') + '</button><button class="btn ' + (red ? 'red' : '') + '" data-act="confirmYes">' + t(yesKey) + '</button></div>');
}
function askPin(cb) {
  PINCB = cb;
  sheet('<h2>' + t('enterPin') + '</h2><input id="pinin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="err" id="pinerr"></p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="pinok">' + t('ok') + '</button></div>');
  setTimeout(() => { const i = $('#pinin'); if (i) i.focus(); }, 60);
}

'use strict';
/* MyShop money and dates: all money is kept in the shop's own currency (rnd, conv, fmt, nice, lp, minUnit). */
/* All money is stored in the shop's own currency, rounded to its decimals (no hidden USD base, so no drift). */
const rnd = (v, cur) => rateOf(cur || curCode()) >= 20 ? Math.round(v) : Math.round((v + 1e-9) * 100) / 100;
const minUnit = cur => rateOf(cur || curCode()) >= 20 ? 1 : 0.01;
const conv = (v, from, to) => from === to ? v : rnd(v / rateOf(from) * rateOf(to), to);
function nice(v) {                      // friendly round amount for game prices (rewards, decor, budgets)
  const step = v < 10 ? 0.5 : v < 100 ? 1 : v < 1000 ? 5 : 10;
  return Math.max(minUnit(), rnd(Math.round(v / step) * step));
}
const lp = usd => nice(usd * rateOf(curCode()));   // a USD catalog price, as a nice local amount
const inCur = (v, from) => conv(v, from || curCode(), curCode());
const LOC = () => S.lang === 'ar' ? 'ar-DZ' : 'en-US';   // one locale for money and dates, so digits never mix
function fmt(n, cur) {
  cur = cur || curCode();
  const l = LOC();
  try {
    return new Intl.NumberFormat(l, { style: 'currency', currency: cur, minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 }).format(n);
  } catch (e) { return n + ' ' + cur; }
}
const money = (v, cur) => fmt(v, cur || curCode());
const bdi = s => '<bdi>' + s + '</bdi>';                     // keeps signs and ×qty on the right side in Arabic
const sgn = (sign, v, cur) => bdi(sign + fmt(v, cur));
const iso = s => '\u2068' + s + '\u2069';                     // same idea for plain text (toasts)
const hue = id => Array.from(String(id)).reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
const level = p => Math.floor(p.xp / XPL) + 1;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const dkey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const addDays = (k, n) => { const d = new Date(k + 'T12:00:00'); d.setDate(d.getDate() + n); return dkey(d); };
const dlabel = (k, o) => new Date(k + 'T12:00:00').toLocaleDateString(LOC(), o || { weekday: 'short', month: 'short', day: 'numeric' });
const catEmoji = c => (CATS.find(x => x[0] === c) || CATS[CATS.length - 1])[1];
const unitLocal = x => rnd(x.pr * (1 - (x.disc || 0) / 100));
/* Photos are stored as data URLs. Each one is turned into a short blob: URL once and cached, so a render
   does not copy every photo into the HTML again (much faster with many items). */
const PHOTO = new Map();
function photoUrl(x) {
  if (!x.id) return x.img;
  const c = PHOTO.get(x.id);
  if (c && c.src === x.img) return c.url;
  let url = x.img;
  try {
    const m = /^data:(image\/[a-z+.-]+);base64,(.*)$/i.exec(x.img);
    if (m && window.URL && URL.createObjectURL) {
      const bin = atob(m[2]), a = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([a], { type: m[1] }));
    }
  } catch (e) { url = x.img; }
  if (c && c.url !== c.src) try { URL.revokeObjectURL(c.url); } catch (e) { /* ignore */ }
  PHOTO.set(x.id, { src: x.img, url });
  return url;
}
const imgOrPh = (x, s) => x.img ? '<img src="' + esc(photoUrl(x)) + '" alt="">' : '<div class="ph" style="--h:' + hue(x.id) + '">' + ic('box', s || 34) + '</div>';
const stars = n => '<span class="stars">' + '★'.repeat(n) + '<i>' + '★'.repeat(5 - n) + '</i></span>';

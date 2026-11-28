'use strict';
/* MyShop robot (CPU) customers: a PWA cannot run in the background, so their orders are generated when the app
   opens (catch-up since the last visit, at most one day). The visit schedule is fixed per customer and day by a
   seeded random generator, so reopening the app or changing the phone clock never gives extra orders.
   Also here: the weekly report card and the stock planner. */

/* ---------- seeded random ---------- */
function h32(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h >>> 0; }
function mulberry32(a) {
  return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
}
const pickR = (a, rng) => a[Math.floor(rng() * a.length)];

/* ---------- rules ---------- */
const cpuLv = p => CPU_LV[(p || S.cur).lvl] || CPU_LV.explorer;
const isCpu = c => !!c && c.mode === 'cpu';
const cpuCusts = () => S.customers.filter(isCpu);
const shopOpenAt = (p, t) => t >= (p.openTs || 0) ? p.open !== false : p.open === false;   // the sign's state at time t
function mktFor(p, cat, day) {               // hidden market price; at Tycoon it moves a little each day (supply and demand)
  const L = cpuLv(p), m = mktOf(cat);
  return L.drift ? m * (1 + L.drift * (2 * dayRand({ id: 'mkt' + cat }, day) - 1)) : m;
}
function cpuBudget(c, day) {                 // hidden daily budget of a robot customer, from market prices (never shown)
  if (!c.cb || c.cb.day !== day) {
    const ev = day === today() ? todayEvent(S.cur) : null;
    c.cb = { day, left: nice((PMULT[c.pers] || 4) * mktAvg() * (0.55 + dayRand(c, day + 'cpu') * 0.9) * (ev ? ev.m : 1)) };
  }
  return c.cb;
}
const decorCount = p => SLOTS.filter(s => p.eq[s]).length;

/* ---------- catch-up ---------- */
async function cpuCatchUp(p) {
  if (!p || S.view === 'store' || $('#ans')) return null;      // never change stock while a cart or a question is open
  const now = Date.now(), cpu = p.cpu = p.cpu || { last: now, lost: [] };
  const res = { orders: [], lost: [], cash: 0 };
  if (cpu.last > now + 48 * 36e5) { cpu.last = now; await saveP(); return res; }   // restored backup or wrong clock: start again from now
  if (now <= cpu.last) return res;                              // clock moved back: nothing, and last is never lowered
  const from = Math.max(cpu.last, now - 864e5), cs = cpuCusts(), L = cpuLv(p);
  if (!feat(p, 'cpu') || !cs.length || !S.products.length) { cpu.last = now; await saveP(); res.empty = feat(p, 'cpu') && cs.length > 0; return res; }
  const visits = [];
  for (let d = dkey(new Date(from)); d <= dkey(new Date(now)); d = addDays(d, 1)) {
    for (const c of cs) {
      const rng = mulberry32(h32(p.id + '|' + c.id + '|' + d));
      const V = L.v[0] + Math.floor(rng() * (L.v[1] - L.v[0] + 1));
      for (let i = 0; i < V; i++) {
        const t = new Date(d + 'T08:00:00').getTime() + Math.floor(rng() * 720) * 60000, seed = Math.floor(rng() * 4294967296);
        if (t > from && t <= now) visits.push({ c, d, i, t, seed });
      }
    }
  }
  visits.sort((a, b) => a.t - b.t);
  const dayN = {}, touchedP = new Set(), touchedC = new Set();
  const cnt = d => dayN[d] != null ? dayN[d] : (dayN[d] = S.orders.filter(o => o.src === 'cpu' && o.day === d).length);
  let pending = S.orders.filter(o => o.src === 'cpu' && o.status !== 'delivered').length;
  const lose = (v, why, x) => res.lost.push({ t: v.t, day: v.d, cid: v.c.id, cname: v.c.name, why, item: x ? x.name : '', cat: x ? x.cat : '' });
  for (const v of visits) {
    const c = v.c, rng = mulberry32(v.seed), id = 'c' + h32(c.id + v.d + v.i).toString(36) + h32(v.d + v.i + c.id).toString(36);
    if (S.orders.some(o => o.id === id) || cnt(v.d) >= L.cap) continue;
    if (!shopOpenAt(p, v.t)) { lose(v, 'closed'); continue; }
    if (L.busy && pending >= L.busy) { lose(v, 'busy'); continue; }
    // 1. what the customer wants
    const cats = Array.from(new Set(S.products.map(x => x.cat || 'other'))), favs = c.favs.filter(k => cats.includes(k));
    const cat = favs.length && rng() < 0.6 ? pickR(favs, rng) : pickR(cats, rng);
    const inCat = S.products.filter(x => (x.cat || 'other') === cat), w = inCat.map(x => c.hunt && x.disc ? 1.5 : 1);
    let r = rng() * w.reduce((a, b) => a + b, 0), x = inCat[0];
    for (let j = 0; j < inCat.length; j++) { r -= w[j]; if (r <= 0) { x = inCat[j]; break; } }
    if (x.qty < 1) { lose(v, 'stock', x); continue; }
    // 2. is the price right?
    const ratio = unitLocal(x) / mktFor(p, cat, v.d), ev = v.d === today() ? todayEvent(p) : null;
    let P = 1 - L.k * (c.hunt ? 1.5 : 1) * (ratio - 1) + 0.1 * ((p.rr || 4) - 4) + 0.02 * decorCount(p) + (c.hunt && x.disc ? 0.1 : 0);
    P = Math.min(0.95, Math.max(0.05, P));
    if (c.pers === 'picky' && (p.rr || 4) < 3.5) P *= 0.5;
    if (p.lvl === 'starter' && ratio <= 2) P = Math.max(P, 0.6);
    if (ev) P = Math.min(0.95, P * ev.m);
    if (rng() > P) { lose(v, 'price', x); continue; }
    // 3. how many, within the hidden budget
    const lines = [{ x, q: x.qty >= 2 && rng() < 0.25 ? 2 : 1 }];
    if (L.v[1] >= 3 && rng() < 0.2) {
      const others = S.products.filter(y => y !== x && y.qty > 0);
      if (others.length) lines.push({ x: pickR(others, rng), q: 1 });
    }
    const B = cpuBudget(c, v.d), sum = () => rnd(lines.reduce((a, l) => a + unitLocal(l.x) * l.q, 0));
    while (lines.length && sum() > B.left) { const l = lines[lines.length - 1]; if (l.q > 1) l.q--; else lines.pop(); }
    if (!lines.length) { lose(v, 'budget', x); continue; }
    // 4. the order (paid now, delivered by the kid)
    const sub = sum(), cp = c.hunt && feat(p, 'invoice') && feat(p, 'coupons') && p.coupons.length && rng() < 0.3 ? pickR(p.coupons, rng) : null;
    const pct = cp ? cp.pct : 0, disc = rnd(sub * pct / 100), fee = feat(p, 'fee') ? lp(1.5) : 0, total = rnd(sub - disc + fee);
    const count = lines.reduce((a, l) => a + l.q, 0);
    p.seq = (p.seq || 0) + 1;
    const o = {
      id, pid: p.id, n: p.seq, cid: c.id, cname: c.name, cmas: c.mascot, chat: c.hat, ccol: c.color, pers: c.pers, src: 'cpu', seen: false,
      items: lines.map(l => ({ id: l.x.id, name: l.x.name, qty: l.q, unit: unitLocal(l.x) })),
      sub, disc, pct, code: cp ? cp.code : '', total, cur: curCode(), xp: 0, cost: rnd(lines.reduce((a, l) => a + costOf(l.x) * l.q, 0)), fee,
      status: 'ordered', day: v.d, ts: v.t, review: null, tip: 0, tipc: 1
    };
    lines.forEach(l => { l.x.qty -= l.q; touchedP.add(l.x); });
    B.left = Math.max(0, rnd(B.left - total)); c.orders = (c.orders || 0) + 1; c.spent = rnd((c.spent || 0) + total); touchedC.add(c);
    res.cash = rnd(res.cash + earn(p, total, 'sale'));
    p.st.rev = rnd(p.st.rev + total); p.st.sold += count; p.st.orders++;
    track('items', count); track('order', 1); if (count >= 3) track('big', 1);
    res.orders.push(o); dayN[v.d]++; pending++;
  }
  cpu.last = now;
  cpu.lost = cpu.lost.concat(res.lost).slice(-30);
  checkBadges();
  try {
    await commit(['products', 'customers', 'orders', 'profiles'], os => {
      touchedP.forEach(x => os.products.put(x)); touchedC.forEach(c => os.customers.put(c));
      res.orders.forEach(o => os.orders.put(o)); os.profiles.put(p);
    });
  } catch (e) { failToast(e); await reloadCur(); return null; }
  if (res.orders.length) { S.orders = S.orders.concat(res.orders).sort((a, b) => a.ts - b.ts); }
  return res;
}
async function cpuRun(show) {            // called when a profile opens and when the app comes back to the screen
  const r = await cpuCatchUp(S.cur);
  if (!r) return;
  if (show && (r.orders.length || r.lost.length)) { if (r.orders.length) sfx.cha(); sheet(awayHtml(r)); }
  if (S.view === 'shop' || S.view === 'orders' || S.view === 'custs') render();
}

/* ---------- screens ---------- */
const lostLine = l => LOST_E[l.why] + ' ' + t('lost_' + l.why, { c: esc(l.cname), i: esc(l.item) });
function awayHtml(r) {
  const p = S.cur, pic = feat(p, 'pic'), n = r.orders.length;
  const ords = r.orders.slice(0, 8).map(o => '<span class="awo">' + avatar(o.cmas, 34, o.chat, o.ccol) + '<i>' + o.items.map(i => catEmoji((S.products.find(x => x.id === i.id) || {}).cat)).join('') + '</i></span>').join('');
  let lost = '';
  if (r.lost.length) {
    if (pic) {                                    // Starter: a friendly tip, no blame
      const so = r.lost.find(l => l.why === 'stock');
      lost = so ? '<div class="hintbox">💡 ' + t('tipStock', { i: esc(so.item) }) + '</div>' : '';
    } else {
      lost = '<h3 class="sech">' + t('missed') + '</h3>' + r.lost.slice(0, 3).map(l => '<p class="small">' + lostLine(l) + '</p>').join('') +
        (r.lost.length > 3 ? '<p class="muted small">' + t('andMore', { n: r.lost.length - 3 }) + '</p>' : '');
    }
  }
  return '<div class="center">' + mas(p.mascot, 80) + '<h2>' + t('awayTitle') + '</h2>' +
    (n ? '<p style="font-size:20px;font-weight:800">🛒 ' + t(n === 1 ? 'awayOrder1' : 'awayOrders', { n }) + ' · ' + sgn('+', r.cash) + '</p><div class="awrow">' + ords + '</div>' : '<p class="muted">' + t('awayNone') + '</p>') + '</div>' + lost +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('later') + '</button>' + (n ? '<button class="btn" data-act="awayOrders">' + ic('truck') + ' ' + t('goOrders') + '</button>' : '') + '</div>';
}
function cpuInfoHtml(c) {
  const mine = S.orders.filter(o => o.cid === c.id), last = mine.length ? mine[mine.length - 1].ts : 0;
  return '<div class="center">' + avatar(c.mascot, 90, c.hat, c.color) + '<h2>🤖 ' + esc(c.name) + '</h2><p class="muted">' + t('moded_cpu') + '</p></div>' +
    '<div class="tot"><span>' + t('favCats') + '</span><b>' + (c.favs.length ? c.favs.map(k => catEmoji(k) + ' ' + t('cat_' + k)).join(' · ') : '–') + '</b></div>' +
    (c.hunt ? '<div class="tot"><span>' + t('hunt') + '</span><b>🏷️</b></div>' : '') +
    '<div class="tot"><span>' + t('personality') + '</span><b>' + t('pers_' + c.pers) + '</b></div>' +
    '<p class="center muted small">' + t('cpuInfo', { d: last ? new Date(last).toLocaleString(LOC(), { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '–', n: c.orders || 0 }) + '</p>' +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('done') + '</button><button class="btn" data-act="editCust" data-id="' + c.id + '">' + ic('edit') + ' ' + t('edit') + '</button></div>';
}
function missedStrip(day) {           // lost sales of the day, grouped by reason
  const ls = ((S.cur.cpu || {}).lost || []).filter(l => l.day === day);
  if (!ls.length || feat(S.cur, 'pic')) return '';
  const g = {}; ls.forEach(l => { g[l.why] = (g[l.why] || 0) + 1; });
  return '<button class="missed" data-act="missedList" data-v="' + day + '"><b>' + t('missed') + ':</b> ' + Object.keys(g).map(k => LOST_E[k] + ' ' + t('why_' + k) + ' ' + bdi('×' + g[k])).join(' · ') + '</button>';
}
function missedHtml(day) {
  const ls = ((S.cur.cpu || {}).lost || []).filter(l => l.day === day).reverse();
  return '<h2>' + t('missed') + '</h2>' + ls.map(l => '<p class="small">' + lostLine(l) + '</p>').join('') + '<button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ---------- invoice check (Tycoon, robot orders): the kid checks the maths before packing ---------- */
function startInvoice(o) {
  const p = S.cur, stages = ['sum'];
  if (feat(p, 'profitQ')) stages.push('profit');
  S.pay = { inv: o, stages, hard: true, sub: o.sub, total: o.total, disc: o.disc, pct: o.pct, fee: o.fee, cost: o.cost, bill: 0, ok: 0, asked: 0, res: [] };
  enterStage(0);
}
async function finishInvoice() {
  const P = S.pay, o = P.inv, p = S.cur;
  S.pay = null;
  o.chk = P.ok === P.asked ? 'ok' : 'miss'; o.status = 'packed';
  p.st.math += P.ok; p.st.mq += P.asked; p.hist = (p.hist || []).concat(P.res).slice(-20);
  if (P.ok) { addXp(4 * P.ok); track('math', P.ok); }
  try { await commit(['orders', 'profiles'], os => { os.orders.put(o); os.profiles.put(p); }); }
  catch (e) { failToast(e); closeSheet(); await reloadCur(); render(); return; }
  sfx.whoosh(); toast(t(o.chk === 'ok' ? 'invOk' : 'invMiss'), o.chk === 'ok' ? '🧾' : '🔎');
  sheet(orderHtml(o)); render();
}

/* ---------- weekly report card ---------- */
function weekStats(end) {
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(end, -i)), os = S.orders.filter(o => days.includes(o.day));
  const best = {}; os.forEach(o => o.items.forEach(i => { best[i.name] = (best[i.name] || 0) + i.qty; }));
  const top = Object.keys(best).sort((a, b) => best[b] - best[a])[0];
  const rv = S.orders.filter(o => o.review && o.dts && days.includes(dkey(new Date(o.dts)))).map(o => o.review.stars);
  const lost = ((S.cur.cpu || {}).lost || []).filter(l => days.includes(l.day)), lg = {};
  lost.forEach(l => { lg[l.why] = (lg[l.why] || 0) + 1; });
  const ocost = o => o.cost != null ? o.cost : 0;
  return {
    rev: os.reduce((s, o) => s + inCur(o.total, o.cur), 0), profit: os.reduce((s, o) => s + inCur(o.total - ocost(o), o.cur), 0),
    orders: os.length, items: os.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0), top, topN: top ? best[top] : 0,
    stars: rv.length ? round1(rv.reduce((a, b) => a + b, 0) / rv.length) : null, lost: lost.length, lg,
    late: S.orders.filter(o => o.review && o.review.late && days.includes(dkey(new Date(o.dts)))).length
  };
}
function reportTip(w) {
  const big = Object.keys(w.lg).sort((a, b) => w.lg[b] - w.lg[a])[0];
  if (big === 'stock') return t('tip_stock');
  if (big === 'price') return t('tip_price');
  if (big === 'closed') return t('tip_closed');
  if (w.late) return t('tip_late');
  if (!w.orders) return t('tip_none');
  return t('tip_good');
}
function reportHtml() {
  const p = S.cur, end = today(), w = weekStats(end), prev = weekStats(addDays(end, -7)), pic = feat(p, 'pic');
  const trend = (a, b) => a > b ? ' 📈' : a < b ? ' 📉' : '';
  const box = (e, v, k) => '<div class="metric"><b>' + e + ' ' + v + '</b><span>' + t(k) + '</span></div>';
  return '<h2>📊 ' + t('report') + '</h2><p class="muted small">' + dlabel(addDays(end, -6), { month: 'short', day: 'numeric' }) + ' – ' + dlabel(end, { month: 'short', day: 'numeric' }) + '</p>' +
    '<div class="metrics">' + box('🛒', w.orders + trend(w.orders, prev.orders), 'orders') + box('📦', w.items, 'itemsSold') +
    (pic ? '' : box('🪙', money(rnd(w.rev)) + trend(w.rev, prev.rev), 'revenue')) +
    (feat(p, 'profit') ? box('📈', money(rnd(w.profit)), 'profit') : '') +
    box('⭐', w.stars == null ? '–' : w.stars + (prev.stars != null ? trend(w.stars, prev.stars) : ''), 'rating') +
    (w.lost ? box('🙁', w.lost, 'missed') : '') + '</div>' +
    (w.top ? '<div class="tot big"><span>🏆 ' + t('bestSeller') + '</span><b>' + esc(w.top) + ' ' + bdi('×' + w.topN) + '</b></div>' : '') +
    discEffect() + '<div class="hintbox">💡 ' + reportTip(w) + '</div><button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ---------- stock planner (Merchant and Tycoon) ---------- */
function soldPerDay(x, days) {
  const ks = Array.from({ length: days }, (_, i) => addDays(today(), -i));
  const n = S.orders.filter(o => ks.includes(o.day)).reduce((s, o) => s + o.items.filter(i => i.id === x.id).reduce((a, i) => a + i.qty, 0), 0);
  return Math.max(1, Math.round(n / days));
}
function newPlan(x) {
  const a = soldPerDay(x, 7), d = 3 + (h32(x.id + today()) % 5);
  S.plan = { id: x.id, a, d, ans: a * d, tries: 0, done: false, err: '', ok: false };
}
function planHtml() {
  const P = S.plan, x = S.products.find(y => y.id === P.id);
  if (!x) return '';
  const need = Math.max(0, P.ans - x.qty);
  return '<h2>🧮 ' + t('planT') + '</h2><p class="center">' + t('planQ', { a: P.a, i: esc(x.name), d: P.d }) + '</p>' +
    (P.done ? '<div class="note ' + (P.ok ? 'ok' : '') + '">' + P.ans + '</div><p class="center">' + t(need ? 'planBuy' : 'planEnough', { h: x.qty, n: need }) + '</p>' +
      '<button class="btn big" data-act="prod" data-id="' + x.id + '">' + t('next') + '</button>' :
      '<input id="plans" class="inp pin" style="letter-spacing:2px" inputmode="numeric" placeholder="?" autocomplete="off"><p class="err">' + (P.err || '') + '</p>' +
      '<div class="row"><button class="btn ghost" data-act="prod" data-id="' + x.id + '">' + t('cancel') + '</button><button class="btn" data-act="planCheck">' + ic('check') + ' ' + t('check') + '</button></div>');
}

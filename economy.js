'use strict';
/* MyShop economy: profiles, missions, badges, hidden budgets, costs, cart maths, orders and delivery. */
/* ---------- profile / game state helpers ---------- */
function normProfile(p) {
  if (p.cash == null) p.cash = p.coins != null ? p.coins : 20;
  delete p.coins;
  p.open = p.open !== false;
  if (!p.lvl) p.lvl = { off: 'starter', easy: 'explorer', normal: 'merchant' }[p.mathLvl] || 'explorer';
  delete p.mathLvl; p.ft = p.ft || {}; p.hist = p.hist || [];
  p.owned = p.owned || []; p.eq = p.eq || {}; p.skin = p.skin || 'default';
  p.coupons = p.coupons || []; p.badges = p.badges || []; p.seq = p.seq || 0; p.xp = p.xp || 0;
  if (!p.maxDay) p.maxDay = p.ms && p.ms.day > dkey() ? p.ms.day : dkey();
  p.st = Object.assign({ rev: 0, sold: 0, orders: 0, delivered: 0, five: 0, math: 0, custs: 0, restock: 0, decor: 0, rsum: 0, rcount: 0, mq: 0, goals: 0, exch: 0,
    honest: 0, kept: 0, cmp: 0, quests: 0, plans: 0, given: 0 }, p.st || {});
  if (!p.cpu) p.cpu = { last: Date.now(), lost: [] };          // v8: no burst of robot orders right after the update
  if (p.rr == null) p.rr = p.st.rcount ? Math.round(p.st.rsum / p.st.rcount * 10) / 10 : 4;
  if (!p.openTs) p.openTs = Date.now();
  p.qh = Object.assign({ sum: [], change: [], profit: [], invoice: [], exch: [], plan: [] }, p.qh || {});
  p.jars = Object.assign({ save: 0, share: 0, given: 0 }, p.jars || {});
  p.split = Object.assign({ save: 20, share: 10 }, p.split || {});
  return p;
}
function normCust(c) { if (c.mode !== 'cpu') c.mode = 'manual'; c.favs = Array.isArray(c.favs) ? c.favs.slice(0, 2) : []; c.hunt = !!c.hunt; return c; }
/* Every change of the shop's cash goes through earn() / pay(), so the jars and the cash book see it.
   Earned money is split into the Spend / Save / Share jars (p.cash is the Spend jar); spending always comes from Spend. */
const SPLIT_KINDS = ['sale', 'tip', 'mission', 'quest', 'exch', 'keep'];
const splitOf = p => feat(p, 'split') ? p.split : { save: 20, share: 10 };     // Starter: fixed split, shown as pictures
const LQ = [];                                                                 // cash book lines waiting for the next save
function book(p, k, a, sv, sh) {
  LQ.push({ id: uid(), pid: p.id, ts: Date.now(), day: gameDay(p), k, a: rnd(a), sv: rnd(sv || 0), sh: rnd(sh || 0), b: p.cash, sb: p.jars.save, cur: p.currency });
}
function earn(p, amt, kind) {
  amt = rnd(amt); if (!(amt > 0)) return 0;
  let sv = 0, sh = 0;
  if (feat(p, 'jars') && SPLIT_KINDS.includes(kind)) {
    const s = splitOf(p);
    sv = rnd(amt * (s.save || 0) / 100); sh = rnd(amt * (s.share || 0) / 100);
    p.jars.save = rnd(p.jars.save + sv); p.jars.share = rnd(p.jars.share + sh);
  }
  p.cash = rnd(p.cash + amt - sv - sh);
  book(p, kind, amt, sv, sh);
  return amt;
}
function pay(p, amt, kind) { amt = rnd(amt); if (!(amt > 0)) return 0; p.cash = rnd(p.cash - amt); book(p, kind, -amt); return amt; }
function jarMove(p, from, to, amt, kind) {          // between jars: 'cash' (Spend), 'save', 'share', 'given'
  amt = rnd(amt); if (!(amt > 0)) return 0;
  const get = j => j === 'cash' ? p.cash : p.jars[j], set = (j, v) => { if (j === 'cash') p.cash = rnd(v); else p.jars[j] = rnd(v); };
  set(from, get(from) - amt); set(to, get(to) + amt);
  book(p, kind, from === 'cash' ? -amt : to === 'cash' ? amt : 0, (to === 'save' ? amt : 0) - (from === 'save' ? amt : 0), (to === 'share' ? amt : 0) - (from === 'share' ? amt : 0));
  return amt;
}
const goalBase = p => feat(p, 'jars') ? p.jars.save : p.cash;       // with jars, the savings goal fills from the Save jar
/* the last 20 answers of each question type, for the parents' skills dashboard */
function qrec(p, type, ok) { p.qh = p.qh || {}; p.qh[type] = (p.qh[type] || []).concat([ok ? 1 : 0]).slice(-20); }
const round1 = v => Math.round(v * 10) / 10;
/* one transaction for everything a change touches; waiting cash book lines are saved in the same transaction */
function commit(stores, fn) {
  const lines = LQ.splice(0);
  const all = lines.length && !stores.includes('ledger') ? stores.concat(['ledger']) : stores;
  return DB.multi(all, os => { fn(os); lines.forEach(l => os.ledger.put(l)); });
}
const saveP = () => S.cur ? commit(['profiles'], os => os.profiles.put(S.cur)) : Promise.resolve();
/* Clock guard: the game day never goes backwards. Setting the phone clock back changes nothing,
   and setting it forward gives one new day once (it is then used up until real time catches up). */
function gameDay(p) {
  const d = dkey();
  if (!p) return d;
  if (!p.maxDay || d > p.maxDay) p.maxDay = d;
  return p.maxDay;
}
const today = () => gameDay(S.cur);

function addXp(n) {
  const p = S.cur, b = level(p);
  p.xp += n;
  if (level(p) > b) setTimeout(() => { sfx.up(); toast('🚀 ' + t('levelUp') + ' ' + level(p)); }, 700);
}
function ensureMissions(p) {
  const d = gameDay(p);
  if (!p.ms || p.ms.day !== d) {
    let h = 7;
    for (const ch of d + p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const a = MISSIONS.filter(m => m.type === 'change' ? feat(p, 'change') : m.type !== 'math' || feat(p, 'sum') || feat(p, 'change') || feat(p, 'exch'));
    for (let i = a.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); const x = a[i]; a[i] = a[j]; a[j] = x; }
    p.ms = { day: d, list: a.slice(0, 3).map(m => ({ id: m.id, prog: 0, claimed: false })) };
  }
  return p.ms;
}
function freshMissions(p) {       // today's missions are redrawn if the kid has not started any (so none is impossible at the new level)
  if (p.ms && p.ms.list.every(m => !m.prog && !m.claimed)) p.ms = null;
}
function track(type, n) {
  questTrack(S.cur, type, n);
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
  if (p.goal && !p.goal.done && goalBase(p) >= p.goal.amt) { p.goal.done = true; p.st.goals++; setTimeout(() => { sfx.up(); toast('🏆 ' + t('goalDone')); }, 500); }
  for (const b of BADGES) {
    if (!p.badges.includes(b.id) && b.test(p)) {
      p.badges.push(b.id);
      setTimeout(() => sfx.star(), 400);
      toast(b.e + ' ' + t('newBadge', { n: t('b_' + b.id) }));
    }
  }
}
/* Customers have a hidden daily budget (never shown as a number). It is limited, differs each day, and refills tomorrow.
   It follows a blend of the shop's prices and the hidden market prices, kept between 0.5x and 2x the market,
   so a kid cannot make customers rich by pricing one item at a million. */
const mktOf = cat => lp(MKT[cat] || MKT.other);
function mktAvg() {
  const cats = Array.from(new Set(S.products.map(x => x.cat || 'other')));
  return cats.length ? cats.reduce((a, c) => a + mktOf(c), 0) / cats.length : lp(5);
}
function avgPrice() {
  const m = mktAvg();
  if (!S.products.length) return m;
  const own = S.products.reduce((a, x) => a + unitLocal(x), 0) / S.products.length;
  return Math.min(2 * m, Math.max(0.5 * m, (own + m) / 2));
}
function dayRand(c, day) { let h = 7; for (const ch of c.id + day) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return (h % 1000) / 1000; }
function budgetFor(c, day) {
  const base = (PMULT[c.pers] || 4) * avgPrice();          // about 3-6 average items, +/- a daily random mood
  const ev = todayEvent(S.cur);
  return nice(Math.max(base * (0.55 + dayRand(c, day) * 0.9) * (ev ? ev.m : 1), Math.min(2 * (minPrice() || lp(1)), 2 * mktAvg())));
}
function todayEvent(p) {         // Tycoon: a daily surprise that changes how much customers spend
  if (!p || !feat(p, 'event')) return null;
  let h = 11; for (const ch of gameDay(p) + p.id) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h % 10 < 4 ? EVENTS[h % EVENTS.length] : null;
}
const costOf = x => x.cost != null ? x.cost : Math.max(minUnit(), rnd(x.pr * 0.5));   // cost of one item, locked when the stock was bought
const newCost = pr => Math.max(minUnit(), rnd(pr * 0.5));            // what a new item costs to buy (half its price at that moment)
const marginPct = x => { const u = unitLocal(x); return u > 0 ? Math.round((u - costOf(x)) / u * 100) : 0; };
const minPrice = () => { const a = S.products.filter(x => x.qty > 0).map(unitLocal); return a.length ? Math.min(...a) : 0; };
const canShop = c => c.budget >= minPrice() && minPrice() > 0;
function mood(c) {
  const full = c.bmax || c.budget || 1, r = c.budget / full;
  return !canShop(c) ? '😴' : r > 0.6 ? '😄' : r > 0.3 ? '🙂' : '😬';
}
async function rebudget() {      // the catalog changed: customers who have not spent anything today get a budget that fits it
  for (const c of S.customers) if (c.budget === c.bmax) c.day = '';
  await refill();
}
async function refill() {
  const day = today();
  for (const c of S.customers) {
    if ((c.day || '') < day || c.budget == null) { c.budget = budgetFor(c, day); c.bmax = c.budget; c.day = day; delete c.wallet; await DB.put('customers', c); }
  }
}
async function seedCustomers(pid) {
  const names = NAMES[S.lang].slice().sort(() => Math.random() - 0.5), ms = MASCOTS.slice().sort(() => Math.random() - 0.5);
  const list = [['generous', 0], ['regular', 1]].map(([pers, i]) => ({ id: uid(), pid, name: names[i], mascot: ms[i], hat: i ? '' : '🎀', color: BGS[i + 1], pers, budget: null, day: '', orders: 0, spent: 0, created: Date.now() + i }));
  await DB.putMany('customers', list);
}
/* v2 stored everything in a USD base; v3 keeps money in the shop currency. Runs once per profile. */
async function migrateMoney(p) {
  if (p.m3) return;
  const cur = p.currency, r = rateOf(cur);
  for (const x of S.products) {
    x.pr = x.cur === cur ? rnd(x.price, cur) : rnd(x.usd * r, cur);
    if (!(x.pr > 0)) x.pr = minUnit(cur);
    await DB.put('products', x);
  }
  p.cash = rnd(p.cash * r, cur); p.st.rev = rnd(p.st.rev * r, cur);
  for (const o of S.orders) {
    if (o.tip && !o.tipc) { o.tip = rnd(o.tip * rateOf(o.cur), o.cur); o.tipc = 1; await DB.put('orders', o); }
  }
  for (const c of S.customers) { c.day = ''; c.budget = null; delete c.wallet; if (c.spent) c.spent = rnd(c.spent * r, cur); await DB.put('customers', c); }
  p.m3 = true; await saveP();
}
async function loadProfileData(id) {
  S.cur = S.profiles.find(p => p.id === id);
  S.products = (await DB.byPid('products', id)).sort((a, b) => a.created - b.created);
  S.customers = (await DB.byPid('customers', id)).map(normCust).sort((a, b) => a.created - b.created);
  S.orders = (await DB.byPid('orders', id)).sort((a, b) => a.ts - b.ts);
  await migrateMoney(S.cur);
  for (const x of S.products) if (x.cost == null) { x.cost = newCost(x.pr); await DB.put('products', x); }   // R1: cost price is stored per item
  if (!S.cur.seeded) {   // profiles made before customers existed (v1) get starter customers once
    if (!S.customers.length) { await seedCustomers(id); S.customers = (await DB.byPid('customers', id)).sort((a, b) => a.created - b.created); }
    S.cur.seeded = true; await saveP();
  }
  ensureMissions(S.cur);
  await refill();
  await saveP();
}


/* cart maths (everything is calculated in the shop currency, as the kid sees it) */
function cartLines() {
  return S.cart.map(l => { const x = S.products.find(p => p.id === l.id); return x ? { x, qty: l.qty, unit: unitLocal(x) } : null; }).filter(Boolean);
}
function cartTotals() {
  const ls = cartLines(), cur = curCode();
  const sub = rnd(ls.reduce((s, l) => s + l.unit * l.qty, 0), cur), pct = S.coupon && feat(S.cur, 'coupons') ? S.coupon.pct : 0;
  const disc = rnd(sub * pct / 100, cur), fee = ls.length && feat(S.cur, 'fee') ? lp(1.5) : 0;
  const cost = rnd(ls.reduce((s, l) => s + costOf(l.x) * l.qty, 0), cur);
  return { ls, sub, disc, pct, fee, cost, total: rnd(sub - disc + fee, cur), count: ls.reduce((s, l) => s + l.qty, 0) };
}

async function openProfile(id) {
  await loadProfileData(id);
  applyTheme(S.cur.theme, S.cur.accent);
  S.cart = []; S.coupon = null;
  setView('shop');
  await afterOpen();
}

/* ---------- orders: create, deliver ---------- */
async function reloadCur() {                      // a save failed: reload this profile from storage so the screen shows what is really saved
  const id = S.cur && S.cur.id; if (!id) return;
  const fresh = await DB.get('profiles', id);
  if (fresh) { const i = S.profiles.findIndex(x => x.id === id); S.profiles[i] = normProfile(fresh); }
  await loadProfileData(id);
}
async function finishOrder(ok, asked, res, chg) {      // ok = correct math answers, asked = questions asked, chg = right change given
  if (S.ordering) return;
  const p = S.cur, c = S.shopper, T = cartTotals(), cur = curCode();
  if (!T.count) return;
  S.ordering = true;
  try {
    const xp = 10 + ok * 4;
    p.seq = (p.seq || 0) + 1;
    const o = {
      id: uid(), pid: p.id, n: p.seq, cid: c.id, cname: c.name, cmas: c.mascot, chat: c.hat, ccol: c.color, pers: c.pers,
      items: T.ls.map(l => ({ id: l.x.id, name: l.x.name, qty: l.qty, unit: l.unit })),
      sub: T.sub, disc: T.disc, pct: T.pct, code: S.coupon ? S.coupon.code : '', total: T.total, cur, xp, cost: T.cost, fee: T.fee,
      status: 'ordered', day: today(), ts: Date.now(), review: null, tip: 0, tipc: 1
    };
    for (const l of T.ls) l.x.qty -= l.qty;
    c.budget = Math.max(0, rnd(c.budget - T.total)); c.orders = (c.orders || 0) + 1; c.spent = rnd((c.spent || 0) + T.total);
    earn(p, T.total, 'sale');                    // the real value of the purchase goes into the cash
    p.st.rev = rnd(p.st.rev + T.total); p.st.sold += T.count; p.st.orders++;
    p.st.math += ok; p.st.mq += asked; p.hist = (p.hist || []).concat(res || []).slice(-20);
    addXp(xp);
    if (ok) track('math', ok);
    if (chg) track('change', 1);
    track('items', T.count); track('order', 1); if (T.count >= 3) track('big', 1);
    checkBadges();
    try {                                          // stock, customer, order and cash are saved together: all or nothing
      await commit(['products', 'customers', 'orders', 'profiles'], os => {
        T.ls.forEach(l => os.products.put(l.x)); os.customers.put(c); os.orders.put(o); os.profiles.put(p);
      });
    } catch (e) { failToast(e); closeSheet(); await reloadCur(); S.cart = []; S.coupon = null; setView('custs'); return; }
    S.orders.push(o);
    S.cart = []; S.coupon = null; S.cpnErr = '';
    sfx.cha();
    sheet(doneHtml(o, ok));
    render();
  } finally { S.ordering = false; }
}
function starsFor(pers) {
  const r = Math.random();
  if (pers === 'generous') return r < 0.85 ? 5 : 4;
  if (pers === 'picky') return r < 0.3 ? 3 : r < 0.7 ? 4 : 5;
  return r < 0.5 ? 5 : 4;
}
function latePenalty(p, o, now) {        // robot orders: slow delivery costs stars (not at Starter)
  if (o.src !== 'cpu' || !feat(p, 'late')) return 0;
  const h = (now - o.ts) / 36e5; let pen = 0;
  for (const [hh, n] of (CPU_LV[p.lvl] || CPU_LV.explorer).late) if (h > hh) pen = n;
  return pen;
}
function deliver(o) {                    // changes the order and the profile in memory; ACT.advance saves both in one transaction
  const p = S.cur, now = Date.now(), late = latePenalty(p, o, now), st = Math.max(1, starsFor(o.pers) - late);
  o.review = { stars: st, k: Math.floor(Math.random() * 2), late: late > 0 }; o.dts = now;
  o.tip = (o.pers === 'generous' && st === 5) ? rnd(o.total * 0.1, o.cur) : 0;
  earn(p, conv(o.tip, o.cur, curCode()), 'tip');
  p.rr = round1(0.8 * (p.rr || 4) + 0.2 * st);
  p.st.delivered++; p.st.rsum += st; p.st.rcount++;
  if (st === 5) { p.st.five++; track('five', 1); }
  track('deliver', 1);
  addXp(5 + st);
  checkBadges();
}

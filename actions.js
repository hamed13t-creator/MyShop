'use strict';
/* MyShop actions: every data-act click handler. Async handlers return their promise (busy lock). */
/* ---------- actions ---------- */
const ACT = {
  closeSheet,
  back() { handleBack(); },
  msgLog() { sheet(logHtml()); },
  goProfiles() { closeSheet(); ACT.home(); },
  exitNow() { closeSheet(); exitApp(); },
  stayBye() { const d = $('#bye'); if (d) d.remove(); S.exiting = false; rearm(); },
  confirmYes() {
    const cb = S.cb; S.cb = null; closeSheet();
    if (!cb) return;
    try { const r = cb(); return r && typeof r.then === 'function' ? r.catch(failToast) : r; } catch (e) { failToast(e); }
  },
  async install() { if (!deferredInstall) return; deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; render(); },
  async lang() { if (S.view === 'pform') syncDraft(); S.lang = S.lang === 'en' ? 'ar' : 'en'; await setMeta('lang', S.lang); applyLang(); render(); },
  async theme() { S.theme = S.theme === 'dark' ? 'cream' : 'dark'; await setMeta('theme', S.theme); applyTheme(S.theme, ACCENTS[0]); render(); },
  async sound() { S.sound = !S.sound; SFX.on = S.sound; await setMeta('sound', S.sound); if (S.sound) sfx.coin(); render(); },

  async setupDone() {
    const v = normDigits($('#setpin').value);
    if (!/^\d{4}$/.test(v)) { $('#seterr').textContent = t('pinFour'); return; }
    S.pin = await hashPin(v); await setMeta('pin', S.pin);
    S.draft = newDraft(); S.back = 'picker'; setView('pform');
  },
  async pinok() {
    const i = $('#pinin'); if (!i) return;
    if (S.pinLock - Date.now() > 30000) S.pinLock = Date.now() + 30000;     // the clock was moved back: never lock longer than 30 s
    if (Date.now() < S.pinLock) { $('#pinerr').textContent = t('pinWait', { n: Math.ceil((S.pinLock - Date.now()) / 1000) }); sfx.err(); i.value = ''; return; }
    if ((await hashPin(normDigits(i.value))) === S.pin) { S.pinFails = 0; await setMeta('pinFails', 0); closeSheet(); const cb = PINCB; PINCB = null; if (cb) cb(); }
    else {
      S.pinFails = (S.pinFails || 0) + 1;
      if (S.pinFails >= 5) { S.pinFails = 0; S.pinLock = Date.now() + 30000; $('#pinerr').textContent = t('pinWait', { n: 30 }); }   // a child cannot guess all 10,000 PINs
      else $('#pinerr').textContent = t('wrongPin');
      sfx.err(); i.value = ''; i.focus();
      await setMeta('pinFails', S.pinFails); await setMeta('pinLock', S.pinLock || 0);   // kept on the device, so reloading the app does not reset the lock
    }
  },
  parent() { askPin(() => setView('parent')); },
  newProfile() {
    if (S.profiles.length >= MAX_PROFILES) { toast(t('maxProfiles'), '✋'); return; }
    const go = () => { S.draft = newDraft(); S.back = S.view === 'parent' ? 'parent' : 'picker'; setView('pform'); };
    if (S.view === 'parent') go(); else askPin(go);
  },
  async parentDone() {
    document.querySelectorAll('[data-rate]').forEach(i => {
      const v = parseNum(i.value);
      if (v > 0) S.rates[i.dataset.rate] = v;
    });
    await setMeta('rates', S.rates);
    setView('picker');
  },
  changePin() {
    sheet('<h2>' + t('newPin') + '</h2><input id="npin" class="inp pin" type="password" inputmode="numeric" maxlength="4" autocomplete="off"><p class="err" id="nerr"></p><div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="changePinOk">' + t('save') + '</button></div>');
  },
  async changePinOk() {
    const v = normDigits($('#npin').value);
    if (!/^\d{4}$/.test(v)) { $('#nerr').textContent = t('pinFour'); return; }
    S.pin = await hashPin(v); await setMeta('pin', S.pin); closeSheet(); toast(t('saved'), '✅');
  },
  delProfile(d) {
    const p = S.profiles.find(x => x.id === d.id);
    confirmBox('confirmDelete', 'yes', async () => {
      for (const x of await DB.byPid('products', d.id)) await DB.del('products', x.id);
      for (const x of await DB.byPid('customers', d.id)) await DB.del('customers', x.id);
      for (const x of await DB.byPid('orders', d.id)) await DB.del('orders', x.id);
      for (const x of await DB.byPid('ledger', d.id)) await DB.del('ledger', x.id);
      await DB.del('profiles', d.id);
      S.profiles = S.profiles.filter(q => q.id !== d.id); render();
    }, esc(p.name), true);
  },
  async exportData() {
    const data = { app: 'myshop', v: 5, ts: Date.now(), meta: { lang: S.lang, theme: S.theme, pin: S.pin, rates: S.rates, sound: S.sound },
      profiles: await DB.all('profiles'), products: await DB.all('products'), customers: await DB.all('customers'), orders: await DB.all('orders'), ledger: await DB.all('ledger') };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' }), name = 'myshop-backup-' + dkey() + '.json';
    try {
      const file = new File([blob], name, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file] }); await backedUp(); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    await backedUp();
    toast(t('saved'), '💾');
  },

  open(d) { return openProfile(d.id); },
  home() { S.cur = null; S.cart = []; applyTheme(S.theme, ACCENTS[0]); setView('picker'); },
  toShop() { closeSheet(); S.cart = []; S.coupon = null; S.shopper = null; setView('shop'); },
  customize() { S.draft = Object.assign({}, S.cur); S.back = 'shop'; setView('pform'); },
  pickLvl(d) { syncDraft(); S.draft.lvl = d.v; render(); },
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
    if (!name) { toast(t('nameReq'), '⚠️'); sfx.err(); return; }
    const old = d.id ? S.profiles.find(x => x.id === d.id) : null, oldCur = old && old.currency;
    const rec = normProfile(Object.assign(old || { id: uid(), cash: Math.round(20 * rateOf(d.currency) / 5) * 5, xp: 0, created: Date.now(), m3: true, lvl: d.lvl || 'explorer' }, {
      name, shopName: (d.shopName || '').trim() || t('shopOf', { n: name }), mascot: d.mascot, theme: d.theme, accent: d.accent, currency: d.currency
    }));
    if (old && oldCur !== d.currency) {            // the shop changes currency: convert everything it owns
      for (const x of S.products) { x.pr = Math.max(minUnit(d.currency), conv(x.pr, oldCur, d.currency)); x.cost = Math.max(minUnit(d.currency), conv(costOf(x), oldCur, d.currency)); await DB.put('products', x); }
      rec.cash = conv(rec.cash, oldCur, d.currency); rec.st.rev = conv(rec.st.rev, oldCur, d.currency);
      if (rec.goal) rec.goal.amt = conv(rec.goal.amt, oldCur, d.currency);
      ['save', 'share', 'given'].forEach(j => { rec.jars[j] = conv(rec.jars[j], oldCur, d.currency); });
      for (const c of S.customers) { c.day = ''; c.budget = null; await DB.put('customers', c); }
    }
    await DB.put('profiles', rec);
    if (!old) { S.profiles.push(rec); await seedCustomers(rec.id); }
    sfx.coin();
    await openProfile(rec.id);
  },
  goalSet() {
    sheet('<h2>🎯 ' + t('goalSet') + '</h2><label>' + t('goalName') + '<input id="g_name" class="inp" maxlength="24"></label><label>' + t('goalAmt') + '<input id="g_amt" class="inp" inputmode="decimal" autocomplete="off"></label>' +
      '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="goalSave">' + t('save') + '</button></div>');
  },
  async goalSave() {
    const n = ($('#g_name').value || '').trim(), a = rnd(parseNum($('#g_amt').value));
    if (!n || !(a > goalBase(S.cur))) { toast(t('goalBad'), '⚠️'); sfx.err(); return; }
    S.cur.goal = { name: n, amt: a, done: false }; sfx.coin(); await saveP(); closeSheet(); render();
  },
  exch() { newExchange(); sheet(exchHtml()); focusSoon('#xans'); },
  exAnswer() {
    const E = S.ex, xi = $('#xans');
    if (!xi || E.done) return;
    const v = parseNum(xi.value);
    if (isNaN(v)) return;
    const p = S.cur, ok = Math.abs(v - E.ans) <= Math.max(minUnit(E.cur), E.ans * 0.01);
    E.tries++;
    if (ok) {
      E.done = true; sfx.star(); p.st.math++; p.st.mq++; p.hist = (p.hist || []).concat([1]).slice(-20); qrec(p, 'exch', 1);
      const day = gameDay(p); if (!p.exd || (p.exd.day || '') < day) p.exd = { day, n: 0 };
      if (p.exd.n < 5) { p.exd.n++; earn(p, lp(1), 'exch'); addXp(4); E.reward = true; }
      track('math', 1); checkBadges(); saveP(); render();
    } else { sfx.err(); if (E.tries >= 2) { E.done = true; E.show = true; p.st.mq++; p.hist = (p.hist || []).concat([0]).slice(-20); qrec(p, 'exch', 0); saveP(); } else E.err = t('tryAgain'); }
    sheet(exchHtml());
  },
  exNext() { newExchange(); sheet(exchHtml()); focusSoon('#xans'); },
  lvlSheet(d) { sheet(lvlHtml(S.profiles.find(x => x.id === d.id))); },
  async setLvl(d) { const p = S.profiles.find(x => x.id === d.id); p.lvl = d.v; p.ft = {}; freshMissions(p); await DB.put('profiles', p); sheet(lvlHtml(p)); render(); },
  async toggleFt(d) { const p = S.profiles.find(x => x.id === d.id); p.ft = p.ft || {}; p.ft[d.k] = !feat(p, d.k); freshMissions(p); await DB.put('profiles', p); sheet(lvlHtml(p)); render(); },
  async resetFt(d) { const p = S.profiles.find(x => x.id === d.id); p.ft = {}; freshMissions(p); await DB.put('profiles', p); sheet(lvlHtml(p)); render(); },
  toggleOpen() { S.cur.open = !S.cur.open; S.cur.openTs = Date.now(); saveP(); S.cur.open ? sfx.bell() : sfx.whoosh(); toast(S.cur.open ? t('nowOpen') : t('nowClosed'), S.cur.open ? '🟢' : '🔴'); render(); },

  /* items */
  addItem() { S.idraft = { id: null, name: '', price: '', cur: S.cur.currency, qty: 1, img: '', cat: 'toys', disc: 0 }; setView('item'); },
  cancelItem() { setView('shop'); },
  pickCat(d) { syncItem(); S.idraft.cat = d.v; render(); },
  pickDisc(d) { syncItem(); S.idraft.disc = parseInt(d.v, 10); render(); },
  suggestPrice() { syncItem(); S.idraft.price = String(mktOf(S.idraft.cat || 'other')); S.idraft.cur = curCode(); S.idraft.disc = 0; sfx.coin(); render(); },
  prod(d) {
    const x = S.products.find(p => p.id === d.id), cost = restockCost(x);
    sheet('<div class="bigimg">' + imgOrPh(x, 60) + '</div><h2 style="margin:0">' + catEmoji(x.cat) + ' ' + esc(x.name) + '</h2>' +
      '<p class="prices">' + priceTag(x) + ' <span class="muted">' + t('inStock', { n: x.qty }) + '</span></p>' +
      (feat(S.cur, 'profit') ? '<div class="tot"><span>' + t('costEach') + '</span><b>' + fmt(costOf(x)) + '</b></div><div class="tot"><span>' + t('profitEach') + '</span><b style="color:' + (unitLocal(x) < costOf(x) ? '#F87171' : 'inherit') + '">' + bdi(fmt(rnd(unitLocal(x) - costOf(x)))) + '</b></div>' +
        '<div class="tot"><span>' + t('margin') + '</span><b>' + bdi(marginPct(x) + '%') + '</b></div><p class="muted small">' + t('marginHint') + '</p>' : '') +
      (feat(S.cur, 'lowstock') && x.qty <= 2 ? '<div class="hintbox">⚠️ ' + t(x.qty ? 'lowOne' : 'outOne') + '</div>' : '') +
      (feat(S.cur, 'plan') ? '<button class="btn ghost big" data-act="planStart" data-id="' + x.id + '">🧮 ' + t('planT') + '</button>' : '') +
      '<button class="btn blue big" style="margin-top:4px" data-act="restock" data-id="' + x.id + '">' + ic('box') + ' ' + t('restock') + ' +' + RESTOCK_N + ' · ' + money(cost) + '</button>' +
      '<div class="row"><button class="btn ghost" data-act="editItem" data-id="' + x.id + '">' + ic('edit') + ' ' + t('edit') + '</button><button class="btn red" data-act="delItem" data-id="' + x.id + '">' + ic('trash') + ' ' + t('delete') + '</button></div>');
  },
  async restock(d) {
    const x = S.products.find(p => p.id === d.id), cost = restockCost(x), p = S.cur;
    if (p.cash < cost) { toast(t('notEnough'), '⚠️'); sfx.err(); return; }
    if (x.qty + RESTOCK_N > 99) { toast(t('maxStock'), '⚠️'); sfx.err(); return; }
    pay(p, cost, 'restock'); x.qty += RESTOCK_N; p.st.restock++; track('restock', 1);
    checkBadges();
    try { await commit(['products', 'profiles'], os => { os.products.put(x); os.profiles.put(p); }); }
    catch (e) { failToast(e); closeSheet(); await reloadCur(); render(); return; }
    sfx.whoosh(); closeSheet(); render(); toast('📦 +' + RESTOCK_N);
  },
  editItem(d) {
    closeSheet();
    const x = S.products.find(p => p.id === d.id);
    S.idraft = { id: x.id, name: x.name, price: x.pr, cur: curCode(), qty: x.qty, img: x.img, created: x.created, cat: x.cat || 'other', disc: x.disc || 0, fav: x.fav };
    setView('item');
  },
  delItem(d) {
    confirmBox('confirmDelete', 'yes', async () => {
      await DB.del('products', d.id); S.products = S.products.filter(p => p.id !== d.id); await rebudget(); render();
    }, null, true);
  },
  async saveItem() {
    syncItem();
    const d = S.idraft, name = d.name.trim(), price = parseNum(d.price), pr = conv(price, d.cur, curCode());
    if (!name) { toast(t('nameReq'), '⚠️'); sfx.err(); return; }
    if (!(price > 0) || !(pr >= minUnit()) || pr > 1e7) { toast(t('priceReq'), '⚠️'); sfx.err(); return; }
    const qty = d.id ? d.qty : Math.max(1, Math.min(99, parseInt(normDigits(d.qty), 10) || 1));
    const old = d.id ? S.products.find(p => p.id === d.id) : null, p = S.cur;
    const cost = old ? costOf(old) : newCost(pr);              // the cost is locked when the stock is bought; editing the price never changes it
    const due = !old && feat(p, 'profit') ? rnd(cost * qty) : 0;   // Merchant and Tycoon pay for the first stock
    if (due > p.cash) {
      const n = Math.floor((p.cash + 1e-9) / cost);
      toast(n > 0 ? t('stockLower', { n }) : t('notEnough'), '📦'); sfx.err(); return;
    }
    const rec = { id: d.id || uid(), pid: p.id, name, price: pr, cur: curCode(), pr, cost, qty, img: d.img || '', created: d.created || Date.now(), cat: d.cat || 'other', disc: d.disc || 0, fav: !!d.fav };
    if (!old) { pay(p, due, 'stock'); track('add', 1); }
    try { await commit(['products', 'profiles'], os => { os.products.put(rec); os.profiles.put(p); }); }
    catch (e) { failToast(e); await reloadCur(); setView('shop'); return; }
    const i = S.products.findIndex(x => x.id === rec.id);
    if (i >= 0) S.products[i] = rec; else S.products.push(rec);
    await rebudget();
    sfx.coin(); setView('shop'); toast(t('saved'), '✅');
  },

  /* customers */
  async custs() { await refill(); setView('custs'); },
  newCust() {
    if (S.customers.length >= MAX_CUST) { toast(t('maxCust'), '✋'); return; }
    S.cdraft = { id: null, name: '', mascot: pick(MASCOTS), hat: '', color: pick(BGS), pers: 'regular', mode: 'manual', favs: [], hunt: false }; setView('cform');
  },
  editCust(d) { closeSheet(); const c = S.customers.find(x => x.id === d.id); S.cdraft = { id: c.id, name: c.name, mascot: c.mascot, hat: c.hat, color: c.color, pers: c.pers, mode: c.mode, favs: c.favs.slice(), hunt: c.hunt }; setView('cform'); },
  pickMode(d) { syncCust(); S.cdraft.mode = d.v === 'cpu' ? 'cpu' : 'manual'; render(); },
  pickFav(d) { syncCust(); const f = S.cdraft.favs; if (f.includes(d.v)) f.splice(f.indexOf(d.v), 1); else { f.push(d.v); if (f.length > 2) f.shift(); } render(); },
  pickHunt() { syncCust(); S.cdraft.hunt = !S.cdraft.hunt; render(); },
  modeSwap() { syncCust(); askPin(() => { S.cdraft.mode = S.cdraft.mode === 'cpu' ? 'manual' : 'cpu'; render(); }); },
  cancelCust() { setView('custs'); },
  pickCm(d) { syncCust(); S.cdraft.mascot = d.k; render(); },
  pickHat(d) { syncCust(); S.cdraft.hat = d.v; render(); },
  pickBg(d) { syncCust(); S.cdraft.color = d.v; render(); },
  pickPers(d) { syncCust(); S.cdraft.pers = d.v; render(); },
  async saveCust() {
    syncCust();
    const d = S.cdraft, name = d.name.trim();
    if (!name) { toast(t('nameReq'), '⚠️'); sfx.err(); return; }
    const old = d.id ? S.customers.find(x => x.id === d.id) : null;
    if (d.mode === 'cpu' && !(old && old.mode === 'cpu') && cpuCusts().length >= cpuLv().max) { toast(t('cpuMax', { n: cpuLv().max }), '✋'); sfx.err(); return; }
    const rec = Object.assign(old || { id: uid(), pid: S.cur.id, budget: null, day: '', orders: 0, spent: 0, created: Date.now() }, { name, mascot: d.mascot, hat: d.hat, color: d.color, pers: d.pers, mode: d.mode === 'cpu' ? 'cpu' : 'manual', favs: (d.favs || []).slice(0, 2), hunt: !!d.hunt });
    if (old && old.pers !== d.pers) rec.day = '';   // refill with the new personality's wallet
    await DB.put('customers', rec);
    if (!old) { S.customers.push(rec); S.cur.st.custs++; checkBadges(); await saveP(); }
    await refill(); sfx.coin(); setView('custs'); toast(t('saved'), '✅');
  },
  delCust() {
    const id = S.cdraft.id;
    confirmBox('confirmDelete', 'yes', async () => {
      await DB.del('customers', id); S.customers = S.customers.filter(c => c.id !== id); setView('custs');
    }, null, true);
  },

  /* the storefront */
  shopAs(d) {
    const rc = S.customers.find(c => c.id === d.id);
    if (isCpu(rc)) { sheet(cpuInfoHtml(rc)); return; }
    if (!S.cur.open) { toast(t('closedMsg'), '⚠️'); sfx.err(); return; }
    if (!S.products.length) { toast(t('noItems'), '⚠️'); sfx.err(); return; }
    if (!S.products.some(x => x.qty > 0)) { toast(t('allSold'), '⚠️'); sfx.err(); return; }
    const sc = S.customers.find(c => c.id === d.id);
    if (!canShop(sc)) { toast(t('noMoney', { n: sc.name }), '⚠️'); sfx.err(); return; }
    S.shopper = sc; S.cart = []; S.coupon = null; S.cpnErr = ''; S.q = ''; S.cat = 'all';
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
    if (!x || have >= x.qty) { toast(t('noMore'), '⚠️'); sfx.err(); return; }
    if (l) l.qty++; else S.cart.push({ id: d.id, qty: 1 });
    sfx.pop();
    if (d.close) closeSheet();
    updateStore();
    const nb = $('#cbtn'); if (nb) { nb.classList.remove('bump'); void nb.offsetWidth; nb.classList.add('bump'); }
  },
  cart() { S.cpnErr = ''; if (paneOn()) { closeSheet(); refreshCart(); S.cartOpen = false; } else { S.cartOpen = true; sheet(cartHtml()); } },
  qtyPlus(d) { ACT.addCart({ id: d.id }); refreshCart(); },
  qtyMinus(d) {
    const l = S.cart.find(q => q.id === d.id); if (!l) return;
    l.qty--; if (l.qty < 1) S.cart = S.cart.filter(q => q.id !== d.id);
    sfx.tick(); updateStore(); refreshCart();
  },
  applyCoupon() {
    if (!feat(S.cur, 'coupons')) return;
    const v = ($('#cpn').value || '').trim().toUpperCase(), c = S.cur.coupons.find(x => x.code === v);
    if (c) { S.coupon = c; S.cpnErr = ''; sfx.coin(); } else { S.coupon = null; S.cpnErr = v ? t('badCoupon') : ''; if (v) sfx.err(); }
    updateStore(); refreshCart();
  },
  checkout() {
    const T = cartTotals(), c = S.shopper, p = S.cur;
    if (!T.count) return;
    S.cartOpen = false;
    if (T.total > c.budget) {                    // the customer's budget is hidden: they just say it is too much
      sfx.err();
      sheet('<div class="center">' + avatar(c.mascot, 80, c.hat, c.color) + '<h2>' + t('cantAfford', { n: esc(c.name) }) + '</h2><p class="muted">' + t('cantHint') + '</p><button class="btn big" data-act="cart">' + ic('cart') + ' ' + t('yourCart') + '</button></div>');
      return;
    }
    const trivial = T.ls.length === 1 && T.count === 1 && !T.pct && !T.fee;
    const stages = [];
    if (feat(p, 'sum') && !trivial) stages.push('sum');
    stages.push(feat(p, 'change') ? 'change' : 'auto');
    if (feat(p, 'profitQ')) stages.push('profit');
    S.pay = { stages, hard: feat(p, 'pct'), sub: T.sub, total: T.total, disc: T.disc, pct: T.pct, fee: T.fee, cost: T.cost, bill: niceUp(T.total), ok: 0, asked: 0, res: [] };
    enterStage(0);
  },
  ansCheck() {
    const P = S.pay, v = parseNum(($('#ans') || {}).value);
    if (isNaN(v)) return;
    if (Math.abs(v - P.target) <= minUnit() + 1e-9) {     // within one smallest coin: kids who skip the rounding are right too
      sfx.star(); P.ok++; P.asked++; P.res.push(1); qrec(S.cur, P.inv ? 'invoice' : P.stage, 1);
      if (P.stage === 'change') P.chg = 1;
      if (Math.abs(v - P.target) > 0.004) toast(t('roundedOk', { n: fmt(P.target) }), '🔄');
      return nextStage();
    }
    P.tries++; sfx.err();
    if (P.tries >= 2) { P.reveal = true; P.asked++; P.res.push(0); P.err = ''; qrec(S.cur, P.inv ? 'invoice' : P.stage, 0); } else P.err = t('tryAgain');
    sheet(payHtml()); focusSoon('#ans');
  },
  ansSkip() { const P = S.pay; if (P.reveal) return; P.reveal = true; P.asked++; P.res.push(0); qrec(S.cur, P.inv ? 'invoice' : P.stage, 0); sheet(payHtml()); },
  ansNext() { return nextStage(); },

  /* orders */
  orders() { S.day = today(); setView('orders'); },
  dayPrev() { S.day = addDays(S.day || today(), -1); render(); },
  dayNext() { const n = addDays(S.day || today(), 1); if (n <= today()) { S.day = n; render(); } },
  pickDay(d) { S.day = d.v; render(); },
  order(d) {
    const o = S.orders.find(x => x.id === d.id); if (!o) return;
    if (o.src === 'cpu' && !o.seen) { o.seen = true; DB.put('orders', o).catch(failToast); render(); }
    sheet(orderHtml(o));
  },
  report() { sheet(reportHtml()); },
  awayOrders() { closeSheet(); ACT.orders(); },
  missedList(d) { sheet(missedHtml(d.v)); },
  planStart(d) { newPlan(S.products.find(x => x.id === d.id)); sheet(planHtml()); focusSoon('#plans'); },
  planCheck() {
    const P = S.plan, i = $('#plans'), p = S.cur;
    if (!P || P.done || !i) return;
    const v = parseNum(i.value); if (isNaN(v)) return;
    P.tries++;
    if (Math.abs(v - P.ans) < 0.5) { P.done = true; P.ok = true; sfx.star(); p.st.math++; p.st.mq++; qrec(p, 'plan', 1); addXp(4); track('math', 1); }
    else if (P.tries >= 2) { P.done = true; sfx.err(); p.st.mq++; qrec(p, 'plan', 0); }
    else { P.err = t('tryAgain'); sfx.err(); }
    if (P.done) { checkBadges(); saveP(); }
    sheet(planHtml()); if (!P.done) focusSoon('#plans');
  },
  async advance(d) {
    const o = S.orders.find(x => x.id === d.id);
    if (!o || o.status === 'delivered') return;
    if (o.src === 'cpu' && o.status === 'ordered' && !o.chk && feat(S.cur, 'invoice')) { startInvoice(o); return; }   // Tycoon checks the invoice first
    o.status = ST[ST.indexOf(o.status) + 1];
    let hon = false;
    if (o.status === 'delivered') { deliver(o); complaintCheck(o); hon = honestyCheck(o); }
    try { await commit(['orders', 'profiles'], os => { os.orders.put(o); os.profiles.put(S.cur); }); }
    catch (e) { failToast(e); closeSheet(); await reloadCur(); render(); return; }
    if (o.status === 'delivered') { sfx.bell(); toast('⭐ ' + o.review.stars + '/5' + (o.tip ? ' · ' + iso('+' + money(o.tip, o.cur)) : '')); } else sfx.whoosh();
    sheet(hon ? honestyHtml(o) : orderHtml(o)); render();
  },

  /* jars, cash book, honesty, complaints, quests, plans */
  jars() { sheet(jarsHtml()); },
  async setSplit(d) {
    const p = S.cur, s = Object.assign({}, p.split, { [d.k]: parseInt(d.v, 10) || 0 });
    if (s.save + s.share > 70) { toast(t('splitMax'), '✋'); sfx.err(); return; }      // at least 30% stays for spending
    p.split = s; sfx.pop(); await saveP(); sheet(jarsHtml());
  },
  giveOpen() { sheet(giveHtml()); },
  async giveTo(d) {
    const p = S.cur, amt = p.jars.share; if (!(amt > 0)) return;
    jarMove(p, 'share', 'given', amt, 'give'); p.st.given++; track('give', 1); addXp(10); checkBadges();
    try { await saveP(); } catch (e) { failToast(e); await reloadCur(); closeSheet(); render(); return; }
    sfx.star(); toast(t('gaveTo', { n: money(amt), c: t('cause_' + d.v) }), CAUSES.find(c => c[0] === d.v)[1]); sheet(jarsHtml()); render();
  },
  unsave() {
    const p = S.cur;
    confirmBox('unsaveQ', 'unsave', async () => { jarMove(p, 'save', 'cash', p.jars.save, 'unsave'); await saveP(); render(); toast(t('unsaved'), '🐷'); }, t('unsaveHint'));
  },
  async ledger() { sheet('<p class="center muted">…</p>'); sheet(await ledgerHtml()); },
  async honBack(d) {
    const o = S.orders.find(x => x.id === d.id), p = S.cur; if (!o || !o.hon || o.hon.done) return;
    o.hon.done = 'back'; p.st.honest++; p.rr = Math.min(5, round1((p.rr || 4) + 0.1)); addXp(10); checkBadges();
    try { await commit(['orders', 'profiles'], os => { os.orders.put(o); os.profiles.put(p); }); } catch (e) { failToast(e); await reloadCur(); }
    sfx.star(); toast(t('honBackMsg', { n: o.cname }), '🤝'); sheet(orderHtml(o)); render();
  },
  async honKeep(d) {
    const o = S.orders.find(x => x.id === d.id), p = S.cur; if (!o || !o.hon || o.hon.done) return;
    o.hon.done = 'kept'; p.st.kept++; earn(p, conv(o.hon.amt, o.cur, curCode()), 'keep'); p.rr = Math.max(1, round1((p.rr || 4) - 0.3));
    try { await commit(['orders', 'profiles'], os => { os.orders.put(o); os.profiles.put(p); }); } catch (e) { failToast(e); await reloadCur(); }
    sfx.err(); toast(t('honKeepMsg', { n: o.cname }), '😕'); sheet(orderHtml(o)); render();
  },
  async cmpDo(d) {
    const o = S.orders.find(x => x.id === d.id), p = S.cur; if (!o || !o.cmp || o.cmp.done) return;
    let x = null;
    if (d.v === 'replace') {
      x = S.products.find(y => o.items.some(i => i.id === y.id) && y.qty > 0);
      if (!x) { toast(t('cmpNoStock'), '📦'); sfx.err(); return; }
      x.qty--; p.rr = Math.min(5, round1((p.rr || 4) + 0.2));
    } else if (d.v === 'refund') {
      const a = conv(o.items[0] ? o.items[0].unit : o.total, o.cur, curCode());
      if (p.cash < a) { toast(t('notEnough'), '⚠️'); sfx.err(); return; }
      pay(p, a, 'refund'); p.rr = Math.min(5, round1((p.rr || 4) + 0.15));
    } else p.rr = Math.min(5, round1((p.rr || 4) + (o.cmp.why === 'late' ? 0.1 : 0.05)));
    o.cmp.done = d.v; p.st.cmp++; addXp(5); checkBadges();
    try { await commit(['orders', 'profiles', 'products'], os => { os.orders.put(o); os.profiles.put(p); if (x) os.products.put(x); }); }
    catch (e) { failToast(e); closeSheet(); await reloadCur(); render(); return; }
    sfx.coin(); sheet(orderHtml(o)); render();
  },
  async questStart(d) { const p = S.cur, q = QUESTS.find(x => x.id === d.id); if (!q || p.quest) return; p.quest = { id: q.id, start: today(), end: addDays(today(), q.days - 1), prog: {}, done: false }; sfx.whoosh(); await saveP(); render(); },
  async questClaim() {
    const p = S.cur, Q = p.quest, q = Q && QUESTS.find(x => x.id === Q.id); if (!Q || !Q.done) return;
    earn(p, lp(q.r), 'quest'); addXp(20); p.st.quests++; p.quest = null; checkBadges();
    await saveP(); sfx.cha(); toast(iso('+' + money(lp(q.r))), '🗺️'); render();
  },
  async questDrop() { S.cur.quest = null; await saveP(); render(); },
  async discPick(d) {
    const p = S.cur, x = S.products.find(y => y.id === d.id), v = parseInt(d.v, 10) || 0;
    p.ddDay = today();
    if (x && v) { x.disc = v; x.dd = { day: today(), pct: v }; await commit(['products', 'profiles'], os => { os.products.put(x); os.profiles.put(p); }); await rebudget(); sfx.coin(); }
    else await saveP();
    render();
  },
  async dplanSet() {
    const v = parseInt(normDigits(($('#dplan') || {}).value), 10);
    if (!(v >= 0) || v > 999) { toast(t('dplanBad'), '⚠️'); sfx.err(); return; }
    S.cur.plan = { day: today(), n: v, rev: false }; sfx.pop(); await saveP(); render();
  },
  async dplanOk() {
    const p = S.cur, P = p.plan; if (!P || P.rev) return;
    const s = soldOn(P.day), good = Math.abs(s - P.n) <= Math.max(1, Math.round(P.n * 0.2));
    P.rev = true; p.st.plans++; if (good) addXp(10);
    await saveP(); render();
  },
  skillsSheet(d) { sheet(skillsHtml(S.profiles.find(x => x.id === d.id))); },

  /* goals, decor, deals */
  goals() { S.gtab = 'missions'; setView('goals'); },
  gtab(d) { S.gtab = d.v; render(); },
  async claim(d) {
    const p = S.cur, m = ensureMissions(p).list.find(x => x.id === d.id), def = MISSIONS.find(x => x.id === d.id);
    if (!m || m.claimed || m.prog < def.goal) return;
    m.claimed = true; earn(p, lp(def.r), 'mission'); addXp(5);
    sfx.coin(); checkBadges(); await saveP(); render(); toast(iso('+' + money(lp(def.r))), '🪙');
  },
  decor() { sheet(decorHtml()); },
  async buyDecor(d) {
    const x = DECOR.find(q => q.id === d.id), p = S.cur;
    const price = lp(x.p);
    if (p.owned.includes(x.id)) return;
    if (p.cash < price) { toast(t('notEnough'), '⚠️'); sfx.err(); return; }
    pay(p, price, 'decor'); p.owned.push(x.id); p.eq[x.slot] = x.id; p.st.decor++;
    sfx.cha(); checkBadges(); await saveP(); sheet(decorHtml()); render();
  },
  async equip(d) {
    const x = DECOR.find(q => q.id === d.id), p = S.cur;
    if (p.eq[x.slot] === x.id) delete p.eq[x.slot]; else p.eq[x.slot] = x.id;
    sfx.pop(); await saveP(); sheet(decorHtml()); render();
  },
  async wall() { S.cur.wall = S.cur.wall === false; applySkin(); sfx.pop(); await saveP(); sheet(decorHtml()); render(); },
  async awn(d) { S.cur.awn = d.v || ''; sfx.pop(); await saveP(); sheet(decorHtml()); render(); },
  async skin(d) {
    const p = S.cur, s = SKINS.find(x => x[0] === d.v);
    if (level(p) < s[1]) { toast(t('lockedLevel', { n: s[1] }), '⚠️'); sfx.err(); return; }
    p.skin = d.v; applySkin(); sfx.star(); await saveP(); sheet(decorHtml()); render();
  },
  deals() { S.ncode = ''; sheet(dealsHtml()); },
  npct(d) { const i = $('#ncode'); if (i) S.ncode = i.value; S.npct = parseInt(d.v, 10); sheet(dealsHtml()); },
  async addCoupon() {
    const code = ($('#ncode').value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''), p = S.cur;
    S.ncode = code;
    if (code.length < 3) { toast(t('codeShort'), '⚠️'); sfx.err(); return; }
    if (p.coupons.length >= 5) { toast(t('maxCoupons'), '⚠️'); sfx.err(); return; }
    p.coupons = p.coupons.filter(c => c.code !== code); p.coupons.push({ code, pct: S.npct });
    S.ncode = ''; sfx.coin(); await saveP(); sheet(dealsHtml());
  },
  async delCoupon(d) { S.cur.coupons = S.cur.coupons.filter(c => c.code !== d.code); await saveP(); sheet(dealsHtml()); }
};

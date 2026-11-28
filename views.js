'use strict';
/* MyShop views: functions that return HTML for each screen and sheet. */
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

const lvlGrid = (cur, act, id) => '<div class="lvls">' + LEVELS.map(k => '<button class="' + (cur === k ? 'sel' : '') + '" data-act="' + act + '" data-v="' + k + '"' + (id ? ' data-id="' + id + '"' : '') + '>' + t('lvl_' + k) + '<small>' + t('lvlAge_' + k) + '</small></button>').join('') + '</div>';
function pformView() {
  const d = S.draft;
  return head(d.id ? t('customize') : t('addProfile'), null, 'cancelForm') +
    '<div class="hero">' + mas(d.mascot, 96) + '</div>' +
    '<label>' + t('name') + '<input id="f_name" class="inp" maxlength="20" value="' + esc(d.name) + '"></label>' +
    '<label>' + t('shopName') + '<input id="f_shop" class="inp" maxlength="28" value="' + esc(d.shopName) + '"></label>' +
    (d.id ? '' : '<label>' + t('lvlPick') + '</label>' + lvlGrid(d.lvl || 'explorer', 'pickLvl', '')) +
    '<label>' + t('chooseBuddy') + '</label><div class="mgrid">' + MASCOTS.map(k => '<button class="mc ' + (d.mascot === k ? 'sel' : '') + '" data-act="pickMascot" data-k="' + k + '">' + mas(k, 52) + '</button>').join('') + '</div>' +
    '<label>' + t('theme') + '</label><div class="seg"><button class="' + (d.theme === 'dark' ? 'sel' : '') + '" data-act="pickTheme" data-v="dark">' + ic('moon', 16) + ' ' + t('dark') + '</button><button class="' + (d.theme === 'cream' ? 'sel' : '') + '" data-act="pickTheme" data-v="cream">' + ic('sun', 16) + ' ' + t('cream') + '</button></div>' +
    '<label>' + t('color') + '</label><div class="sw">' + ACCENTS.map(c => '<button class="' + (d.accent === c ? 'sel' : '') + '" style="background:' + c + '" data-act="pickAccent" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' +
    '<label>' + t('currency') + '<select id="f_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (d.currency === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label>' +
    '<button class="btn big" data-act="saveProfile">' + ic('check') + ' ' + t('save') + '</button>';
}

/* ----- the seller's shop ----- */
function priceTag(x) {
  const d = x.disc || 0;
  return (d ? '<s class="old">' + fmt(x.pr) + '</s>' : '') + '<span class="tag">' + fmt(unitLocal(x)) + '</span>';
}
function productCard(x) {
  const out = x.qty < 1, d = x.disc || 0, low = !out && x.qty <= 2 && feat(S.cur, 'lowstock');
  return '<button class="prod" data-act="prod" data-id="' + x.id + '"><div class="pimg">' + imgOrPh(x) +
    (d ? '<span class="off">' + bdi('-' + d + '%') + '</span>' : '') +
    (out ? '<span class="so">' + t('soldOut') + '</span>' : '<span class="qty' + (low ? ' low' : '') + '">' + (low ? '⚠️ ' : '') + bdi('×' + x.qty) + '</span>') +
    '</div><div class="pname">' + catEmoji(x.cat) + ' ' + esc(x.name) + '</div><div class="prices">' + priceTag(x) + '</div></button>';
}

const restockCost = x => Math.max(minUnit(), rnd(costOf(x) * RESTOCK_N));   // uses the locked cost: changing the price never changes it
function sceneHtml(p) {
  const signEq = p.eq.sign, items = SLOTS.filter(s => s !== 'sign' && p.eq[s]).map(s => (DECOR.find(d => d.id === p.eq[s]) || {}).e).filter(Boolean);
  return '<div class="shopwrap" data-skin="' + p.skin + '"' + (p.awn ? ' style="--a1:' + p.awn + '"' : '') + '><div class="awning"></div><div class="scene"><h1 class="shoptitle ' + (signEq || '') + '">' + esc(p.shopName) + '</h1>' +
    '<div class="decor">' + (items.length ? items.map((e, i) => '<span class="dec d' + (i % 3) + '">' + e + '</span>').join('') : '<span class="muted small">' + t('decorHint') + '</span>') + '</div></div></div>';
}

function shopView() {
  const p = S.cur, pr = (p.xp % XPL) * (100 / XPL), open = p.open !== false;
  const rating = p.st.rcount ? (p.st.rsum / p.st.rcount).toFixed(1) : '–';
  const todo = S.orders.filter(o => o.status !== 'delivered').length + S.orders.filter(o => o.cmp && !o.cmp.done).length;
  const unseen = S.orders.some(o => o.src === 'cpu' && !o.seen);
  const low = feat(p, 'lowstock') ? S.products.filter(x => x.qty > 0 && x.qty <= 2).length : 0;
  const ev = todayEvent(p);
  const tool = (act, icn, label, badge, dot) => '<button class="tool" data-act="' + act + '">' + (icn.length > 2 && ICONS[icn] ? ic(icn, 24) : '<i class="te">' + icn + '</i>') + '<span>' + label + '</span>' + (badge ? '<i class="nb' + (dot ? ' pulse' : '') + '">' + badge + '</i>' : '') + '</button>';
  return '<header class="top"><button class="ibtn" data-act="back" aria-label="' + t('back') + '">' + back() + '</button>' +
    '<div class="me">' + mas(p.mascot, 34) + '<b>' + esc(p.name) + '</b></div>' +
    '<div class="row">' + (feat(p, 'pic') ? '<button class="ibtn" data-act="msgLog" aria-label="' + t('msgLog') + '">🔔</button>' : '') + '<button class="ibtn" data-act="sound" aria-label="' + t('sound') + '">' + ic(S.sound ? 'volume' : 'mute') + '</button>' +
    '<button class="ibtn" data-act="customize" aria-label="' + t('customize') + '">' + ic('sliders') + '</button></div></header>' +
    '<div class="stats"><span class="pill lv">' + ic('star', 15) + ' ' + t('level', { n: level(p) }) + '</span>' +
    '<button class="pill gold" id="cash" data-act="orders" aria-label="' + t('dailySales') + '">' + ic('coin', 15) + ' ' + money(p.cash) + '</button>' +
    '<span class="pill">⭐ ' + rating + '</span>' +
    '<button class="opensign ' + (open ? 'open' : 'closed') + '" data-act="toggleOpen">' + (open ? t('open') : t('closed')) + '</button></div>' +
    '<div class="xp"><i style="width:' + pr + '%"></i></div>' + sceneHtml(p) +
    '<div class="tools">' + tool('custs', 'users', t('customers')) + tool('orders', 'truck', t('orders'), todo || (unseen ? '•' : ''), unseen) + tool('goals', 'target', t('goals')) + tool('decor', 'palette', t('decor')) + (feat(p, 'coupons') ? tool('deals', 'tag', t('deals')) : '') + (feat(p, 'exch') ? tool('exch', 'coin', t('exchange')) : '') + (feat(p, 'jars') ? tool('jars', '🫙', t('jars')) : '') + (feat(p, 'ledger') ? tool('ledger', '📒', t('ledger')) : '') + '</div>' +
    (ev ? '<div class="evt">' + ev.e + ' ' + t('ev_' + ev.id) + '</div>' : '') + goalHtml(p) + shopCards(p) +
    (low ? '<p class="lowline">⚠️ ' + t('lowStock', { n: low }) + '</p>' : '') +
    (S.products.length ? '<div class="shelf">' + S.products.map(productCard).join('') + '</div>' : '<div class="empty">' + ic('box', 48) + '<p>' + t('emptyShop') + '</p></div>') +
    '<div class="dock"><button class="btn ghost" data-act="custs">' + ic('users') + ' ' + t('customers') + '</button><button class="btn" data-act="addItem">' + ic('plus') + ' ' + t('addItem') + '</button></div>';
}

function goalHtml(p) {
  if (!feat(p, 'goal')) return '';
  const g = p.goal;
  if (!g) return '<button class="goalc" style="width:100%;color:var(--text);font-weight:800;cursor:pointer" data-act="goalSet">🎯 ' + t('goalSet') + '</button>';
  const base = goalBase(p), pc = Math.min(100, Math.round(base / g.amt * 100));
  return '<div class="goalc"><div class="row" style="margin:0"><b style="flex:1">' + (g.done ? '🏆 ' : '🎯 ') + esc(g.name) + '</b><span class="muted small">' + (feat(p, 'jars') ? '🐷 ' : '') + fmt(Math.min(base, g.amt)) + ' / ' + fmt(g.amt) + '</span></div>' +
    '<div class="xp"><i style="width:' + pc + '%"></i></div>' + (g.done ? '<button class="btn sm" style="margin-top:8px" data-act="goalSet">' + t('goalNew') + '</button>' : '') + '</div>';
}
/* price meter: how the typed price feels to customers, compared with the hidden market price of the category */
function draftUnit(d) {
  const price = parseNum(d.price);
  if (!(price > 0)) return null;
  return rnd(conv(price, d.cur || curCode(), curCode()) * (1 - (d.disc || 0) / 100));
}
function meterHtml(d) {
  const u = draftUnit(d);
  if (u == null) return '<div class="pmeter" id="pmeter"><i>🏷️</i><span class="muted">' + t('pmEmpty') + '</span></div>';
  const r = u / mktOf(d.cat || 'other'), k = r < 0.8 ? 'cheap' : r <= 1.25 ? 'fair' : 'pricey';
  return '<div class="pmeter ' + k + '" id="pmeter" role="status"><i>' + { cheap: '😀', fair: '🙂', pricey: '😬' }[k] + '</i><span><b>' + t('pm_' + k) + '</b><small>' + t('pmd_' + k) + '</small></span></div>';
}
function stockHtml(d) {          // Merchant and Tycoon: what the first stock costs (half the price for each item)
  if (d.id || !feat(S.cur, 'profit')) return '';
  const price = parseNum(d.price), q = Math.max(1, Math.min(99, parseInt(normDigits(d.qty), 10) || 1));
  if (!(price > 0)) return '<p class="muted small" id="stockln">' + t('stockHint') + '</p>';
  const c = newCost(conv(price, d.cur || curCode(), curCode())), tot = rnd(c * q);
  return '<p class="small" id="stockln" style="color:' + (tot > S.cur.cash ? '#F87171' : 'inherit') + '">📦 ' + t('stockPay', { q: bdi('×' + q), c: fmt(c), t: fmt(tot), m: fmt(S.cur.cash) }) + '</p>';
}
function updItemLive() {         // refresh the meter and the stock line while the kid types (no full render, so the keyboard stays open)
  syncItem();
  const m = $('#pmeter'); if (m) m.outerHTML = meterHtml(S.idraft);
  const s = $('#stockln'); if (s) s.outerHTML = stockHtml(S.idraft);
}
function itemView() {
  const d = S.idraft, cur = d.cur || S.cur.currency, edit = !!d.id;
  return head(edit ? t('editItem') : t('addItem'), null, 'cancelItem') +
    '<div class="photo">' + (d.img ? '<img src="' + esc(d.img) + '" alt="">' : ic('camera', 44)) + '</div>' +
    '<div class="row two"><label class="btn" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fcam" accept="image/*" capture="environment" hidden>' + ic('camera') + ' ' + t('takePhoto') + '</label>' +
    '<label class="btn blue" style="margin:0;color:#fff;font-size:16px"><input type="file" id="fup" accept="image/*" hidden>' + ic('upload') + ' ' + t('upload') + '</label></div>' +
    '<label>' + t('itemName') + '<input id="i_name" class="inp" maxlength="40" value="' + esc(d.name) + '"></label>' +
    '<div class="row two"><label>' + t('price') + '<input id="i_price" class="inp" inputmode="decimal" autocomplete="off" value="' + esc(d.price == null ? '' : d.price) + '"></label>' +
    '<label>' + t('currency') + '<select id="i_cur" class="inp">' + CURRENCIES.map(c => '<option ' + (cur === c ? 'selected' : '') + '>' + c + '</option>').join('') + '</select></label></div>' +
    meterHtml(d) + (!feat(S.cur, 'sum') ? '<button class="btn ghost big" style="margin-top:8px" data-act="suggestPrice">💡 ' + t('suggest') + ' · ' + fmt(mktOf(d.cat || 'other')) + '</button>' : '') +
    '<label>' + t('category') + '</label><div class="chips wrap">' + CATS.map(c => '<button class="chip ' + (d.cat === c[0] ? 'sel' : '') + '" data-act="pickCat" data-v="' + c[0] + '">' + c[1] + ' ' + t('cat_' + c[0]) + '</button>').join('') + '</div>' +
    '<label>' + t('discount') + '</label><div class="seg wrap">' + DISCS.map(n => '<button class="' + (d.disc === n ? 'sel' : '') + '" data-act="pickDisc" data-v="' + n + '">' + (n ? bdi('-' + n + '%') : t('none')) + '</button>').join('') + '</div>' +
    (edit ? '<p class="muted small">' + t('inStock', { n: d.qty }) + ' · ' + t('restockHint') + '</p>' +
      (feat(S.cur, 'profit') ? '<p class="muted small">🔒 ' + t('costLocked', { c: fmt(costOf(S.products.find(x => x.id === d.id) || { pr: 0 })) }) + '</p>' : '') :
      '<label>' + t('quantity') + '<input id="i_qty" class="inp" type="number" inputmode="numeric" min="1" max="99" value="' + esc(d.qty) + '"></label>' + stockHtml(d)) +
    '<button class="btn big" data-act="saveItem">' + ic('check') + ' ' + t('save') + '</button>';
}

/* ----- customers ----- */
function custsView() {
  const cards = S.customers.map(c => '<div class="ccard"><button class="pcard" data-act="shopAs" data-id="' + c.id + '">' + avatar(c.mascot, 72, c.hat, c.color) + '<b>' + esc(c.name) + '</b>' +
    (isCpu(c) ? '<span class="pill mood">🤖 ' + t('mode_cpu') + '</span>' : '<span class="pill mood">' + mood(c) + ' ' + t(canShop(c) ? 'moodOk' : 'moodNo') + '</span>') + '<small>' + t('pers_' + c.pers) + '</small></button>' +
    '<button class="ibtn ed" data-act="editCust" data-id="' + c.id + '" aria-label="' + t('edit') + '">' + ic('edit', 16) + '</button></div>').join('');
  return head(t('customers'), null, 'toShop') + '<p class="muted small" style="margin-top:0">' + t('custHint') + '</p><div class="cgrid">' + cards +
    '<button class="pcard add" data-act="newCust">' + ic('plus', 34) + '<b>' + t('newCustomer') + '</b></button></div>';
}
function modeHtml(d) {             // manual or robot: chosen when the customer is made; later only parents can change it
  if (!feat(S.cur, 'cpu') && d.mode !== 'cpu') return '';
  const seg = d.id ? '<div class="row"><span class="pill">' + (d.mode === 'cpu' ? '🤖 ' + t('mode_cpu') : '🧑 ' + t('mode_manual')) + '</span><button class="btn ghost sm" style="width:auto;margin:0" data-act="modeSwap">🔒 ' + t('modeParent') + '</button></div>' :
    '<div class="seg"><button class="' + (d.mode !== 'cpu' ? 'sel' : '') + '" data-act="pickMode" data-v="manual">🧑 ' + t('mode_manual') + '</button><button class="' + (d.mode === 'cpu' ? 'sel' : '') + '" data-act="pickMode" data-v="cpu">🤖 ' + t('mode_cpu') + '</button></div>';
  return '<label>' + t('custMode') + '</label>' + seg + '<p class="muted small">' + t('moded_' + (d.mode === 'cpu' ? 'cpu' : 'manual')) + '</p>' +
    (d.mode === 'cpu' ? '<label>' + t('favCats') + '</label><div class="chips wrap">' + CATS.map(c => '<button class="chip ' + (d.favs.includes(c[0]) ? 'sel' : '') + '" data-act="pickFav" data-v="' + c[0] + '">' + c[1] + ' ' + t('cat_' + c[0]) + '</button>').join('') + '</div>' +
      '<div class="chips wrap" style="margin-top:8px"><button class="chip ' + (d.hunt ? 'sel' : '') + '" data-act="pickHunt">🏷️ ' + t('hunt') + ' · ' + t(d.hunt ? 'on' : 'off') + '</button></div><p class="muted small">' + t('huntd') + '</p>' : '');
}
function cformView() {
  const d = S.cdraft;
  return head(d.id ? t('editCustomer') : t('newCustomer'), null, 'cancelCust') +
    '<div class="hero">' + avatar(d.mascot, 100, d.hat, d.color) + '</div>' +
    '<label>' + t('name') + '<input id="c_name" class="inp" maxlength="16" value="' + esc(d.name) + '"></label>' + modeHtml(d) +
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
      (d ? '<span class="off">' + bdi('-' + d + '%') + '</span>' : '') +
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
    '<div class="row"><span class="pill mood" id="wallet">' + mood(c) + '</span><button class="ibtn" id="cbtn" data-act="cart" aria-label="' + t('yourCart') + '">' + ic('cart') + cartBadge(T.count) + '</button></div></header>' +
    '<h1 class="shoptitle" style="margin-top:0">' + esc(p.shopName) + '</h1>' +
    '<div class="search">' + ic('search', 18) + '<input id="q" class="inp" placeholder="' + t('search') + '" value="' + esc(S.q) + '"></div>' +
    '<div class="chips"><button class="chip ' + (S.cat === 'all' ? 'sel' : '') + '" data-act="setCat" data-v="all">' + t('all') + '</button><button class="chip ' + (S.cat === 'fav' ? 'sel' : '') + '" data-act="setCat" data-v="fav">♥ ' + t('favorites') + '</button>' +
    CATS.map(x => '<button class="chip ' + (S.cat === x[0] ? 'sel' : '') + '" data-act="setCat" data-v="' + x[0] + '">' + x[1] + ' ' + t('cat_' + x[0]) + '</button>').join('') + '</div>' +
    '<div class="storecols"><div class="shelf" id="grid">' + storeGrid() + '</div><aside id="cartpane">' + (isWide() ? cartHtml() : '') + '</aside></div>' + cartBar();
}
const isWide = () => window.matchMedia && matchMedia('(min-width:1000px)').matches;
const paneOn = () => !!$('#cartpane') && isWide();
let wasWide = isWide();
window.addEventListener('resize', () => { const w = isWide(); if (w !== wasWide) { wasWide = w; if (S.view === 'store' && !$('#ov')) render(); else if (S.view === 'store') { closeSheet(); render(); } } });
function refreshCart() {                      // the cart lives in the side panel on wide screens, in a sheet otherwise
  const a = $('#cartpane');
  if (a) a.innerHTML = isWide() ? cartHtml() : '';
  if (!paneOn() && $('#ov') && S.cartOpen) sheet(cartHtml());
}
function updateStore() {
  const g = $('#grid'), cb = $('#cartbar'), nb = $('#nb'), T = cartTotals();
  if (g) g.innerHTML = storeGrid();
  if (cb) cb.outerHTML = cartBar();
  const pa = $('#cartpane'); if (pa && isWide()) pa.innerHTML = cartHtml();
  if (nb) { nb.textContent = T.count; nb.style.display = T.count ? 'flex' : 'none'; }
}

function cartHtml() {
  const T = cartTotals();
  if (!T.ls.length) return '<h2>' + t('yourCart') + '</h2><div class="empty">' + ic('cart', 44) + '<p>' + t('cartEmpty') + '</p></div><button class="btn big" data-act="closeSheet">' + t('keepShopping') + '</button>';
  const mathOn = feat(S.cur, 'sum');
  return '<h2>' + t('yourCart') + '</h2>' + T.ls.map(l => '<div class="line"><div class="thumb">' + imgOrPh(l.x, 20) + '</div><div class="lt"><b>' + esc(l.x.name) + '</b><span class="muted small">' + fmt(l.unit) + '</span></div>' +
    '<div class="stp"><button class="ibtn" data-act="qtyMinus" data-id="' + l.x.id + '" aria-label="-">' + ic('minus', 16) + '</button><b>' + l.qty + '</b><button class="ibtn" data-act="qtyPlus" data-id="' + l.x.id + '" aria-label="+">' + ic('plus', 16) + '</button></div>' +
    '<b class="lp">' + fmt(rnd(l.unit * l.qty)) + '</b></div>').join('') +
    (feat(S.cur, 'coupons') ? '<div class="row" style="margin-top:12px"><input id="cpn" class="inp" style="flex:1" placeholder="' + t('coupon') + '" value="' + (S.coupon ? esc(S.coupon.code) : '') + '"><button class="btn ghost" style="flex:none" data-act="applyCoupon">' + t('apply') + '</button></div>' : '') +
    (S.cpnErr ? '<p class="err" style="margin:4px 0">' + S.cpnErr + '</p>' : '') +
    (mathOn ? '<p class="center muted" style="margin:12px 0 0">🧮 ' + t('addUpHint') + (T.pct ? ' · ' + t('coupon') + ' ' + bdi('-' + T.pct + '%') : '') + (T.fee ? ' · ' + t('fee') : '') + '</p>' :
      '<div class="tot"><span>' + t('subtotal') + '</span><b>' + fmt(T.sub) + '</b></div>' +
      (T.disc ? '<div class="tot"><span>' + t('coupon') + ' ' + bdi('(-' + T.pct + '%)') + '</span><b>' + sgn('-', T.disc) + '</b></div>' : '') +
      (T.fee ? '<div class="tot"><span>' + t('fee') + '</span><b>' + sgn('+', T.fee) + '</b></div>' : '') +
      '<div class="tot big"><span>' + t('total') + '</span><b>' + fmt(T.total) + '</b></div>') +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('keepShopping') + '</button><button class="btn" data-act="checkout">' + ic(mathOn ? 'target' : 'check') + ' ' + t(mathOn ? 'addUp' : 'checkout') + '</button></div>';
}
const focusSoon = sel => setTimeout(() => { const i = $(sel); if (i) i.focus(); }, 80);
function niceUp(v) {
  for (let e = 1; e <= 1e8; e *= 10) for (const m of [e, 2 * e, 5 * e]) if (m > v) return m;
  return Math.ceil(v) + 1;
}
/* checkout is a short chain of stages: sum (add up), change (or 'auto' = the app shows it), profit (Tycoon) */
function enterStage(i) {
  const P = S.pay; P.i = i; P.stage = P.stages[i]; P.tries = 0; P.reveal = false; P.err = '';
  P.target = P.stage === 'sum' ? (P.hard ? P.total : P.sub) : P.stage === 'change' ? rnd(P.bill - P.total) : P.stage === 'profit' ? rnd(P.total - P.cost) : null;
  P.rounded = P.stage === 'sum' && P.hard && P.pct > 0 && Math.abs(P.sub * P.pct / 100 - P.disc) > 1e-6;   // the coupon amount was rounded to the shop's coins
  sheet(payHtml());
  if (P.stage !== 'auto') focusSoon('#ans');
}
function nextStage() {
  const P = S.pay;
  if (P.i + 1 >= P.stages.length) return P.inv ? finishInvoice() : finishOrder(P.ok, P.asked, P.res, P.chg);
  enterStage(P.i + 1);
}
const payLines = () => S.pay && S.pay.inv ? S.pay.inv.items : cartLines().map(l => ({ name: l.x.name, qty: l.qty, unit: l.unit }));
function payHtml() {
  const P = S.pay, c = S.shopper, st = P.stage;
  const tl = (k, v, cls) => '<div class="tot ' + (cls || '') + '"><span>' + k + '</span><b>' + v + '</b></div>';
  const coupon = P.pct ? tl(t('coupon') + ' ' + bdi('(-' + P.pct + '%)'), '', '') : '';
  if (st === 'auto') {
    return '<h2>' + t('checkout') + '</h2>' + (P.disc ? tl(t('coupon'), sgn('-', P.disc)) : '') + (P.fee ? tl(t('fee'), sgn('+', P.fee)) : '') + tl(t('total'), fmt(P.total), 'big') +
      '<p class="center muted">' + t('customerPays', { n: esc(c.name) }) + '</p><div class="note">' + fmt(P.bill) + '</div>' +
      '<p class="center" style="font-size:18px">' + t('yourChange') + '</p><div class="note ok">' + fmt(rnd(P.bill - P.total)) + '</div>' +
      '<button class="btn big" data-act="ansNext">' + t('next') + '</button>';
  }
  let head2 = '', ctx = '', q = '';
  if (st === 'sum') {
    head2 = P.inv ? '🧾 ' + t('invTitle') : '🧮 ' + t('addUp'); q = P.inv ? t('invQ') : t(P.hard ? 'sumQ2' : 'sumQ');
    ctx = payLines().map(l => '<div class="tot"><span>' + esc(l.name) + ' ' + bdi('×' + l.qty) + ' <small class="muted">(' + fmt(l.unit) + ')</small></span></div>').join('') +
      (P.hard && P.pct ? tl(t('coupon'), bdi('-' + P.pct + '%')) : '') + (P.hard && P.fee ? tl(t('fee'), sgn('+', P.fee)) : '');
  } else if (st === 'change') {
    head2 = t('checkout'); q = t('giveChange');
    ctx = (P.disc ? tl(t('coupon'), sgn('-', P.disc)) : '') + (P.fee ? tl(t('fee'), sgn('+', P.fee)) : '') + tl(t('total'), fmt(P.total), 'big') +
      '<p class="center muted">' + t('customerPays', { n: esc(c.name) }) + '</p><div class="note">' + fmt(P.bill) + '</div>';
  } else {
    head2 = '📈 ' + t('profitQT'); q = t('profitQ');
    ctx = tl(t('soldFor'), fmt(P.total)) + tl(t('itemsCost'), fmt(P.cost));
  }
  return '<h2>' + head2 + '</h2>' + ctx + '<p class="center" style="font-size:18px">' + q + '</p>' + (P.rounded ? '<p class="center muted small">🔄 ' + t('roundedNote', { u: fmt(minUnit()) }) + '</p>' : '') +
    (P.reveal ? '<div class="note ok">' + fmt(P.target) + '</div><button class="btn big" data-act="ansNext">' + t('next') + '</button>' :
      '<input id="ans" class="inp pin" style="letter-spacing:2px" inputmode="decimal" placeholder="?" autocomplete="off"><p class="err">' + (P.err || '') + '</p>' +
      '<div class="row"><button class="btn ghost" data-act="ansSkip">' + t('skip') + '</button><button class="btn" data-act="ansCheck">' + ic('check') + ' ' + t('check') + '</button></div>');
}
function doneHtml(o, math) {   // math = number of correct answers
  return '<div class="center sold"><div class="okwrap"><div class="okbig">' + ic('check', 46) + '</div>' + [-60, -20, 20, 60].map((x, i) => '<span class="coin" style="--dx:' + x + 'px;--d:' + (0.3 + i * 0.1) + 's"></span>').join('') + '</div>' +
    '<h2>' + t('orderPlaced') + '</h2><p class="muted">#' + o.n + ' · ' + fmt(o.total, o.cur) + (math ? ' · ' + bdi('+' + o.xp + ' XP') + ' 🧮' : '') + '</p>' +
    '<p>' + t('thanks', { n: esc(o.cname) }) + '</p><p class="muted small">' + t('thanksSub') + '</p>' +
    '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('keepShopping') + '</button><button class="btn" data-act="toShop">' + ic('shop') + ' ' + t('myShop') + '</button></div></div>';
}

/* ----- orders and daily sales ----- */
function orderRow(o) {
  const wait = o.status !== 'delivered' && Date.now() - o.ts > 864e5;
  return '<button class="orow" data-act="order" data-id="' + o.id + '"><span class="muted">#' + o.n + '</span>' + avatar(o.cmas, 34, o.chat, o.ccol) + '<b class="gr">' + (o.src === 'cpu' ? '🤖 ' : '') + esc(o.cname) +
    (o.src === 'cpu' && !o.seen && o.status !== 'delivered' ? ' <i class="newtag">' + t('newTag') + '</i>' : '') + (wait ? ' <span title="' + t('waitLong') + '">⏰</span>' : '') + (o.cmp && !o.cmp.done ? ' ⚠️' : '') + '</b><span class="st ' + o.status + '">' + t('st_' + o.status) + '</span><b>' + fmt(o.total, o.cur) + '</b></button>';
}
function ordersView() {
  const now = today(), day = S.day || now;
  const dayOrders = S.orders.filter(o => o.day === day);
  const ocost = o => o.cost != null ? o.cost : rnd(o.items.reduce((a, i) => a + rnd(i.unit * 0.5, o.cur) * i.qty, 0), o.cur);
  const profit = dayOrders.reduce((s, o) => s + inCur(o.total - ocost(o), o.cur), 0);
  const rev = dayOrders.reduce((s, o) => s + inCur(o.total, o.cur), 0), items = dayOrders.reduce((s, o) => s + o.items.reduce((a, i) => a + i.qty, 0), 0);
  const days = [0, 1, 2, 3, 4, 5, 6].map(i => addDays(day, i - 6));
  const sums = days.map(k => S.orders.filter(o => o.day === k).reduce((s, o) => s + inCur(o.total, o.cur), 0)), mx = Math.max(...sums, 0.0001);
  const todo = S.orders.filter(o => o.status !== 'delivered').sort((a, b) => a.ts - b.ts);
  const done = dayOrders.filter(o => o.status === 'delivered').sort((a, b) => b.ts - a.ts);
  return head(t('dailySales'), null, 'toShop') +
    '<div class="datenav"><button class="ibtn" data-act="dayPrev" aria-label="' + t('prev') + '"><span class="flip">' + ic('chev-l') + '</span></button><b>' + (day === now ? t('today') + ' · ' : '') + dlabel(day) + '</b><button class="ibtn" data-act="dayNext" aria-label="' + t('next') + '" ' + (day >= now ? 'disabled style="opacity:.35"' : '') + '><span class="flip">' + ic('chev-r') + '</span></button></div>' +
    '<div class="metrics"><div class="metric"><b>' + money(rev) + '</b><span>' + t('revenue') + '</span></div><div class="metric"><b>' + dayOrders.length + '</b><span>' + t('orders') + '</span></div><div class="metric"><b>' + items + '</b><span>' + t('itemsSold') + '</span></div>' + (feat(S.cur, 'profit') ? '<div class="metric"><b style="color:' + (profit < 0 ? '#F87171' : '#4ADE80') + '">' + money(profit) + '</b><span>' + t('profit') + '</span></div>' : '') + '</div>' +
    '<div class="bars">' + days.map((k, i) => '<button class="bar ' + (k === day ? 'sel' : '') + '" data-act="pickDay" data-v="' + k + '"><i style="height:' + Math.max(3, Math.round(sums[i] / mx * 70)) + 'px"></i><span>' + dlabel(k, { weekday: 'narrow' }) + '</span></button>').join('') + '</div>' +
    missedStrip(day) + (feat(S.cur, 'report') ? '<button class="btn ghost big" style="margin-top:10px" data-act="report">📊 ' + t('report') + '</button>' : '') +
    '<h2>' + t('toProcess') + ' (' + todo.length + ')</h2>' + (todo.length ? todo.map(orderRow).join('') : '<p class="muted small">' + t('allDone') + '</p>') +
    '<h2>' + t('delivered') + '</h2>' + (done.length ? done.map(orderRow).join('') : '<p class="muted small">' + t('noOrders') + '</p>');
}
function orderHtml(o) {
  const idx = ST.indexOf(o.status), rv = o.review, inv = o.src === 'cpu' && o.status === 'ordered' && !o.chk && feat(S.cur, 'invoice');
  return '<div class="oh"><h2 style="margin:0">' + t('order') + ' #' + o.n + '</h2><span class="st ' + o.status + '">' + t('st_' + o.status) + '</span></div>' +
    '<div class="who">' + avatar(o.cmas, 40, o.chat, o.ccol) + '<b>' + (o.src === 'cpu' ? '🤖 ' : '') + esc(o.cname) + '</b>' + (o.chk ? '<span class="pill">' + (o.chk === 'ok' ? '🧾 ✓' : '🧾 🔎') + '</span>' : '') + '</div>' +
    '<div class="tl">' + ST.map((s, i) => '<div class="step ' + (i <= idx ? 'on' : '') + '"><span class="dot">' + ic(ST_ICON[s], 18) + '</span><small>' + t('st_' + s) + '</small></div>').join('') + '</div>' +
    o.items.map(i => '<div class="tot"><span>' + esc(i.name) + ' ' + bdi('×' + i.qty) + '</span><b>' + fmt(rnd(i.unit * i.qty, o.cur), o.cur) + '</b></div>').join('') +
    (o.disc ? '<div class="tot"><span>' + esc(o.code) + ' ' + bdi('(-' + o.pct + '%)') + '</span><b>' + sgn('-', o.disc, o.cur) + '</b></div>' : '') +
    (o.fee ? '<div class="tot"><span>' + t('fee') + '</span><b>' + sgn('+', o.fee, o.cur) + '</b></div>' : '') +
    '<div class="tot big"><span>' + t('total') + '</span><b>' + fmt(o.total, o.cur) + '</b></div>' +
    (feat(S.cur, 'profit') && o.cost != null ? '<div class="tot muted"><span>' + t('itemsCost') + '</span><b>' + fmt(o.cost, o.cur) + '</b></div><div class="tot"><span>' + t('profit') + '</span><b>' + fmt(rnd(o.total - o.cost, o.cur), o.cur) + '</b></div>' : '') +
    (rv ? '<div class="review">' + stars(rv.stars) + '<p>“' + (rv.late || rv.stars < 3 ? t('lateRv') : t('rv' + rv.stars + '_' + rv.k)) + '”</p>' + (o.tip ? '<p class="tag">' + sgn('+', o.tip, o.cur) + ' ' + t('tip') + '</p>' : '') + '</div>' : '') +
    cmpHtml(o) +
    (o.status !== 'delivered' ? '<button class="btn big" data-act="advance" data-id="' + o.id + '">' + (inv ? '🧾 ' + t('invTitle') : ic(ST_ICON[ST[idx + 1]]) + ' ' + t('adv_' + o.status)) + '</button>' : '') +
    '<button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ----- goals: missions, badges, ranks ----- */
function goalsView() {
  const p = S.cur, tab = S.gtab;
  let body = '';
  if (tab === 'missions') {
    body = '<p class="muted small">' + t('missionsHint') + '</p>' + ensureMissions(p).list.map(m => {
      const d = MISSIONS.find(x => x.id === m.id), ok = m.prog >= d.goal;
      return '<div class="mis"><div class="row" style="margin:0"><b style="flex:1">' + t('m_' + d.id, { n: d.goal }) + '</b><span class="pill gold">' + ic('coin', 14) + ' ' + money(lp(d.r)) + '</span></div>' +
        '<div class="xp" style="margin:8px 0"><i style="width:' + Math.round(m.prog / d.goal * 100) + '%"></i></div>' +
        '<div class="row" style="margin:0"><span class="muted small" style="flex:1">' + m.prog + ' / ' + d.goal + '</span>' +
        (m.claimed ? '<span class="st delivered">' + t('claimed') + ' ✓</span>' : '<button class="btn sm" style="width:auto;margin:0" data-act="claim" data-id="' + m.id + '"' + (ok ? '' : ' disabled') + '>' + t('claim') + '</button>') + '</div></div>';
    }).join('');
  } else if (tab === 'quests') {
    body = questHtml();
  } else if (tab === 'badges') {
    body = '<div class="bgrid">' + BADGES.map(b => { const on = p.badges.includes(b.id); return '<div class="badge-t ' + (on ? '' : 'lock') + '"><i>' + b.e + '</i><b>' + t('b_' + b.id) + '</b><small class="muted">' + t('bd_' + b.id) + '</small></div>'; }).join('') + '</div>';
  } else {
    const usdv = x => x.st.rev / rateOf(x.currency), rows = S.profiles.slice().sort((a, b) => usdv(b) - usdv(a));
    body = rows.map((x, i) => '<div class="prow"><b style="flex:none;width:26px">' + (['🥇', '🥈', '🥉'][i] || (i + 1)) + '</b>' + mas(x.mascot, 40) + '<div class="gr"><b>' + esc(x.name) + '</b><div class="muted small">' + t('level', { n: level(x) }) + ' · ' + t('sold') + ': ' + x.st.sold + '</div></div><span class="pill gold">' + money(x.st.rev, x.currency) + '</span></div>').join('');
  }
  return head(t('goals'), null, 'toShop') + '<div class="seg">' + ['missions'].concat(feat(p, 'quests') ? ['quests'] : [], ['badges', 'ranks']).map(k => '<button class="' + (tab === k ? 'sel' : '') + '" data-act="gtab" data-v="' + k + '">' + t('tab_' + k) + '</button>').join('') + '</div><div style="margin-top:10px">' + body + '</div>';
}

/* ----- decoration shop and deals ----- */
function decorHtml() {
  const p = S.cur;
  const skins = SKINS.map(([k, lv, em]) => { const ok = level(p) >= lv; return '<button class="chip ' + (p.skin === k ? 'sel' : '') + '" data-act="skin" data-v="' + k + '">' + (ok ? em + ' ' : '🔒 ') + t('skin_' + k) + (ok ? '' : ' · ' + t('level', { n: lv })) + '</button>'; }).join('');
  const sec = SLOTS.map(s => '<h3 class="sech">' + t('slot_' + s) + '</h3><div class="dgrid">' + DECOR.filter(d => d.slot === s).map(d => {
    const own = p.owned.includes(d.id), eq = p.eq[s] === d.id;
    return '<div class="dcard ' + (eq ? 'eq' : '') + '"><i>' + d.e + '</i><b>' + t('d_' + d.id) + '</b>' + (own ? '<button class="btn sm ' + (eq ? 'ghost' : '') + '" data-act="equip" data-id="' + d.id + '">' + (eq ? t('unequip') : t('equip')) + '</button>' : '<button class="btn sm blue" data-act="buyDecor" data-id="' + d.id + '">' + money(lp(d.p)) + '</button>') + '</div>';
  }).join('') + '</div>').join('');
  return '<div class="oh"><h2 style="margin:0">' + t('decor') + '</h2><span class="pill gold">' + ic('coin', 14) + ' ' + money(p.cash) + '</span></div>' +
    '<h3 class="sech">' + t('shopTheme') + '</h3><div class="chips wrap">' + skins + '</div>' +
    '<h3 class="sech">' + t('studio') + '</h3><div class="chips wrap"><button class="chip ' + (p.wall !== false ? 'sel' : '') + '" data-act="wall">🖼️ ' + t('wallpaper') + ' · ' + t(p.wall !== false ? 'on' : 'off') + '</button></div>' +
    '<div class="muted small" style="margin-top:8px">' + t('awning') + '</div><div class="swr"><button class="auto ' + (p.awn ? '' : 'sel') + '" data-act="awn" data-v="">' + t('auto') + '</button>' + BGS.concat(ACCENTS).map(c => '<button class="' + (p.awn === c ? 'sel' : '') + '" style="background:' + c + '" data-act="awn" data-v="' + c + '" aria-label="' + c + '"></button>').join('') + '</div>' + sec + '<button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}
function dealsHtml() {
  const p = S.cur;
  return '<h2>' + t('deals') + '</h2><p class="muted small">' + t('dealsHint') + '</p>' +
    (p.coupons.length ? p.coupons.map(c => '<div class="prow"><b class="gr">' + esc(c.code) + '</b><span class="pill gold">' + bdi('-' + c.pct + '%') + '</span><button class="ibtn red" data-act="delCoupon" data-code="' + esc(c.code) + '" aria-label="' + t('delete') + '">' + ic('trash') + '</button></div>').join('') : '<p class="muted small">' + t('noCoupons') + '</p>') +
    '<label>' + t('couponCode') + '<input id="ncode" class="inp" maxlength="12" autocapitalize="characters" style="text-transform:uppercase" value="' + esc(S.ncode) + '"></label>' +
    '<div class="seg wrap">' + [5, 10, 15, 20, 30, 50].map(n => '<button class="' + (S.npct === n ? 'sel' : '') + '" data-act="npct" data-v="' + n + '">' + bdi('-' + n + '%') + '</button>').join('') + '</div>' +
    '<button class="btn big" data-act="addCoupon">' + ic('plus') + ' ' + t('add') + '</button><button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ----- parent panel ----- */
function newExchange() {
  const shop = curCode(), others = CURRENCIES.filter(c => c !== shop), cur = pick(others);
  const amt = nice(lp(pick([5, 10, 20, 25, 40, 50, 100])));
  S.ex = { cur, amt, ans: rnd(amt / rateOf(shop) * rateOf(cur), cur), tries: 0, done: false, show: false, err: '', reward: false };
}
function exchHtml() {
  const E = S.ex, shop = curCode();
  return '<h2>💱 ' + t('exchange') + '</h2><p class="center muted">' + t('exQ', { a: fmt(E.amt), c: E.cur }) + '</p>' +
    '<div class="tot"><span>1 USD</span><b>' + rateOf(shop) + ' ' + shop + '</b></div><div class="tot"><span>1 USD</span><b>' + rateOf(E.cur) + ' ' + E.cur + '</b></div>' +
    (E.done ? '<div class="note ' + (E.show ? '' : 'ok') + '">' + fmt(E.ans, E.cur) + '</div>' + (E.reward ? '<p class="center tag">' + sgn('+', lp(1)) + ' 🎉</p>' : '') +
      '<button class="btn big" data-act="exNext">' + t('next') + '</button><button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>' :
      '<input id="xans" class="inp pin" style="letter-spacing:2px" inputmode="decimal" placeholder="' + E.cur + '?" autocomplete="off"><p class="err">' + (E.err || '') + '</p>' +
      '<div class="row"><button class="btn ghost" data-act="closeSheet">' + t('cancel') + '</button><button class="btn" data-act="exAnswer">' + ic('check') + ' ' + t('check') + '</button></div>');
}
function lvlHint(p) {              // a suggestion only: the parent decides
  if ((p.hist || []).length < 20) return '';
  const acc = p.hist.reduce((a, b) => a + b, 0) / p.hist.length, i = LEVELS.indexOf(p.lvl);
  if (acc >= 0.85 && i < LEVELS.length - 1) return 'up';
  if (acc < 0.4 && i > 0) return 'down';
  return '';
}
function lvlHtml(p) {
  const hint = lvlHint(p), acc = (p.hist || []).length ? Math.round(p.hist.reduce((a, b) => a + b, 0) / p.hist.length * 100) : null;
  return '<h2>' + esc(p.name) + ' · ' + t('lvlTitle') + '</h2>' + (hint ? '<div class="hintbox">💡 ' + t('hint_' + hint) + '</div>' : '') +
    (acc != null ? '<p class="muted small">' + t('lastAnswers', { n: acc }) + '</p>' : '') +
    lvlGrid(p.lvl, 'setLvl', p.id) + '<p class="muted small">' + t('lvlD_' + p.lvl) + '</p>' +
    '<h3 class="sech">' + t('lvlFeatures') + '</h3><div class="ftl">' + FEATS.map(k => '<button class="ft ' + (feat(p, k) ? 'on' : '') + '" data-act="toggleFt" data-id="' + p.id + '" data-k="' + k + '">' + (feat(p, k) ? '✓ ' : '') + t('ft_' + k) + '</button>').join('') + '</div>' +
    '<button class="btn ghost big" data-act="resetFt" data-id="' + p.id + '">' + t('lvlReset') + '</button><button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}
function backupNote() {          // remind parents to back up, and say whether the browser promised to keep the data
  const days = S.lastBackup ? Math.floor((Date.now() - S.lastBackup) / 864e5) : null;
  const due = days == null || days >= 7 || days < 0;
  const st = S.persist === true ? '🔒 ' + t('persistYes') : S.persist === false ? '⚠️ ' + t('persistNo') : '';
  return (due ? '<div class="hintbox">💾 ' + (days == null ? t('backupNever') : t('backupOld', { n: Math.max(7, days) })) + '</div>' : '<p class="muted small">✅ ' + t('backupLast', { d: new Date(S.lastBackup).toLocaleDateString(LOC(), { day: 'numeric', month: 'short' }) }) + '</p>') +
    (st ? '<p class="muted small">' + st + '</p>' : '');
}
function parentView() {
  const rows = S.profiles.map(p => '<div class="prow">' + mas(p.mascot, 40) + '<div class="gr"><b>' + esc(p.name) + '</b><div class="muted small">' + t('level', { n: level(p) }) + ' · ' + t('sold') + ': ' + p.st.sold + ' · ' + t('revenue') + ': ' + fmt(p.st.rev, p.currency) + (p.st.rcount ? ' · ⭐ ' + (p.st.rsum / p.st.rcount).toFixed(1) : '') + ' · 🧮 ' + p.st.math + '/' + p.st.mq + '</div>' +
    '<button class="btn ghost sm" style="margin-top:8px" data-act="lvlSheet" data-id="' + p.id + '">🎓 ' + t('lvl_' + p.lvl) + ' · ' + t('lvlEdit') + (lvlHint(p) ? ' 💡' : '') + '</button> <button class="btn ghost sm" style="margin-top:8px" data-act="skillsSheet" data-id="' + p.id + '">📊 ' + t('skillsT') + '</button></div>' +
    '<button class="ibtn red" data-act="delProfile" data-id="' + p.id + '" aria-label="' + t('delete') + '">' + ic('trash') + '</button></div>').join('');
  return head(t('parent'), null, 'parentDone') +
    '<h2>' + t('profiles') + '</h2>' + rows + '<button class="btn big" data-act="newProfile">' + ic('plus') + ' ' + t('addProfile') + '</button>' +
    '<h2>' + t('rates') + '</h2><div class="rates">' + CURRENCIES.filter(c => c !== 'USD').map(c => '<label>' + c + '<input class="inp" data-rate="' + c + '" inputmode="decimal" value="' + S.rates[c] + '"></label>').join('') + '</div>' +
    '<h2>' + t('backup') + '</h2><p class="muted small">' + t('backupHint') + '</p>' + backupNote() +
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
const newDraft = () => ({ lvl: 'explorer', id: null, name: '', shopName: '', mascot: 'fox', theme: S.theme, accent: ACCENTS[0], currency: 'USD' });
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

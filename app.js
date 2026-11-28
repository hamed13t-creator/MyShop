'use strict';
/* MyShop app: global event listeners, backup and restore, and boot. Loaded last. */
document.addEventListener('click', e => {
  rearm();
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || S.busy) return;
  const f = ACT[el.dataset.act];
  if (!f) return;
  sfx.tick();
  const r = f(el.dataset, el, e);
  if (r && typeof r.then === 'function') {        // async actions lock the screen until done, so a double tap cannot repeat them
    S.busy = true;
    const free = () => { S.busy = false; };
    r.then(free, free); setTimeout(free, 8000);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'plans') ACT.planCheck();
  if (e.key === 'Enter' && e.target.id === 'dplan') ACT.dplanSet();
  if (e.key === 'Enter' && e.target.id === 'pinin') ACT.pinok();
  if (e.key === 'Enter' && e.target.id === 'ans') ACT.ansCheck();
  if (e.key === 'Enter' && e.target.id === 'xans') ACT.exAnswer();
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { S.q = e.target.value; const g = $('#grid'); if (g) g.innerHTML = storeGrid(); }
  if ((e.target.id === 'i_price' || e.target.id === 'i_qty') && S.view === 'item') updItemLive();
});
document.addEventListener('change', async e => {
  const f = e.target, file = f.files && f.files[0];
  if (f.id === 'i_cur' && S.view === 'item') { updItemLive(); return; }
  if (f.id === 'fcam' || f.id === 'fup') {
    if (!file) return;
    syncItem();
    try { S.idraft.img = await shrink(file); } catch (_) { toast(t('imgErr'), '⚠️'); }
    render();
  } else if (f.id === 'fimp') {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'myshop' || !Array.isArray(data.profiles)) throw new Error('bad');
      confirmBox('restoreQ', 'restore', () => restoreData(data), t('restoreWarn'), true);
    } catch (_) { toast(t('badBackup'), '⚠️'); sfx.err(); }
    f.value = '';
  }
});
document.addEventListener('visibilitychange', async () => {   // the app stayed open past midnight: customers get fresh budgets
  if (document.visibilityState !== 'visible' || !S.cur) return;
  if (S.customers.some(c => (c.day || '') < today())) { await refill(); await saveP(); if (S.view === 'custs' || S.view === 'shop') render(); }
  if (!$('#ov')) await cpuRun(true);
});
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredInstall = e;
  if (S.view === 'picker' || S.view === 'parent') render();
});

const STORES = ['profiles', 'products', 'customers', 'orders', 'ledger'];   // backups older than v8 have no ledger: it is restored empty
function backupOk(d) {            // every record of every store is checked BEFORE anything is erased
  const isRec = r => !!r && typeof r === 'object' && !Array.isArray(r) && typeof r.id === 'string' && r.id.length > 0;
  for (const s of STORES) {
    const a = d[s] == null && s !== 'profiles' ? [] : d[s];
    if (!Array.isArray(a)) return false;
    for (const r of a) if (!isRec(r) || (s !== 'profiles' && typeof r.pid !== 'string')) return false;
  }
  if (d.meta != null && (typeof d.meta !== 'object' || Array.isArray(d.meta))) return false;
  return true;
}
async function backedUp() { S.lastBackup = Date.now(); await setMeta('lastBackup', S.lastBackup); }
async function restoreData(d) {
  if (!backupOk(d)) { toast(t('badBackup'), '⚠️'); sfx.err(); return; }
  const m = d.meta || {};
  try {                           // one transaction: the old data is replaced completely, or not touched at all
    await DB.multi(STORES.concat(['meta']), os => {
      for (const s of STORES) { os[s].clear(); (d[s] || []).forEach(r => os[s].put(r)); }
      if (m.pin) os.meta.put({ k: 'pin', v: m.pin });
      if (m.rates && typeof m.rates === 'object') os.meta.put({ k: 'rates', v: m.rates });
      if (m.lang === 'en' || m.lang === 'ar') os.meta.put({ k: 'lang', v: m.lang });
      if (m.theme === 'dark' || m.theme === 'cream') os.meta.put({ k: 'theme', v: m.theme });
    });
  } catch (e) { console.error(e); toast(t('restoreFail'), '⚠️'); sfx.err(); return; }
  await loadAll(); applyLang(); applyTheme(S.theme, ACCENTS[0]); setView('picker'); toast(t('restored'), '✅');
}

/* ---------- boot ---------- */
async function loadAll() {
  S.lang = await getMeta('lang', (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en');
  S.theme = await getMeta('theme', 'dark');
  S.sound = await getMeta('sound', true); SFX.on = S.sound;
  S.pin = await getMeta('pin', null);
  S.pinFails = await getMeta('pinFails', 0); S.pinLock = await getMeta('pinLock', 0);
  S.lastBackup = await getMeta('lastBackup', 0);
  S.rates = Object.assign({}, RATES0, await getMeta('rates', {}));
  S.profiles = (await DB.all('profiles')).map(normProfile).sort((a, b) => a.created - b.created);
  S.view = S.pin ? 'picker' : 'setup';
}
async function boot() {
  try { await DB.open(); } catch (e) { $('#app').innerHTML = '<p style="padding:20px">Storage is not available in this browser mode.</p>'; return; }
  await loadAll();
  applyLang(); applyTheme(S.theme, ACCENTS[0]); render();
  history.replaceState({ root: 1 }, '');   // root entry; the guard entry is pushed on the first tap
  if (navigator.storage && navigator.storage.persist) {      // the answer is shown in the Parents panel
    navigator.storage.persist().then(ok => { S.persist = !!ok; if (S.view === 'parent') render(); }).catch(() => { S.persist = null; });
  }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

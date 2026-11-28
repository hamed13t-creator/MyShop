'use strict';
/* MyShop navigation: the phone back button (one guard history entry). */
/* ---------- navigation: the phone's back button ----------
   The app always sits on one guard history entry (G) above the root entry (R). Back lands on R, we handle it
   (close a sheet, go up one screen, ask in the shop) and push G again. On the profiles screen we do NOT push it,
   so a second back press really leaves the app. */
let armed = false, rearmT = 0;
function rearm() { if (!armed && !S.exiting) { armed = true; history.pushState({ g: 1 }, ''); } }
function byeScreen() {
  if ($('#bye')) return;
  const d = document.createElement('div');
  d.id = 'bye'; d.className = 'ov center';
  d.innerHTML = '<div class="sheet"><div style="font-size:54px">👋</div><h2>' + t('byeTitle') + '</h2><p class="muted">' + t('byeHint') + '</p><button class="btn big" data-act="stayBye">' + t('stay') + '</button></div>';
  document.body.appendChild(d);
}
function exitApp() {
  S.exiting = true;
  const hadGuard = armed; armed = false;
  try { if (hadGuard) history.back(); } catch (e) { /* ignore */ }
  setTimeout(() => { try { window.close(); } catch (e) { /* ignore */ } setTimeout(byeScreen, 350); }, 250);
}
function leaveShopBox() {
  sheet('<h2>' + t('leaveShopQ') + '</h2><div class="stack"><button class="btn ghost" data-act="closeSheet">' + ic('shop') + ' ' + t('stay') + '</button>' +
    '<button class="btn" data-act="goProfiles">' + ic('users') + ' ' + t('toProfiles') + '</button>' +
    '<button class="btn red" data-act="exitNow">' + ic('x') + ' ' + t('exitApp') + '</button></div>');
}
function handleBack() {
  if ($('#bye')) { ACT.stayBye(); return; }
  if ($('#ov')) { closeSheet(); return; }           // 1. close an open sheet first
  const v = S.view;
  if (v === 'shop') { leaveShopBox(); return; }
  if (v === 'picker' || v === 'setup') { toast(t('pressAgain'), '👋'); return; }
  if (v === 'store') { ACT.leaveStore(); return; }
  const m = { item: 'cancelItem', pform: 'cancelForm', cform: 'cancelCust', custs: 'toShop', orders: 'toShop', goals: 'toShop', parent: 'parentDone' }[v];
  if (m) ACT[m]();
}
window.addEventListener('popstate', () => {
  if (S.exiting) return;
  armed = false;                                    // we are back on the root entry
  clearTimeout(rearmT);
  const v = S.view;
  if (!$('#ov') && !$('#bye') && (v === 'picker' || v === 'setup')) {
    toast(t('pressAgain'), '👋');                         // no guard now: pressing back again leaves the app
    rearmT = setTimeout(rearm, 2400);
    return;
  }
  rearm(); handleBack();
});

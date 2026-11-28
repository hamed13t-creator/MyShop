'use strict';
/* MyShop money and people skills: Spend / Save / Share jars, savings interest, honesty moments, complaints,
   the cash book, multi-day quests, the discount decision, the daily plan and the parents' skills dashboard. */

/* ---------- after a profile opens ---------- */
async function afterOpen() {
  const p = S.cur;
  const msgs = [];
  const it = applyInterest(p); if (it) msgs.push('🏦 ' + t('intGot', { n: fmt(it) }));
  if (p.quest && !p.quest.done && today() > p.quest.end) msgs.push('⌛ ' + t('questOver'));
  if (msgs.length) { await saveP(); msgs.forEach(m => toast(m)); }
  pruneLedger(p.id);
  await cpuRun(true);
}

/* ---------- jars ---------- */
const JAR_E = { cash: '🪙', save: '🐷', share: '💝' };
function jarsHtml() {
  const p = S.cur, s = splitOf(p), pic = feat(p, 'pic'), tot = p.cash + p.jars.save + p.jars.share || 1;
  const jar = (k, v, label) => '<div class="jar"><i>' + JAR_E[k] + '</i><div class="jfill"><b style="height:' + Math.max(4, Math.round(Math.max(0, v) / tot * 100)) + '%"></b></div>' +
    '<b>' + t(label) + '</b><span class="' + (pic ? 'muted small' : '') + '">' + money(v) + '</span></div>';
  const seg = (k, vals) => '<div class="seg wrap">' + vals.map(n => '<button class="' + (s[k] === n ? 'sel' : '') + '" data-act="setSplit" data-k="' + k + '" data-v="' + n + '">' + bdi(n + '%') + '</button>').join('') + '</div>';
  const next = feat(p, 'interest') && p.intDay ? addDays(p.intDay, 7) : '';
  return '<h2>🫙 ' + t('jars') + '</h2><p class="muted small">' + t(pic ? 'jarsKid' : 'jarsHint') + '</p>' +
    '<div class="jars">' + jar('cash', p.cash, 'jarSpend') + jar('save', p.jars.save, 'jarSave') + jar('share', p.jars.share, 'jarShare') + '</div>' +
    (feat(p, 'split') ? '<h3 class="sech">' + t('splitT', { n: 100 - s.save - s.share }) + '</h3><p class="small">🐷 ' + t('jarSave') + '</p>' + seg('save', [0, 10, 20, 30, 40, 50]) + '<p class="small">💝 ' + t('jarShare') + '</p>' + seg('share', [0, 5, 10, 20]) :
      '<p class="center" style="font-size:22px">🪙🪙🪙🪙🪙🪙🪙 🐷🐷 💝</p>') +
    (next ? '<p class="muted small">🏦 ' + t('intHint', { d: dlabel(next, { month: 'short', day: 'numeric' }) }) + '</p>' : '') +
    (p.jars.given ? '<p class="small">💝 ' + t('givenSoFar', { n: money(p.jars.given) }) + '</p>' : '') +
    '<div class="row">' + (p.jars.share > 0 ? '<button class="btn" data-act="giveOpen">💝 ' + t('give') + '</button>' : '') +
    (p.jars.save > 0 ? '<button class="btn ghost" data-act="unsave">🐷 ' + t('unsave') + '</button>' : '') + '</div>' +
    '<button class="btn ghost big" data-act="closeSheet">' + t('done') + '</button>';
}
const CAUSES = [['animals', '🐾'], ['trees', '🌳'], ['school', '📚'], ['food', '🍲']];
function giveHtml() {
  return '<h2>💝 ' + t('give') + '</h2><p class="muted">' + t('giveQ', { n: money(S.cur.jars.share) }) + '</p><div class="dgrid">' +
    CAUSES.map(([k, e]) => '<button class="dcard" data-act="giveTo" data-v="' + k + '"><i>' + e + '</i><b>' + t('cause_' + k) + '</b></button>').join('') + '</div>' +
    '<button class="btn ghost big" data-act="jars">' + t('cancel') + '</button>';
}

/* ---------- interest on the Save jar (Tycoon): 2% each full game week, at most 8 weeks at once ---------- */
const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
function applyInterest(p) {
  if (!feat(p, 'interest') || !feat(p, 'jars')) { p.intDay = null; return 0; }
  const d = today();
  if (!p.intDay) { p.intDay = d; return 0; }
  const weeks = Math.min(8, Math.floor(daysBetween(p.intDay, d) / 7));
  if (weeks <= 0) return 0;
  let got = 0;
  for (let i = 0; i < weeks; i++) { const a = rnd(p.jars.save * 0.02); if (a > 0) { p.jars.save = rnd(p.jars.save + a); got = rnd(got + a); } }
  p.intDay = addDays(p.intDay, weeks * 7);
  if (got > 0) book(p, 'interest', got, got, 0);
  return got;
}

/* ---------- honesty moments: after a delivery, a customer sometimes pays too much by mistake ---------- */
function honestyCheck(o) {
  const p = S.cur;
  if (!feat(p, 'honest') || o.hon || p.honDay === today() || h32(o.id + 'hon') % 100 >= 15) return false;
  p.honDay = today();
  o.hon = { amt: rnd(Math.max(minUnit(), Math.round(o.total * 0.2 / minUnit()) * minUnit())), done: '' };
  return true;
}
function honestyHtml(o) {
  return '<div class="center">' + avatar(o.cmas, 80, o.chat, o.ccol) + '<h2>🤔 ' + t('honQ', { n: esc(o.cname), a: fmt(o.hon.amt) }) + '</h2><p class="muted">' + t('honHint') + '</p></div>' +
    '<div class="stack"><button class="btn" data-act="honBack" data-id="' + o.id + '">🤝 ' + t('honBack') + '</button><button class="btn ghost" data-act="honKeep" data-id="' + o.id + '">🙈 ' + t('honKeep') + '</button></div>';
}

/* ---------- complaints (Merchant and Tycoon): a late or damaged delivery; the kid chooses how to answer ---------- */
function complaintCheck(o) {
  if (!feat(S.cur, 'complain') || o.cmp) return;
  const why = o.review && o.review.late ? 'late' : h32(o.id + 'cmp') % 100 < 8 ? 'damaged' : '';
  if (why) o.cmp = { why, done: '' };
}
function cmpHtml(o) {
  if (!o.cmp) return '';
  if (o.cmp.done) return '<div class="hintbox">💬 ' + t('cmpd_' + o.cmp.done) + '</div>';
  return '<div class="cmp"><b>⚠️ ' + t('cmp_' + o.cmp.why, { n: esc(o.cname) }) + '</b><p class="muted small">' + t('cmpHint') + '</p><div class="stack">' +
    '<button class="btn ghost" data-act="cmpDo" data-id="' + o.id + '" data-v="sorry">🙏 ' + t('cmpSorry') + '</button>' +
    '<button class="btn ghost" data-act="cmpDo" data-id="' + o.id + '" data-v="replace">📦 ' + t('cmpReplace') + '</button>' +
    '<button class="btn ghost" data-act="cmpDo" data-id="' + o.id + '" data-v="refund">💸 ' + t('cmpRefund', { n: fmt(o.items[0] ? o.items[0].unit : o.total, o.cur) }) + '</button></div></div>';
}

/* ---------- cash book ---------- */
async function pruneLedger(pid) {          // keep the last 500 lines per profile
  try {
    const all = await DB.byPid('ledger', pid);
    if (all.length <= 500) return;
    all.sort((a, b) => a.ts - b.ts);
    await DB.multi(['ledger'], os => all.slice(0, all.length - 500).forEach(l => os.ledger.delete(l.id)));
  } catch (e) { /* the cash book is optional */ }
}
async function ledgerHtml() {
  const p = S.cur, rows = (await DB.byPid('ledger', p.id)).sort((a, b) => b.ts - a.ts).slice(0, 80);
  let day = '', out = '';
  for (const l of rows) {
    if (l.day !== day) { day = l.day; out += '<h3 class="sech">' + dlabel(day) + '</h3>'; }
    const spend = rnd(l.a - l.sv - l.sh, l.cur);
    out += '<div class="lrow"><span class="gr">' + t('lk_' + l.k) + (l.sv ? ' <small>🐷' + bdi((l.sv > 0 ? '+' : '') + fmt(l.sv, l.cur)) + '</small>' : '') + (l.sh ? ' <small>💝' + bdi((l.sh > 0 ? '+' : '') + fmt(l.sh, l.cur)) + '</small>' : '') + '</span>' +
      '<b class="' + (spend < 0 ? 'neg' : spend > 0 ? 'pos' : '') + '">' + (spend ? sgn(spend > 0 ? '+' : '-', Math.abs(spend), l.cur) : '–') + '</b><small class="muted">' + fmt(l.b, l.cur) + '</small></div>';
  }
  return '<h2>📒 ' + t('ledger') + '</h2><p class="muted small">' + t('ledgerHint') + '</p><div class="lrow head"><span class="gr"></span><b>' + t('jarSpend') + '</b><small>' + t('balance') + '</small></div>' +
    (out || '<p class="muted center">' + t('ledgerNone') + '</p>') + '<button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}

/* ---------- quests: multi-day stories told by the kid's mascot ---------- */
function questsFor(p) { return QUESTS.filter(q => !q.need || feat(p, q.need)); }
function questOffer(p) {
  const a = questsFor(p).slice(); let h = h32(today() + p.id);
  for (let i = a.length - 1; i > 0; i--) { h = (Math.imul(h, 1103515245) + 12345) >>> 0; const j = h % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, 3);
}
function questTrack(p, type, n) {
  const Q = p && p.quest; if (!Q || Q.done || today() > Q.end) return;
  const def = QUESTS.find(q => q.id === Q.id); if (!def) return;
  let hit = false;
  def.steps.forEach(([k, goal]) => { if (k === type && (Q.prog[k] || 0) < goal) { Q.prog[k] = Math.min(goal, (Q.prog[k] || 0) + n); hit = true; } });
  if (hit && def.steps.every(([k, goal]) => (Q.prog[k] || 0) >= goal)) { Q.done = true; setTimeout(() => { sfx.up(); toast('🗺️ ' + t('questDone')); }, 600); }
}
function questHtml() {
  const p = S.cur, Q = p.quest;
  if (!Q) {
    return '<p class="muted small">' + t('questPick') + '</p>' + questOffer(p).map(q => '<div class="mis"><div class="row" style="margin:0"><span style="font-size:30px">' + q.e + '</span><b class="gr">' + t('q_' + q.id) + '</b><span class="pill gold">' + ic('coin', 14) + ' ' + money(lp(q.r)) + '</span></div>' +
      '<p class="small">' + t('qd_' + q.id) + '</p><p class="muted small">' + q.steps.map(([k, g]) => t('qs_' + k, { n: g })).join(' · ') + ' · ' + t('qDays', { n: q.days }) + '</p>' +
      '<button class="btn sm" data-act="questStart" data-id="' + q.id + '">' + t('questGo') + '</button></div>').join('');
  }
  const def = QUESTS.find(q => q.id === Q.id), left = daysBetween(today(), Q.end) + 1, over = !Q.done && left <= 0;
  return '<div class="mis"><div class="row" style="margin:0">' + mas(p.mascot, 50) + '<div class="gr"><b>' + def.e + ' ' + t('q_' + def.id) + '</b><p class="small" style="margin:2px 0">' + t('qd_' + def.id) + '</p></div></div>' +
    def.steps.map(([k, g]) => { const v = Q.prog[k] || 0; return '<p class="small" style="margin:8px 0 2px">' + t('qs_' + k, { n: g }) + ' · ' + v + ' / ' + g + '</p><div class="xp"><i style="width:' + Math.round(v / g * 100) + '%"></i></div>'; }).join('') +
    '<p class="muted small">' + (Q.done ? '✅ ' + t('questDone') : over ? '⌛ ' + t('questOver') : t('qLeft', { n: left })) + '</p>' +
    (Q.done ? '<button class="btn" data-act="questClaim">' + t('claim') + ' · ' + money(lp(def.r)) + '</button>' : over ? '<button class="btn ghost" data-act="questDrop">' + t('questNew') + '</button>' : '<button class="btn ghost sm" data-act="questDrop">' + t('questGiveUp') + '</button>') + '</div>';
}

/* ---------- discount decision and daily plan: small cards on the shop screen ---------- */
const soldOn = (day, id) => S.orders.filter(o => o.day === day).reduce((s, o) => s + o.items.filter(i => !id || i.id === id).reduce((a, i) => a + i.qty, 0), 0);
function slowItem(p) {
  const d = today(), last3 = [0, 1, 2].map(i => addDays(d, -i));
  return S.products.find(x => x.qty > 0 && !x.disc && !x.dd && dkey(new Date(x.created || Date.now())) <= addDays(d, -3) && last3.every(k => !soldOn(k, x.id)));
}
function discEffect() {
  const xs = S.products.filter(x => x.dd);
  if (!xs.length) return '';
  return xs.map(x => { const n = S.orders.filter(o => o.day >= x.dd.day).reduce((s, o) => s + o.items.filter(i => i.id === x.id).reduce((a, i) => a + i.qty, 0), 0);
    return '<p class="small">🏷️ ' + t('discSince', { i: esc(x.name), p: bdi('-' + x.dd.pct + '%'), n }) + '</p>'; }).join('');
}
function shopCards(p) {
  let h = '';
  if (feat(p, 'dplan')) {
    const P = p.plan, d = today();
    if (P && P.day < d && !P.rev) {
      const s = soldOn(P.day), good = Math.abs(s - P.n) <= Math.max(1, Math.round(P.n * 0.2));
      h += '<div class="card2">🎯 ' + t('dplanRev', { n: P.n, s }) + ' ' + (good ? '👏 ' + t('dplanGood') : '💡 ' + t('dplanTry')) + ' <button class="btn sm" style="width:auto" data-act="dplanOk">' + t('ok') + '</button></div>';
    } else if (!P || P.day < d) {
      h += '<div class="card2"><b>🎯 ' + t('dplanQ') + '</b><div class="row" style="margin-top:6px"><input id="dplan" class="inp" style="flex:1" inputmode="numeric" placeholder="?"><button class="btn" style="flex:none" data-act="dplanSet">' + t('save') + '</button></div></div>';
    } else h += '<p class="muted small">🎯 ' + t('dplanNow', { n: P.n, s: soldOn(d) }) + '</p>';
  }
  if (feat(p, 'discdec') && p.ddDay !== today()) {
    const x = slowItem(p);
    if (x) h += '<div class="card2">🐌 ' + t('discQ', { i: esc(x.name) }) + '<div class="seg wrap" style="margin-top:6px">' + [10, 20, 30].map(n => '<button data-act="discPick" data-id="' + x.id + '" data-v="' + n + '">' + bdi('-' + n + '%') + '</button>').join('') +
      '<button data-act="discPick" data-id="' + x.id + '" data-v="0">' + t('discNo') + '</button></div></div>';
  }
  return h;
}

/* ---------- parents: skills dashboard ---------- */
function skillsHtml(p) {
  const rows = ['sum', 'change', 'profit', 'invoice', 'exch', 'plan'].map(k => {
    const a = (p.qh || {})[k] || [];
    if (!a.length) return '';
    const pc = Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100);
    return '<div class="sk"><span>' + t('sk_' + k) + '</span><div class="xp"><i style="width:' + pc + '%;background:' + (pc >= 80 ? '#22C55E' : pc >= 50 ? '#FBBF24' : '#F87171') + '"></i></div><b>' + bdi(pc + '%') + '</b><small class="muted">' + bdi('×' + a.length) + '</small></div>';
  }).join('');
  const st = p.st, j = p.jars || {};
  const line = (e, k, v) => '<div class="tot"><span>' + e + ' ' + t(k) + '</span><b>' + v + '</b></div>';
  return '<h2>📊 ' + esc(p.name) + ' · ' + t('skillsT') + '</h2><p class="muted small">' + t('skillsHint') + '</p>' + (rows || '<p class="muted">' + t('skillsNone') + '</p>') +
    '<h3 class="sech">' + t('habitsT') + '</h3>' +
    line('🐷', 'jarSave', money(j.save || 0, p.currency)) + line('💝', 'givenT', money(j.given || 0, p.currency)) +
    line('🤝', 'honestT', st.honest + ' / ' + (st.honest + st.kept)) + line('💬', 'cmpT', st.cmp) + line('🗺️', 'questsT', st.quests) + line('🎯', 'plansT', st.plans) +
    line('⭐', 'rating', (p.rr || 4).toFixed(1)) + '<button class="btn big" data-act="closeSheet">' + t('done') + '</button>';
}

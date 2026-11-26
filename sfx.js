'use strict';
// Fun sounds, synthesized with the Web Audio API (no audio files needed, works offline).
const SFX = { on: true, ctx: null };

function _ac() {
  if (!SFX.on) return null;
  try {
    if (!SFX.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      SFX.ctx = new C();
    }
    if (SFX.ctx.state === 'suspended') SFX.ctx.resume();
    return SFX.ctx;
  } catch (e) { return null; }
}

function _tone(f, at, d, type, vol, to) {
  const c = _ac();
  if (!c) return;
  try {
    const t0 = c.currentTime + at, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t0);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + d + 0.03);
  } catch (e) { /* ignore audio errors */ }
}

const sfx = {
  tick() { _tone(720, 0, 0.04, 'triangle', 0.04); },
  pop() { _tone(420, 0, 0.1, 'sine', 0.18, 880); },
  coin() { _tone(988, 0, 0.07, 'square', 0.06); _tone(1319, 0.07, 0.22, 'square', 0.06); },
  // cash register "cha-ching" when a purchase is completed
  cha() {
    _tone(180, 0, 0.07, 'sawtooth', 0.07, 90);
    _tone(1568, 0.09, 0.55, 'sine', 0.16);
    _tone(2093, 0.09, 0.55, 'sine', 0.08);
    for (let i = 0; i < 5; i++) _tone(1100 + i * 140, 0.35 + i * 0.07, 0.12, 'triangle', 0.07);
  },
  up() { [523, 659, 784, 1047].forEach((f, i) => _tone(f, i * 0.11, 0.22, 'square', 0.07)); _tone(1319, 0.5, 0.5, 'triangle', 0.08); },
  bell() { _tone(659, 0, 0.4, 'sine', 0.2); _tone(523, 0.4, 0.6, 'sine', 0.2); },
  star() { [1047, 1319, 1568].forEach((f, i) => _tone(f, i * 0.09, 0.16, 'triangle', 0.1)); },
  err() { _tone(200, 0, 0.22, 'sawtooth', 0.08, 100); },
  whoosh() { _tone(300, 0, 0.25, 'sine', 0.1, 1200); }
};

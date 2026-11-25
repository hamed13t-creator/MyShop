'use strict';
// Six mascots drawn as inline SVG (works offline, scales to any size).
const MASCOTS = ['fox', 'bear', 'robot', 'owl', 'cat', 'frog'];

const MASCOT_ART = {
  fox: '<polygon points="14,12 40,34 12,48" fill="#F97316"/><polygon points="86,12 60,34 88,48" fill="#F97316"/><path d="M12 46Q50 20 88 46Q84 88 50 92Q16 88 12 46Z" fill="#FB923C"/><path d="M30 66Q50 58 70 66Q64 90 50 90Q36 90 30 66Z" fill="#FFF7ED"/><circle cx="36" cy="55" r="4.5" fill="#1B1F3B"/><circle cx="64" cy="55" r="4.5" fill="#1B1F3B"/><ellipse cx="50" cy="72" rx="5" ry="4" fill="#1B1F3B"/>',
  bear: '<circle cx="20" cy="22" r="12" fill="#1B1F3B"/><circle cx="80" cy="22" r="12" fill="#1B1F3B"/><circle cx="50" cy="56" r="36" fill="#F8FAFC"/><ellipse cx="36" cy="52" rx="9" ry="11" fill="#1B1F3B"/><ellipse cx="64" cy="52" rx="9" ry="11" fill="#1B1F3B"/><circle cx="37" cy="50" r="3.5" fill="#fff"/><circle cx="63" cy="50" r="3.5" fill="#fff"/><ellipse cx="50" cy="68" rx="6" ry="4" fill="#1B1F3B"/>',
  robot: '<line x1="50" y1="10" x2="50" y2="24" stroke="#94A3B8" stroke-width="4"/><circle cx="50" cy="9" r="5" fill="#FBBF24"/><circle cx="10" cy="56" r="6" fill="#3B82F6"/><circle cx="90" cy="56" r="6" fill="#3B82F6"/><rect x="14" y="24" width="72" height="64" rx="14" fill="#60A5FA"/><rect x="24" y="42" width="52" height="26" rx="10" fill="#1B1F3B"/><circle cx="38" cy="55" r="5" fill="#2DD4BF"/><circle cx="62" cy="55" r="5" fill="#2DD4BF"/><rect x="38" y="76" width="24" height="5" rx="2" fill="#1E3A8A"/>',
  owl: '<polygon points="20,12 42,30 16,42" fill="#6D28D9"/><polygon points="80,12 58,30 84,42" fill="#6D28D9"/><ellipse cx="50" cy="58" rx="38" ry="36" fill="#8B5CF6"/><circle cx="35" cy="52" r="15" fill="#fff"/><circle cx="65" cy="52" r="15" fill="#fff"/><circle cx="37" cy="54" r="6" fill="#1B1F3B"/><circle cx="63" cy="54" r="6" fill="#1B1F3B"/><polygon points="44,66 56,66 50,79" fill="#FBBF24"/>',
  cat: '<polygon points="16,10 40,30 14,46" fill="#64748B"/><polygon points="84,10 60,30 86,46" fill="#64748B"/><ellipse cx="50" cy="58" rx="38" ry="34" fill="#94A3B8"/><ellipse cx="36" cy="54" rx="5" ry="6.5" fill="#1B1F3B"/><ellipse cx="64" cy="54" rx="5" ry="6.5" fill="#1B1F3B"/><circle cx="37.5" cy="52" r="1.8" fill="#fff"/><circle cx="65.5" cy="52" r="1.8" fill="#fff"/><polygon points="46,66 54,66 50,71" fill="#F472B6"/><path d="M10 66L30 68M10 74L30 72M90 66L70 68M90 74L70 72" stroke="#1B1F3B" stroke-width="2" stroke-linecap="round"/>',
  frog: '<circle cx="28" cy="30" r="16" fill="#4ADE80"/><circle cx="72" cy="30" r="16" fill="#4ADE80"/><ellipse cx="50" cy="62" rx="42" ry="32" fill="#22C55E"/><circle cx="28" cy="30" r="9" fill="#fff"/><circle cx="72" cy="30" r="9" fill="#fff"/><circle cx="29" cy="31" r="4" fill="#1B1F3B"/><circle cx="71" cy="31" r="4" fill="#1B1F3B"/><path d="M24 66Q50 90 76 66" fill="none" stroke="#14532D" stroke-width="4" stroke-linecap="round"/><circle cx="44" cy="54" r="2" fill="#14532D"/><circle cx="56" cy="54" r="2" fill="#14532D"/>'
};

function mas(k, s) {
  return '<svg viewBox="0 0 100 100" width="' + s + '" height="' + s + '" aria-hidden="true">' + (MASCOT_ART[k] || MASCOT_ART.fox) + '</svg>';
}

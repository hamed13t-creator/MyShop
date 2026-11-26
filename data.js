'use strict';
// Game catalogs. Prices are in USD (shown in each kid's currency).
const CATS = [['toys', '🧸'], ['books', '📚'], ['clothes', '👕'], ['food', '🍪'], ['art', '🎨'], ['games', '🎮'], ['other', '✨']];
const DISCS = [0, 10, 20, 30, 50];
const PERS = ['generous', 'regular', 'picky'];
const HATS = ['', '🎩', '👑', '🧢', '🎀', '🤠', '🎧', '🎓'];
const BGS = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#94A3B8'];
const NAMES = {
  en: ['Sam', 'Mia', 'Leo', 'Zoe', 'Max', 'Ava', 'Noah', 'Lily'],
  ar: ['سامي', 'ميا', 'ليث', 'زينة', 'ياسين', 'آية', 'عمر', 'لينا']
};
const ST = ['ordered', 'packed', 'shipped', 'delivered'];
const ST_ICON = { ordered: 'cart', packed: 'box', shipped: 'truck', delivered: 'check' };

// Shop themes unlock with the shop level.
const SKINS = [['default', 1], ['candy', 3], ['space', 5], ['jungle', 8]];

const SLOTS = ['sign', 'poster', 'counter', 'pet', 'plant'];
const DECOR = [
  { id: 'sign_wood', slot: 'sign', e: '🪵', p: 8 }, { id: 'sign_neon', slot: 'sign', e: '💡', p: 20 },
  { id: 'poster_star', slot: 'poster', e: '🌟', p: 6 }, { id: 'poster_rocket', slot: 'poster', e: '🚀', p: 10 }, { id: 'poster_rainbow', slot: 'poster', e: '🌈', p: 12 },
  { id: 'counter_bag', slot: 'counter', e: '🛍️', p: 12 }, { id: 'counter_candy', slot: 'counter', e: '🍭', p: 18 },
  { id: 'pet_cat', slot: 'pet', e: '🐱', p: 30 }, { id: 'pet_dog', slot: 'pet', e: '🐶', p: 35 }, { id: 'pet_parrot', slot: 'pet', e: '🦜', p: 40 }, { id: 'pet_turtle', slot: 'pet', e: '🐢', p: 25 },
  { id: 'plant_pot', slot: 'plant', e: '🪴', p: 10 }, { id: 'plant_cactus', slot: 'plant', e: '🌵', p: 8 }, { id: 'plant_sun', slot: 'plant', e: '🌻', p: 9 }
];

// Daily missions: type = the event that advances it, goal = how many, r = reward in USD.
const MISSIONS = [
  { id: 'sell3', type: 'items', goal: 3, r: 5 },
  { id: 'add1', type: 'add', goal: 1, r: 3 },
  { id: 'deliver2', type: 'deliver', goal: 2, r: 6 },
  { id: 'serve2', type: 'order', goal: 2, r: 4 },
  { id: 'star5', type: 'five', goal: 1, r: 5 },
  { id: 'change1', type: 'math', goal: 1, r: 4 },
  { id: 'cart3', type: 'big', goal: 1, r: 6 }
];

// Achievements. p.st holds lifetime counters.
const BADGES = [
  { id: 'first', e: '🎉', test: p => p.st.sold >= 1 },
  { id: 'sold10', e: '📦', test: p => p.st.sold >= 10 },
  { id: 'sold50', e: '🏆', test: p => p.st.sold >= 50 },
  { id: 'rich', e: '💰', test: p => p.cash >= 100 },
  { id: 'deliv5', e: '🚚', test: p => p.st.delivered >= 5 },
  { id: 'star', e: '⭐', test: p => p.st.five >= 1 },
  { id: 'crowd', e: '👥', test: p => p.st.custs >= 3 },
  { id: 'deco', e: '🎨', test: p => p.st.decor >= 1 },
  { id: 'math', e: '🧮', test: p => p.st.math >= 5 },
  { id: 'lvl5', e: '🚀', test: p => level(p) >= 5 }
];

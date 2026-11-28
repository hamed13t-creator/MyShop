'use strict';
// Profile levels. Each level switches on a set of features; parents can override single features.
const LEVELS = ['starter', 'explorer', 'merchant', 'tycoon'];
const FEATS = ['coupons', 'sum', 'change', 'pct', 'profit', 'profitQ', 'fee', 'exch', 'goal', 'event', 'pic',
  'cpu', 'late', 'invoice', 'report', 'lowstock', 'plan',
  'jars', 'split', 'interest', 'honest', 'complain', 'ledger', 'quests', 'discdec', 'dplan'];
const PRESET = {
  starter: ['pic', 'cpu', 'report', 'jars', 'quests'],
  explorer: ['coupons', 'sum', 'change', 'cpu', 'late', 'report', 'lowstock', 'jars', 'split', 'honest', 'quests'],
  merchant: ['coupons', 'sum', 'change', 'pct', 'profit', 'cpu', 'late', 'report', 'lowstock', 'plan', 'jars', 'split', 'honest', 'complain', 'ledger', 'quests', 'discdec', 'dplan'],
  tycoon: ['coupons', 'sum', 'change', 'pct', 'profit', 'profitQ', 'fee', 'exch', 'goal', 'event', 'cpu', 'late', 'invoice', 'report', 'lowstock', 'plan',
    'jars', 'split', 'interest', 'honest', 'complain', 'ledger', 'quests', 'discdec', 'dplan']
};
// Robot (CPU) customers: balance per profile level. v = visits per customer per day [min, max], cap = robot orders
// per shop per day, k = price sensitivity, drift = daily market change, busy = waiting robot orders before new ones leave,
// late = [hours, stars lost] (only with the 'late' feature).
const CPU_LV = {
  starter: { max: 3, v: [1, 1], cap: 3, k: 0.3, drift: 0, busy: 0, late: [] },
  explorer: { max: 6, v: [1, 2], cap: 6, k: 0.6, drift: 0, busy: 0, late: [[48, 1]] },
  merchant: { max: 12, v: [1, 3], cap: 10, k: 1.0, drift: 0, busy: 20, late: [[24, 1], [48, 2]] },
  tycoon: { max: 12, v: [2, 4], cap: 14, k: 1.3, drift: 0.1, busy: 20, late: [[24, 1], [48, 2]] }
};
const LOST_E = { stock: '🚫', price: '💸', budget: '👛', closed: '🔒', busy: '⏳' };
const EVENTS = [{ id: 'sale', m: 1.3, e: '🎉' }, { id: 'rain', m: 0.7, e: '🌧️' }, { id: 'holiday', m: 1.5, e: '🎈' }];

// Game catalogs. Prices are in USD (shown in each kid's currency).
// Hidden market price per category (USD). Customers' budgets and the price meter compare with it.
const MKT = { toys: 8, books: 6, clothes: 12, food: 2, art: 5, games: 15, other: 5 };
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
const SKINS = [['default', 1, '🏪'], ['ocean', 2, '🌊'], ['candy', 3, '🍭'], ['winter', 4, '❄️'], ['space', 5, '🚀'], ['pirate', 6, '🏴‍☠️'], ['arcade', 7, '🕹️'], ['jungle', 8, '🌴'], ['souk', 9, '🏮'], ['sunset', 10, '🌅']];

const SLOTS = ['sign', 'poster', 'counter', 'pet', 'plant'];
const DECOR = [
  { id: 'sign_wood', slot: 'sign', e: '🪵', p: 8 }, { id: 'sign_neon', slot: 'sign', e: '💡', p: 20 },
  { id: 'poster_star', slot: 'poster', e: '🌟', p: 6 }, { id: 'poster_rocket', slot: 'poster', e: '🚀', p: 10 }, { id: 'poster_rainbow', slot: 'poster', e: '🌈', p: 12 },
  { id: 'counter_bag', slot: 'counter', e: '🛍️', p: 12 }, { id: 'counter_candy', slot: 'counter', e: '🍭', p: 18 },
  { id: 'pet_cat', slot: 'pet', e: '🐱', p: 30 }, { id: 'pet_dog', slot: 'pet', e: '🐶', p: 35 }, { id: 'pet_parrot', slot: 'pet', e: '🦜', p: 40 }, { id: 'pet_turtle', slot: 'pet', e: '🐢', p: 25 },
  { id: 'plant_pot', slot: 'plant', e: '🪴', p: 10 }, { id: 'plant_cactus', slot: 'plant', e: '🌵', p: 8 }, { id: 'plant_sun', slot: 'plant', e: '🌻', p: 9 }
];

// Daily missions: type = the event that advances it, goal = how many, r = reward in USD (converted to a nice local amount).
const MISSIONS = [
  { id: 'sell3', type: 'items', goal: 3, r: 5 },
  { id: 'add1', type: 'add', goal: 1, r: 3 },
  { id: 'deliver2', type: 'deliver', goal: 2, r: 6 },
  { id: 'serve2', type: 'order', goal: 2, r: 4 },
  { id: 'star5', type: 'five', goal: 1, r: 5 },
  { id: 'change1', type: 'change', goal: 1, r: 4 },
  { id: 'cart3', type: 'big', goal: 1, r: 6 },
  { id: 'math3', type: 'math', goal: 3, r: 7 }
];

// Multi-day quests: steps are [event type, goal] (the same events as missions), r = reward in USD.
const QUESTS = [
  { id: 'bake', e: '🍪', days: 5, steps: [['items', 8]], r: 8 },
  { id: 'stars', e: '⭐', days: 5, steps: [['five', 3]], r: 8 },
  { id: 'speedy', e: '🚚', days: 4, steps: [['deliver', 6]], r: 8 },
  { id: 'shelf', e: '🧺', days: 3, steps: [['add', 2], ['restock', 1]], r: 6 },
  { id: 'crowd', e: '👥', days: 5, steps: [['order', 8]], r: 10 },
  { id: 'brain', e: '🧠', days: 5, steps: [['math', 8]], r: 10, need: 'sum' },
  { id: 'kind', e: '💝', days: 7, steps: [['give', 1]], r: 5, need: 'jars' }
];

// Achievements. p.st holds lifetime counters.
const BADGES = [
  { id: 'first', e: '🎉', test: p => p.st.sold >= 1 },
  { id: 'sold10', e: '📦', test: p => p.st.sold >= 10 },
  { id: 'sold50', e: '🏆', test: p => p.st.sold >= 50 },
  { id: 'rich', e: '💰', test: p => p.cash >= lp(100) },
  { id: 'deliv5', e: '🚚', test: p => p.st.delivered >= 5 },
  { id: 'star', e: '⭐', test: p => p.st.five >= 1 },
  { id: 'crowd', e: '👥', test: p => p.st.custs >= 3 },
  { id: 'deco', e: '🎨', test: p => p.st.decor >= 1 },
  { id: 'math', e: '🧮', test: p => p.st.math >= 5 },
  { id: 'lvl5', e: '🚀', test: p => level(p) >= 5 },
  { id: 'saver', e: '🐷', test: p => !!p.jars && p.jars.save >= lp(50) },
  { id: 'giver', e: '💝', test: p => p.st.given >= 1 },
  { id: 'honest', e: '🤝', test: p => p.st.honest >= 3 },
  { id: 'helper', e: '💬', test: p => p.st.cmp >= 3 },
  { id: 'quester', e: '🗺️', test: p => p.st.quests >= 1 }
];

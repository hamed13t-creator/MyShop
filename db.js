'use strict';
// Tiny IndexedDB wrapper. Everything stays on the device.
let _db = null;

function dbOpen() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const r = indexedDB.open('myshop', 1);
    r.onupgradeneeded = () => {
      const d = r.result;
      d.createObjectStore('profiles', { keyPath: 'id' });
      const p = d.createObjectStore('products', { keyPath: 'id' });
      p.createIndex('pid', 'pid');
      d.createObjectStore('meta', { keyPath: 'k' });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return _db;
}

function dbTx(store, mode, fn) {
  return dbOpen().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    const rq = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(rq ? rq.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

const DB = {
  open: dbOpen,
  all: s => dbTx(s, 'readonly', o => o.getAll()),
  get: (s, k) => dbTx(s, 'readonly', o => o.get(k)),
  put: (s, v) => dbTx(s, 'readwrite', o => o.put(v)),
  del: (s, k) => dbTx(s, 'readwrite', o => o.delete(k)),
  byPid: pid => dbTx('products', 'readonly', o => o.index('pid').getAll(pid))
};

const getMeta = async (k, def) => {
  const r = await DB.get('meta', k);
  return r ? r.v : def;
};
const setMeta = (k, v) => DB.put('meta', { k, v });

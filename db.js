'use strict';
// Tiny IndexedDB wrapper. Everything stays on the device.
let _db = null;

function dbOpen() {
  if (_db) return _db;
  _db = new Promise((resolve, reject) => {
    const r = indexedDB.open('myshop', 3);           // v3 (app v8) adds the cash book; older stores are kept as they are
    r.onupgradeneeded = () => {
      const d = r.result;
      const has = n => d.objectStoreNames.contains(n);
      if (!has('profiles')) d.createObjectStore('profiles', { keyPath: 'id' });
      if (!has('products')) d.createObjectStore('products', { keyPath: 'id' }).createIndex('pid', 'pid');
      if (!has('meta')) d.createObjectStore('meta', { keyPath: 'k' });
      if (!has('customers')) d.createObjectStore('customers', { keyPath: 'id' }).createIndex('pid', 'pid');
      if (!has('orders')) d.createObjectStore('orders', { keyPath: 'id' }).createIndex('pid', 'pid');
      if (!has('ledger')) d.createObjectStore('ledger', { keyPath: 'id' }).createIndex('pid', 'pid');
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  return _db;
}

function dbTx(store, mode, fn) {
  return dbOpen().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(store, mode);
    let rq;
    tx.oncomplete = () => resolve(rq ? rq.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('abort'));
    try { rq = fn(tx.objectStore(store)); } catch (e) { try { tx.abort(); } catch (_) { /* already done */ } reject(e); }
  }));
}

/* One readwrite transaction over several stores: everything is written, or nothing is. fn gets { storeName: objectStore }. */
function dbMulti(stores, fn) {
  return dbOpen().then(d => new Promise((resolve, reject) => {
    const tx = d.transaction(stores, 'readwrite'), os = {};
    stores.forEach(s => { os[s] = tx.objectStore(s); });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('abort'));
    try { fn(os); } catch (e) { try { tx.abort(); } catch (_) { /* already done */ } reject(e); }
  }));
}

const DB = {
  open: dbOpen,
  all: s => dbTx(s, 'readonly', o => o.getAll()),
  get: (s, k) => dbTx(s, 'readonly', o => o.get(k)),
  put: (s, v) => dbTx(s, 'readwrite', o => o.put(v)),
  del: (s, k) => dbTx(s, 'readwrite', o => o.delete(k)),
  clear: s => dbTx(s, 'readwrite', o => o.clear()),
  byPid: (s, pid) => dbTx(s, 'readonly', o => o.index('pid').getAll(pid)),
  putMany: (s, arr) => dbTx(s, 'readwrite', o => { arr.forEach(v => o.put(v)); return null; }),
  multi: dbMulti
};

const getMeta = async (k, def) => {
  const r = await DB.get('meta', k);
  return r ? r.v : def;
};
const setMeta = (k, v) => DB.put('meta', { k, v });

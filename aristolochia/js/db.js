/*
 * db.js — local-first storage for garden plots using IndexedDB.
 *
 * One object store, `plots`, keyed by plot_id. Each record is the full plot
 * object (metadata + flat `data` map of field -> value, plus `data.vines`, the
 * ordered list of vine observations). The farmer's name is kept in its own
 * top-level `farmer_name` field, deliberately separate from `data`, so a
 * name-excluded export is trivial.
 *
 * Everything is client-side; there is no network dependency. All writes go
 * through put(), which the app calls on every field change for autosave.
 */

const DB = (function () {
  const DB_NAME = 'mca_aristolochia';
  const DB_VERSION = 1;
  const STORE = 'plots';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'plot_id' });
          store.createIndex('by_status', 'plot_status', { unique: false });
          store.createIndex('by_updated', 'updated_at', { unique: false });
          store.createIndex('by_survey_date', 'survey_date', { unique: false });
        }
      };
      req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
      req.onerror = (e) => reject(e.target.error);
    });
  }

  function tx(mode) {
    return open().then((db) => db.transaction(STORE, mode).objectStore(STORE));
  }

  function put(record) {
    record.updated_at = new Date().toISOString();
    return tx('readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    }));
  }

  function get(id) {
    return tx('readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e.target.error);
    }));
  }

  function getAll() {
    return tx('readonly').then((store) => new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []).sort((a, b) =>
          (b.updated_at || '').localeCompare(a.updated_at || ''));
        resolve(list);
      };
      req.onerror = (e) => reject(e.target.error);
    }));
  }

  function remove(id) {
    return tx('readwrite').then((store) => new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    }));
  }

  return { open, put, get, getAll, remove };
})();

window.DB = DB;

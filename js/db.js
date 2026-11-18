// Lokale opslag: IndexedDB met een fallback naar geheugen als de browser IndexedDB weigert.
const DB_NAME = "volleybeert";
const DB_VER = 1;
let dbp = null;
const mem = { kv: new Map(), files: new Map() };
let useMem = false;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve) => {
    let req;
    try { req = indexedDB.open(DB_NAME, DB_VER); } catch (e) { useMem = true; resolve(null); return; }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { useMem = true; resolve(null); };
    req.onblocked = () => { useMem = true; resolve(null); };
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const db = await open();
  if (!db || useMem) return fn(null, mem[store]);
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s, null)).then((v) => { out = v; });
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}
const wrap = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });

export async function get(key, fallback) {
  const v = await tx("kv", "readonly", (s, m) => (m ? m.get(key) : wrap(s.get(key))));
  return v === undefined ? fallback : v;
}
export async function set(key, value) {
  return tx("kv", "readwrite", (s, m) => { if (m) m.set(key, value); else s.put(value, key); });
}
export async function putFile(id, rec) {
  return tx("files", "readwrite", (s, m) => { if (m) m.set(id, rec); else s.put(rec, id); });
}
export async function getFile(id) {
  return tx("files", "readonly", (s, m) => (m ? m.get(id) : wrap(s.get(id))));
}
export async function delFile(id) {
  return tx("files", "readwrite", (s, m) => { if (m) m.delete(id); else s.delete(id); });
}
export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}
export const isMemoryOnly = () => useMem;

import { emptyLibrary, parseLibrary, type Library } from './domain';
export const readLocal = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
export const writeLocal = (key: string, value: string) => { try { localStorage.setItem(key,value); return true; } catch { return false; } };
export function readSettings<T>(key: string, defaults: T): T { try { const raw = JSON.parse(readLocal(key) || 'null'); return raw && typeof raw === 'object' && !Array.isArray(raw) ? {...defaults,...raw} : defaults; } catch { return defaults; } }
let connection: Promise<IDBDatabase> | undefined;
function db() {
  if (!connection) connection = new Promise<IDBDatabase>((resolve,reject) => {
    const req = indexedDB.open('fluxnav-v1',1);
    req.onupgradeneeded = () => req.result.createObjectStore('data');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(Error('数据库被其他页面占用'));
  });
  return connection;
}
async function get(key: string): Promise<unknown> {
  const d = await db();
  return new Promise((resolve,reject) => { const req = d.transaction('data').objectStore('data').get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
async function put(key: string, value: unknown) {
  const d = await db();
  await new Promise<void>((resolve,reject) => {
    const tx = d.transaction('data','readwrite');
    tx.objectStore('data').put(value,key);
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
export async function loadLibrary(): Promise<{library: Library; warning: string}> {
  let legacy = emptyLibrary(); let warning = '';
  const raw = readLocal('fluxnav-bookmarks');
  if (raw) try { legacy = parseLibrary(JSON.parse(raw)); } catch { warning = '旧数据无法解析，原始数据仍保留在浏览器中。'; }
  try {
    const current = await get('library');
    if (current !== undefined) return {library: parseLibrary(current),warning:''};
    await put('library',legacy);
    return {library:legacy,warning};
  } catch {
    const fallback = readLocal('fluxnav-v1-fallback');
    if (fallback) try { legacy = parseLibrary(JSON.parse(fallback)); } catch { /* retain legacy */ }
    return {library:legacy,warning: 'IndexedDB 不可用，使用降级存储；请定期导出备份。'+warning};
  }
}
let queue = Promise.resolve();
export function saveLibrary(library: Library): Promise<string> {
  const operation = queue.then(async () => {
    try { await put('library',library); return ''; }
    catch { return writeLocal('fluxnav-v1-fallback',JSON.stringify(library)) ? '使用 LocalStorage 降级存储，请定期导出。' : '临时体验模式：刷新后数据将丢失，请导出备份。'; }
  });
  queue = operation.then(()=>{},()=>{});
  return operation;
}
export async function snapshot(library: Library) { await put('snapshot',library); }
export async function restoreSnapshot() { const value = await get('snapshot'); if (!value) throw Error('没有可用的本地快照'); return parseLibrary(value); }

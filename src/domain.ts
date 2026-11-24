export type Bookmark = {
  id: string; url: string; title: string; description: string; notes: string;
  tags: string[]; collection: string; addedAt: number; updatedAt: number;
  lastVisited: number; visitCount: number; favorite: boolean; pinned: boolean;
  archived: boolean; deleted: boolean;
};
export type Library = { schemaVersion: 1; bookmarks: Bookmark[] };
export type Sort = 'recent' | 'added' | 'visits' | 'title';
export const emptyLibrary = (): Library => ({ schemaVersion: 1, bookmarks: [] });
const str = (v: unknown, max = 10000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
const time = (v: unknown, fallback = 0) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
export function normalizeUrl(raw: string) {
  const input = raw.trim();
  if (!input || /[\s\u0000-\u001f]/.test(input)) throw Error('请输入有效网址');
  const value = /^[a-z][a-z\d+.-]*:/i.test(input) && !/^(?:localhost|[\w.-]+\.[\w.-]+):\d+(?:\/|$)/i.test(input) ? input : 'https://' + input;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) throw Error('仅支持无凭据的 HTTP/HTTPS 网址');
  return url.href;
}
export const domain = (url: string) => new URL(url).hostname.replace(/^www\./, '');
export const canonical = (url: string) => { const u = new URL(normalizeUrl(url)); u.hash = ''; return u.href; };
export const newId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
export function parseBookmark(raw: unknown): Bookmark {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('书签格式错误');
  const x = raw as Record<string, unknown>;
  const url = normalizeUrl(str(x.url));
  const title = str(x.title, 300);
  if (!title) throw Error('书签标题不能为空');
  if (x.tags !== undefined && (!Array.isArray(x.tags) || x.tags.some(t => typeof t !== 'string'))) throw Error('标签必须是字符串数组');
  const addedAt = time(x.addedAt, Date.now());
  return { id: str(x.id, 150) || newId(), url, title, description: str(x.description), notes: str(x.notes),
    tags: [...new Set((x.tags as string[] | undefined ?? []).map(t => str(t, 100)).filter(Boolean))].slice(0, 100),
    collection: str(x.collection, 150), addedAt, updatedAt: time(x.updatedAt, addedAt),
    lastVisited: time(x.lastVisited), visitCount: Math.floor(time(x.visitCount)),
    favorite: x.favorite === true, pinned: x.pinned === true, archived: x.archived === true, deleted: x.deleted === true };
}
export function parseLibrary(raw: unknown): Library {
  const obj = raw as {schemaVersion?: unknown; bookmarks?: unknown};
  if (!Array.isArray(raw) && obj?.schemaVersion !== undefined && obj.schemaVersion !== 1) throw Error('不支持的数据版本');
  const arr = Array.isArray(raw) ? raw : obj?.bookmarks;
  if (!Array.isArray(arr) || arr.length > 100000) throw Error('无效的书签文件');
  const bookmarks = arr.map(parseBookmark);
  if (new Set(bookmarks.map(b => b.id)).size !== bookmarks.length) throw Error('存在重复书签 ID');
  return { schemaVersion: 1, bookmarks };
}
export function mergeLibraries(local: Library, remote: Library): Library {
  const records = new Map(local.bookmarks.map(b => [b.id,b]));
  for (const b of remote.bookmarks) {
    const prev = records.get(b.id);
    // Stable tie-break, including deletion, so merge is deterministic.
    if (!prev || b.updatedAt > prev.updatedAt || (b.updatedAt === prev.updatedAt && (Number(b.deleted) > Number(prev.deleted) || (b.deleted === prev.deleted && JSON.stringify(b) > JSON.stringify(prev))))) records.set(b.id,b);
  }
  return { schemaVersion: 1, bookmarks: [...records.values()].sort((a,b) => a.id.localeCompare(b.id)) };
}
export function addUnique(library: Library, items: Bookmark[]) {
  const known = new Set(library.bookmarks.filter(b => !b.deleted).map(b => canonical(b.url)));
  const ids = new Set(library.bookmarks.map(b => b.id));
  const added: Bookmark[] = [];
  for (const b of items) {
    const key = canonical(b.url);
    if (known.has(key) || b.deleted) continue;
    known.add(key);
    const item = { ...b, id: ids.has(b.id) ? newId() : b.id, updatedAt: Date.now() };
    ids.add(item.id); added.push(item);
  }
  return { library: { ...library, bookmarks: [...library.bookmarks, ...added] }, added: added.length };
}
export function searchBookmarks(list: Bookmark[], query: string, sort: Sort) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return list.filter(b => { const hay = [b.title,b.url,b.description,b.notes,b.collection,...b.tags].join(' ').toLowerCase();
    return terms.every(t => hay.includes(t)); })
    .sort((a,b) => Number(b.pinned) - Number(a.pinned) || (sort === 'title' ? a.title.localeCompare(b.title,'zh-CN') : sort === 'added' ? b.addedAt-a.addedAt : sort === 'visits' ? b.visitCount-a.visitCount : b.lastVisited-a.lastVisited) || a.id.localeCompare(b.id));
}
export function parseHtmlBookmarks(html: string): Bookmark[] {
  const doc = new DOMParser().parseFromString(html,'text/html');
  const result: Bookmark[] = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    try {
      const raw = a.getAttribute('href') || '';
      const heading = a.closest('dl')?.previousElementSibling;
      result.push(parseBookmark({url: raw, title: a.textContent?.trim() || raw, collection: heading?.tagName === 'H3' ? heading.textContent : '', addedAt: Number(a.getAttribute('add_date')) * 1000 || Date.now()}));
    } catch { /* browser bookmarks may contain unsupported schemes */ }
  }
  return result;
}
export function exportHtml(list: Bookmark[]) {
  const esc = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>FluxNav</TITLE>\n<H1>FluxNav</H1>\n<DL><p>\n'+ list.filter(b=>!b.deleted).map(b=>'<DT><A HREF="'+esc(b.url)+'" ADD_DATE="'+Math.floor(b.addedAt/1000)+'">'+esc(b.title)+'</A>').join('\n')+'\n</DL><p>';
}

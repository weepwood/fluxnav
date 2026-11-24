export type Bookmark = {
  id: string; url: string; title: string; description: string; notes: string;
  tags: string[]; collection: string; addedAt: number; updatedAt: number;
  lastVisited: number; visitCount: number; favorite: boolean; pinned: boolean;
  archived: boolean; deleted: boolean; order?: number;
};
export type Library = { schemaVersion: 1; bookmarks: Bookmark[] };
export type Sort = 'recent' | 'added' | 'visits' | 'title' | 'relevance' | 'manual';
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
    favorite: x.favorite === true, pinned: x.pinned === true, archived: x.archived === true, deleted: x.deleted === true, ...(typeof x.order==='number'&&Number.isSafeInteger(x.order)&&x.order>=0?{order:x.order}:{}) };
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
export function chooseBookmark(prev:Bookmark|undefined,b:Bookmark):Bookmark{
 if(!prev)return b;if(prev===b)return prev;
 if(b.updatedAt>prev.updatedAt)return b;
 if(b.updatedAt<prev.updatedAt)return prev;
 if(b.deleted!==prev.deleted)return b.deleted?b:prev;
 return JSON.stringify(b)>JSON.stringify(prev)?b:prev;
}
export function mergeLibraries(local: Library, remote: Library): Library {
  const records = new Map(local.bookmarks.map(b => [b.id,b]));
  for (const b of remote.bookmarks) {
    const prev = records.get(b.id);
    records.set(b.id,chooseBookmark(prev,b));
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
  return { library: added.length?{ ...library, bookmarks: [...library.bookmarks, ...added] }:library, added: added.length };
}
// Cache immutable record projections; each keystroke reuses normalized text.
const normalizeSearch=(s:string)=>s.normalize('NFKC').toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
type SearchRecord={title:string;url:string;tags:string;body:string;words:string[]};
const searchCache=new WeakMap<Bookmark,SearchRecord>();
function searchRecord(b:Bookmark):SearchRecord {
 const cached=searchCache.get(b);if(cached)return cached;
 const title=normalizeSearch(b.title),url=normalizeSearch(b.url),tags=normalizeSearch([b.collection,...b.tags].join(' '));
 const record={title,url,tags,words:title.split(/[^a-z0-9]+/),body:[title,url,tags,normalizeSearch(b.description),normalizeSearch(b.notes)].join(' ')};
 searchCache.set(b,record);return record;
}
const fuzzy=(word:string,term:string)=>{
 if(term.length<4||word.length<3||Math.abs(word.length-term.length)>1||! /^[a-z0-9]+$/.test(term))return false;
 let i=0,j=0,edits=0;
 while(i<word.length&&j<term.length){if(word[i]===term[j]){i++;j++;continue;}if(++edits>1)return false;
 if(word.length>=term.length)i++;if(term.length>=word.length)j++;}
 return edits+(word.length-i)+(term.length-j)<=1;
};
export function searchBookmarks(list: Bookmark[], query: string, sort: Sort) {
 const terms=normalizeSearch(query.trim()).split(/\s+/).filter(Boolean);
 const matches:{b:Bookmark;score:number}[]=[];
 for(const b of list){
  let score=0,ok=true;
  if(terms.length){const row=searchRecord(b);for(const t of terms){
   if(row.title===t)score+=30;else if(row.title.startsWith(t))score+=20;else if(row.title.includes(t))score+=14;else if(row.url.includes(t))score+=10;else if(row.tags.includes(t))score+=8;else if(row.body.includes(t))score+=3;
   else if(row.words.some(w=>fuzzy(w,t)))score+=1;
   else{ok=false;break;}
  }}
  if(ok)matches.push({b,score});
 }
 return matches.sort((a,b)=>(sort==='relevance'&&terms.length?b.score-a.score:0)||Number(b.b.pinned)-Number(a.b.pinned)||(sort==='manual'?(a.b.order??Number.MAX_SAFE_INTEGER)-(b.b.order??Number.MAX_SAFE_INTEGER)||b.b.addedAt-a.b.addedAt:sort==='title'?a.b.title.localeCompare(b.b.title,'zh-CN'):sort==='added'?b.b.addedAt-a.b.addedAt:sort==='visits'?b.b.visitCount-a.b.visitCount:b.b.lastVisited-a.b.lastVisited)||a.b.id.localeCompare(b.b.id)).map(x=>x.b);
}
export function sameLibrary(a:Library,b:Library){
 if(a===b)return true;
 if(a.bookmarks.length!==b.bookmarks.length)return false;
 if(a.bookmarks.every((x,i)=>x===b.bookmarks[i]))return true;
 const index=new Map(a.bookmarks.map(x=>[x.id,x]));
 return b.bookmarks.every(x=>{const prev=index.get(x.id);return prev===x||(prev?.updatedAt===x.updatedAt&&JSON.stringify(prev)===JSON.stringify(x));});
}
export function patchBookmarks(library:Library,ids:readonly string[],change:Partial<Bookmark>,now=Date.now()):Library{
 const chosen=new Set(ids);
 return {...library,bookmarks:library.bookmarks.map(b=>chosen.has(b.id)?{...b,...change,id:b.id,updatedAt:Math.max(now,b.updatedAt+1)}:b)};
}
export function appendTags(existing:string[],extra:string[]){
 return [...new Set([...existing,...extra].map(t=>t.trim().slice(0,100)).filter(Boolean))].slice(0,100);
}
export function parseHtmlBookmarks(html: string): Bookmark[] {
  // A template is inert: imported HTML cannot execute or fetch embedded resources.
  const template=document.createElement('template');template.innerHTML=html;const doc=template.content;
  const result: Bookmark[] = [];
  for (const a of doc.querySelectorAll('a[href]')) {
    try {
      const raw = a.getAttribute('href') || '';
      const headings:string[]=[];let folder=a.closest('dl');while(folder){const prev=folder.previousElementSibling;const h=prev?.tagName==='H3'?prev:folder.parentElement?.querySelector(':scope > h3');if(h?.textContent?.trim())headings.unshift(h.textContent.trim());folder=folder.parentElement?.closest('dl')||null;}
      result.push(parseBookmark({url: raw, title: a.textContent?.trim() || raw, collection: headings.join(' / '), addedAt: Number(a.getAttribute('add_date')) * 1000 || Date.now()}));
    } catch { /* browser bookmarks may contain unsupported schemes */ }
  }
  return result;
}
export function exportHtml(list: Bookmark[]) {
 const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const tree=collectionTree(list.filter(b=>!b.deleted));
 const link=(b:Bookmark)=>'<DT><A HREF="'+esc(b.url)+'" ADD_DATE="'+Math.floor(b.addedAt/1000)+'">'+esc(b.title)+'</A>';
 const byPath=new Map<string,Bookmark[]>();for(const b of list){if(b.deleted)continue;const group=byPath.get(b.collection)||[];group.push(b);byPath.set(b.collection,group);}
 const render=(node:CollectionNode):string=>'<DT><H3>'+esc(node.name)+'</H3>\n<DL><p>\n'+[...(byPath.get(node.path)||[]).map(link),...node.children.map(render)].join('\n')+'\n</DL><p>';
 const body=[...(byPath.get('')||[]).map(link),...tree.map(render)].join('\n');
 return '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n<TITLE>FluxNav</TITLE>\n<H1>FluxNav</H1>\n<DL><p>\n'+body+'\n</DL><p>';
}

/** Only exact canonical URL duplicates are eligible; choose a survivor explicitly. */
export function duplicateGroups(bookmarks:Bookmark[]){
 const byUrl=new Map<string,Bookmark[]>();
 for(const b of bookmarks){if(b.deleted)continue;const key=canonical(b.url);const group=byUrl.get(key);if(group)group.push(b);else byUrl.set(key,[b]);}
 return [...byUrl.values()].filter(g=>g.length>1);
}
export function mergeDuplicates(library:Library,keepId:string,removeIds:readonly string[],now=Date.now()):Library{
 const keep=library.bookmarks.find(b=>b.id===keepId&&!b.deleted);
 if(!keep)throw Error('要保留的资源不存在');
 const ids=new Set(removeIds.filter(id=>id!==keepId));
 const duplicates=library.bookmarks.filter(b=>ids.has(b.id)&&!b.deleted);
 if(!duplicates.length||duplicates.length!==ids.size||duplicates.some(b=>canonical(b.url)!==canonical(keep.url)))throw Error('只允许合并同一规范化网址的有效资源');
 const all=[keep,...duplicates];
 const texts=(key:'description'|'notes')=>[...new Set(all.map(b=>b[key]).filter(Boolean))].join('\n\n').slice(0,10000);
 const collection=keep.collection||duplicates.find(b=>b.collection)?.collection||'';
 const alternative=[...new Set(all.map(b=>b.collection).filter(c=>c&&c!==collection))];
 const notes=[texts('notes'),alternative.length?'其他收藏集：'+alternative.join('、'):''].filter(Boolean).join('\n\n').slice(0,10000);
 const merged={...keep,description:texts('description'),notes,collection,tags:appendTags([],all.flatMap(b=>b.tags)),favorite:all.some(b=>b.favorite),pinned:all.some(b=>b.pinned),archived:all.every(b=>b.archived),addedAt:Math.min(...all.map(b=>b.addedAt)),lastVisited:Math.max(...all.map(b=>b.lastVisited)),visitCount:all.reduce((n,b)=>Math.min(Number.MAX_SAFE_INTEGER,n+b.visitCount),0),updatedAt:Math.max(now,keep.updatedAt+1)};
 return {...library,bookmarks:library.bookmarks.map(b=>b.id===keepId?merged:ids.has(b.id)?{...b,deleted:true,updatedAt:Math.max(now,b.updatedAt+1)}:b)};
}
export function renameCollection(library:Library,from:string,to:string,now=Date.now()):Library{
 const target=to.trim().slice(0,150);
 if(!from||from===target)throw Error('请输入不同的收藏集名称');
 const ids=library.bookmarks.filter(b=>!b.deleted&&b.collection===from).map(b=>b.id);
 return patchBookmarks(library,ids,{collection:target},now);
}

export const collectionSeparator=' / ';
export const inCollection=(value:string,path:string)=>value===path||value.startsWith(path+collectionSeparator);
export type CollectionNode={name:string;path:string;count:number;children:CollectionNode[]};
export function collectionTree(bookmarks:Bookmark[]):CollectionNode[]{
 const roots:CollectionNode[]=[];const nodes=new Map<string,CollectionNode>();
 for(const b of bookmarks){if(b.deleted||!b.collection)continue;const parts=b.collection.split(collectionSeparator);let parent:CollectionNode|undefined;let path='';
  for(let i=0;i<parts.length;i++){path=i?path+collectionSeparator+parts[i]:parts[i];let node=nodes.get(path);
   if(!node){node={name:parts[i],path,count:0,children:[]};nodes.set(path,node);(parent?parent.children:roots).push(node);}
   node.count++;parent=node;
  }
 }
 const sort=(items:CollectionNode[])=>{items.sort((a,b)=>a.name.localeCompare(b.name,'zh-CN'));for(const n of items)sort(n.children);};sort(roots);return roots;
}
export function renameCollectionTree(library:Library,from:string,to:string,now=Date.now()):Library{
 const target=to.trim();if(!from||target===from)throw Error('请输入不同的收藏集路径');
 if(target&&inCollection(target,from))throw Error('不能将收藏集移动到自身的子级');
 const affected=library.bookmarks.filter(b=>!b.deleted&&inCollection(b.collection,from));
 if(!affected.length)throw Error('收藏集不存在');
 const changes=new Map(affected.map(b=>{const suffix=b.collection.slice(from.length);return [b.id,target?target+suffix:suffix.startsWith(collectionSeparator)?suffix.slice(collectionSeparator.length):''];}));
 if([...changes.values()].some(p=>p.length>150))throw Error('移动后收藏集路径超过 150 字符');
 return {...library,bookmarks:library.bookmarks.map(b=>changes.has(b.id)?{...b,collection:changes.get(b.id)!,updatedAt:Math.max(now,b.updatedAt+1)}:b)};
}
export function reorderBookmark(library:Library,source:string,target:string,side:'before'|'after',now=Date.now()):Library{
 if(source===target)return library;
 const active=library.bookmarks.filter(b=>!b.deleted&&!b.archived),a=active.find(b=>b.id===source),b=active.find(b=>b.id===target);
 if(!a||!b||a.pinned!==b.pinned)throw Error('只能在同一置顶分组内排序');
 const ordered=searchBookmarks(active.filter(x=>x.pinned===a.pinned),'','manual');
 const next=ordered.filter(x=>x.id!==source);const index=next.findIndex(x=>x.id===target);next.splice(index+(side==='after'?1:0),0,a);
 if(next.every((x,i)=>x.id===ordered[i].id))return library;
 const ranks=new Map(next.map((x,i)=>[x.id,(i+1)*1024]));
 return {...library,bookmarks:library.bookmarks.map(x=>ranks.has(x.id)&&ranks.get(x.id)!==x.order?{...x,order:ranks.get(x.id),updatedAt:Math.max(now,x.updatedAt+1)}:x)};
}

/** Direct-origin favicon only; no external lookup service or bookmark path disclosure. */
export function faviconUrl(url:string){
 try{const u=new URL(normalizeUrl(url));return u.protocol==='https:'?u.origin+'/favicon.ico':null;}catch{return null;}
}

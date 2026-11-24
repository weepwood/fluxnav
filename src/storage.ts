import {chooseBookmark,emptyLibrary,mergeLibraries,parseBookmark,parseLibrary,type Bookmark,type Library} from './domain.ts';
export const readLocal=(key:string):string|null=>{try{return localStorage.getItem(key);}catch{return null;}};
export const writeLocal=(key:string,value:string)=>{try{localStorage.setItem(key,value);return true;}catch{return false;}};
export function readSettings<T>(key:string,defaults:T):T{try{const raw=JSON.parse(readLocal(key)||'null');return raw&&typeof raw==='object'&&!Array.isArray(raw)?{...defaults,...raw}:defaults;}catch{return defaults;}}
let connection:Promise<IDBDatabase>|undefined;
let cached:{revision:number;records:Map<string,Bookmark>}|undefined;
function db(){
 if(!connection){
  connection=new Promise<IDBDatabase>((resolve,reject)=>{
   const req=indexedDB.open('fluxnav-v1',2);let abandoned=false;
   req.onupgradeneeded=()=>{
    const d=req.result,tx=req.transaction!;
    if(!d.objectStoreNames.contains('data'))d.createObjectStore('data');
    if(!d.objectStoreNames.contains('bookmarks')){
     const records=d.createObjectStore('bookmarks',{keyPath:'id'}),data=tx.objectStore('data'),old=data.get('library');
     // Migrate in one version-change transaction; old blob remains as recovery source.
     old.onsuccess=()=>{try{if(old.result!==undefined){const parsed=parseLibrary(old.result);for(const b of parsed.bookmarks)records.put(b);}data.put(0,'revision');}catch{tx.abort();}};
    }
   };
   req.onsuccess=()=>{if(abandoned){req.result.close();return;}req.result.onversionchange=()=>{req.result.close();connection=undefined;cached=undefined;};resolve(req.result);};
   req.onerror=()=>reject(req.error);req.onblocked=()=>{abandoned=true;reject(Error('数据库被旧标签页占用，请关闭其他 FluxNav 页面后刷新'));};
  });
  void connection.catch(()=>{connection=undefined;cached=undefined;});
 }
 return connection;
}
async function get(key:string):Promise<unknown>{const d=await db();return new Promise((resolve,reject)=>{const req=d.transaction('data').objectStore('data').get(key);req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function put(key:string,value:unknown){const d=await db();await new Promise<void>((resolve,reject)=>{const tx=d.transaction('data','readwrite');tx.objectStore('data').put(value,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('写入中止'));});}
async function mergeIntoDatabase(library:Library):Promise<Library>{
 const d=await db();
 return new Promise((resolve,reject)=>{
  const tx=d.transaction(['data','bookmarks'],'readwrite'),meta=tx.objectStore('data'),store=tx.objectStore('bookmarks'),rev=meta.get('revision');
  let result:Library=library,nextCache:typeof cached;
  const fail=(e:unknown)=>{reject(e);try{tx.abort();}catch{/* already aborted */}};
  const merge=(prior:Map<string,Bookmark>,revision:number)=>{
   try{
    let records=prior;let changed=false;
    for(const b of library.bookmarks){const prev=records.get(b.id),winner=chooseBookmark(prev,b);if(winner!==prev){if(!changed)records=new Map(prior);records.set(b.id,winner);store.put(winner);changed=true;}}
    if(records.size>100000)throw Error('书签数量超过存储上限');
    const next=changed?revision+1:revision;if(changed)meta.put(next,'revision');
    nextCache={revision:next,records};result={schemaVersion:1,bookmarks:[...records.values()]};
   }catch(e){fail(e);}
  };
  rev.onsuccess=()=>{
   const revision=typeof rev.result==='number'&&Number.isSafeInteger(rev.result)&&rev.result>=0?rev.result:0;
   if(cached&&cached.revision===revision){merge(cached.records,revision);return;}
   const request=store.getAll();request.onsuccess=()=>{try{const records=new Map<string,Bookmark>();for(const raw of request.result){const b=parseBookmark(raw);records.set(b.id,b);}merge(records,revision);}catch(e){fail(e);}};
  };
  tx.oncomplete=()=>{cached=nextCache;resolve(result);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>{cached=undefined;reject(tx.error||Error('数据写入已中止'));};
 });
}
const FALLBACK='fluxnav-v1-fallback';
function readBackup(key:string){const raw=readLocal(key);if(!raw)return {raw,library:undefined,invalid:false};try{return {raw,library:parseLibrary(JSON.parse(raw)),invalid:false};}catch{return {raw,library:undefined,invalid:true};}}
export async function loadLibrary():Promise<{library:Library;warning:string}>{
 const legacy=readBackup('fluxnav-bookmarks'),fallback=readBackup(FALLBACK);
 const warning=[legacy.invalid?'旧数据无法解析，原始数据仍保留。':'',fallback.invalid?'降级数据无法解析，原始数据仍保留。':''].filter(Boolean).join(' ');
 try{
  const current=await mergeIntoDatabase(emptyLibrary());
  const recovered=current.bookmarks.length?current:legacy.library||current;
  return {library:await mergeIntoDatabase(fallback.library?mergeLibraries(recovered,fallback.library):recovered),warning};
 }catch(e){return {library:fallback.library||legacy.library||emptyLibrary(),warning:'IndexedDB 不可用或数据异常；原始数据库未被覆盖。'+(e as Error).message+' '+warning};}
}
let queue=Promise.resolve();
export function saveLibrary(library:Library):Promise<{warning:string;library:Library}>{
 const operation=queue.then(async()=>{
  const fallback=readBackup(FALLBACK);
  try{
   const merged=await mergeIntoDatabase(fallback.library?mergeLibraries(library,fallback.library):library);
   if(!fallback.invalid&&readLocal(FALLBACK)===fallback.raw)try{localStorage.removeItem(FALLBACK);}catch{}
   return {warning:fallback.invalid?'存在损坏的降级备份，已保留原始内容。':'',library:merged};
  }catch{
   const merged=fallback.library?mergeLibraries(library,fallback.library):library;
   if(fallback.invalid)return {library:merged,warning:'降级备份已损坏，未覆盖原始文件；当前修改仅在内存中，请导出。'};
   if(merged.bookmarks.length>100000)return {library,warning:'超过存储上限；当前修改仅在内存中，请导出。'};
   return {library:merged,warning:writeLocal(FALLBACK,JSON.stringify(merged))?'使用 LocalStorage 降级存储，请定期导出。':'临时体验模式：刷新后数据将丢失，请导出备份。'};
  }
 });
 queue=operation.then(()=>{},()=>{});return operation;
}
export async function snapshot(library:Library){await put('snapshot',library);}
export async function restoreSnapshot(){const value=await get('snapshot');if(!value)throw Error('没有可用的本地快照');return parseLibrary(value);}

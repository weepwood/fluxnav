import {canonical,domain,normalizeUrl,parseBookmark,mergeLibraries,newId,type Bookmark,type Library} from './domain.ts';
export const MAX_IMPORT_ROWS=100000,MAX_FILE_BYTES=30*1024*1024;
export type ImportIssue={row:number;kind:'invalid'|'repair'|'duplicate';message:string};
export type ImportReport={source:'json'|'html';total:number;records:Bookmark[];issues:ImportIssue[];invalid:number;repaired:number;duplicateIds:number;duplicateUrls:number;restoreAllowed:boolean};
type Candidate={row:number;value:unknown};
const isObject=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown)=>typeof v==='string'?v:'';
function importUrl(value:unknown){
 if(typeof value!=='string'||value.length>10000)throw Error('网址缺失或过长');
 const s=value.trim();
 // Do not interpret arbitrary words, relative URLs or browser-only schemes as sites.
 if(!/^https?:\/\//i.test(s)&&! /^(?:localhost|(?:[\p{L}\d-]+\.)+[\p{L}\d-]+|\[[0-9a-f:]+\])(?::\d+)?(?:[/?#]|$)/iu.test(s))throw Error('不支持的网址格式或协议');
 return normalizeUrl(s);
}
const dates=['addedAt','updatedAt','lastVisited','visitCount','order'] as const;
const bools=['favorite','pinned','archived','deleted'] as const;
export function analyzeCandidates(rows:Candidate[],source:ImportReport['source'],trustedEnvelope=false,now=Date.now()):ImportReport{
 if(rows.length>MAX_IMPORT_ROWS)throw Error('单次最多导入 100,000 条记录');
 const report:ImportReport={source,total:rows.length,records:[],issues:[],invalid:0,repaired:0,duplicateIds:0,duplicateUrls:0,restoreAllowed:trustedEnvelope};
 const ids=new Set<string>(),urls=new Set<string>();
 const issue=(row:number,kind:ImportIssue['kind'],message:string)=>report.issues.push({row,kind,message});
 for(const {row,value} of rows){
  try{
   if(!isObject(value))throw Error('不是有效的书签对象');
   const url=importUrl(value.url??value.href);
   const fix:string[]=[];
   const title=text(value.title??value.name).trim()||domain(url);
   if(typeof value.title!=='string'||!value.title.trim())fix.push('标题缺失，使用名称或域名');
   const tags=Array.isArray(value.tags)?value.tags.filter((t):t is string=>typeof t==='string'):typeof value.tags==='string'?value.tags.split(/[,，;；]/):[];
   if(value.tags!==undefined&&(!Array.isArray(value.tags)||value.tags.some(t=>typeof t!=='string')))fix.push('修复标签格式');
   const id=text(value.id).trim();const validId=!!id&&id.length<=150&&id===value.id;
   if(trustedEnvelope&&!validId)fix.push('ID 缺失或无效');
   const normalized:Record<string,unknown>={...value,url,title,tags,id:validId?id:newId(),collection:text(value.collection??value.folder),description:text(value.description),notes:text(value.notes)};
   for(const key of ['title','description','notes','collection'] as const){const v=normalized[key] as string;const max=key==='title'?300:key==='collection'?150:10000;if(v.length>max)fix.push(key+' 超长，已截断');if(value[key]!==undefined&&typeof value[key]!=='string')fix.push(key+' 类型错误');}
   if(tags.length>100||tags.some(t=>t.length>100))fix.push('标签数量或长度超限，已截断');
   for(const key of dates){const v=value[key];const isTime=key==='addedAt'||key==='updatedAt'||key==='lastVisited';if(v!==undefined&&(!Number.isSafeInteger(v)||Number(v)<0||(isTime&&Number(v)>now+86400000))){delete normalized[key];fix.push(key+' 无效，使用默认值');}}
   if(trustedEnvelope&&(!Number.isSafeInteger(value.addedAt)||!Number.isSafeInteger(value.updatedAt)))fix.push('备份缺少版本时间');
   for(const key of bools){if(value[key]!==undefined&&typeof value[key]!=='boolean'){normalized[key]=false;fix.push(key+' 类型错误');}}
   const bookmark=parseBookmark(normalized);
   if(ids.has(bookmark.id)){report.duplicateIds++;report.restoreAllowed=false;issue(row,'duplicate','重复 ID；添加模式将重新分配 ID');bookmark.id=newId();}
   ids.add(bookmark.id);
   const key=canonical(bookmark.url);if(!bookmark.deleted){if(urls.has(key)){report.duplicateUrls++;issue(row,'duplicate','文件内重复网址，添加模式将跳过');}urls.add(key);}
   if(fix.length){report.repaired++;report.restoreAllowed=false;issue(row,'repair',fix.join('；'));}
   // Restore only exact exported records; repairable foreign records may be added, never overwrite by ID.
   if(trustedEnvelope&&(value.url!==bookmark.url||value.id!==bookmark.id||value.title!==bookmark.title||!Array.isArray(value.tags)||bools.some(k=>typeof value[k]!=='boolean')||typeof value.description!=='string'||typeof value.notes!=='string'||typeof value.collection!=='string'||!Number.isSafeInteger(value.lastVisited)||!Number.isSafeInteger(value.visitCount)))report.restoreAllowed=false;
   report.records.push(bookmark);
  }catch(e){report.invalid++;report.restoreAllowed=false;issue(row,'invalid',(e as Error).message||'无效书签');}
 }
 return report;
}
export function analyzeJson(raw:unknown,now=Date.now()):ImportReport{
 const envelope=isObject(raw)&&Array.isArray(raw.bookmarks);
 if(envelope&&raw.schemaVersion!==undefined&&raw.schemaVersion!==1)throw Error('不支持的备份版本，不会尝试导入');
 const list=Array.isArray(raw)?raw:envelope?raw.bookmarks:null;
 if(!Array.isArray(list))throw Error('JSON 必须是书签数组或 FluxNav 备份');
 if(list.length>MAX_IMPORT_ROWS)throw Error('单次最多导入 100,000 条记录');
 return analyzeCandidates(list.map((value,i)=>({row:i+1,value})),'json',envelope&&raw.schemaVersion===1,now);
}
export function analyzeHtml(html:string):ImportReport{
 // Template content is inert and never inserted into the visible document.
 const template=document.createElement('template');template.innerHTML=html;
 const anchors=template.content.querySelectorAll('a[href]');
 if(anchors.length>MAX_IMPORT_ROWS)throw Error('单次最多导入 100,000 条记录');
 const rows:Candidate[]=[];
 for(let i=0;i<anchors.length;i++){const a=anchors[i];const headings:string[]=[];let folder=a.closest('dl');
  while(folder){const prev=folder.previousElementSibling;const h=prev?.tagName==='H3'?prev:folder.parentElement?.querySelector(':scope > h3');if(h?.textContent?.trim())headings.unshift(h.textContent.trim());folder=folder.parentElement?.closest('dl')||null;}
  const added=Number(a.getAttribute('add_date'));rows.push({row:i+1,value:{url:a.getAttribute('href'),title:a.textContent?.trim(),collection:headings.join(' / '),...(added>0?{addedAt:added*1000}:{})}});
 }
 return analyzeCandidates(rows,'html');
}
export function decodeImport(buffer:ArrayBuffer,encoding='auto'){
 const bytes=new Uint8Array(buffer);
 let chosen=encoding==='auto'?(bytes[0]===255&&bytes[1]===254?'utf-16le':bytes[0]===254&&bytes[1]===255?'utf-16be':'utf-8'):encoding;
 try{return new TextDecoder(chosen,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');}catch{throw Error('文件编码无法解析，请选择实际编码后重试（如 GB18030）');}
}
export function previewImport(report:ImportReport,library:Library,mode:'merge'|'restore'){
 const known=new Set(library.bookmarks.filter(b=>!b.deleted).map(b=>canonical(b.url))),ids=new Map(library.bookmarks.map(b=>[b.id,b]));
 let added=0,skipped=0,updated=0,deletions=0;
 const records:Bookmark[]=[];
 if(mode==='restore'){
  if(!report.restoreAllowed)throw Error('只有完整且无异常的 FluxNav JSON 备份可以按 ID 恢复');
  for(const b of report.records){const current=ids.get(b.id);if(!current){added++;if(b.deleted)deletions++;}else{const winner=mergeLibraries({schemaVersion:1,bookmarks:[current]},{schemaVersion:1,bookmarks:[b]}).bookmarks[0];if(winner===current){skipped++;continue;}updated++;if(b.deleted&&!current.deleted)deletions++;}records.push(b);}
 }else{
  for(const b of report.records){const key=canonical(b.url);if(b.deleted||known.has(key)){skipped++;continue;}known.add(key);added++;records.push(b);}
 }
 if(library.bookmarks.length+added>MAX_IMPORT_ROWS)throw Error('合并后超过 100,000 条存储上限，请分库或清理后再导入');
 return {added,skipped,updated,deletions,records};
}

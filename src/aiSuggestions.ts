import {appendTags,canonical,parseBookmark,newId,type Bookmark,type Library} from './domain.ts';
import {analyzeJson} from './imports.ts';
export type OrganizeSuggestion={id:string;expectedUpdatedAt:number;tags?:string[];collection?:string;reason?:string};
export type AIResult<T>={items:T[];issues:string[]};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export const MAX_AI_BATCH=50;
export function readAIArray(content:string,max=100):unknown[]{
 if(content.length>1024*1024)throw Error('AI 返回内容过大');
 const raw=JSON.parse(content.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));
 if(!Array.isArray(raw)||raw.length>max)throw Error('AI 必须返回不超过 '+max+' 项的 JSON 数组');
 return raw;
}
export function parseAddSuggestions(content:string,existing:Bookmark[]):AIResult<Bookmark>{
 const raw=readAIArray(content),issues:string[]=[];
 // Model cannot set IDs, flags, visit history, version timestamps or deletion state.
 const report=analyzeJson(raw.map(v=>object(v)?{url:v.url,title:v.title,description:v.description,tags:v.tags,notes:v.notes,collection:v.collection}:v));
 const known=new Set(existing.filter(b=>!b.deleted).map(b=>canonical(b.url))),items:Bookmark[]=[];
 for(const issue of report.issues)issues.push('第 '+issue.row+' 项：'+issue.message);
 for(const b of report.records){const key=canonical(b.url);if(known.has(key)){issues.push('跳过重复网址：'+b.title);continue;}known.add(key);items.push({...b,id:newId()});}
 return {items,issues};
}
export function parseOrganizeSuggestions(content:string,source:Bookmark[]):AIResult<OrganizeSuggestion>{
 const raw=readAIArray(content,MAX_AI_BATCH),known=new Map(source.map(b=>[b.id,b])),seen=new Set<string>(),items:OrganizeSuggestion[]=[],issues:string[]=[];
 raw.forEach((v,i)=>{
  const skip=(reason:string)=>issues.push('第 '+(i+1)+' 项：'+reason);
  if(!object(v)||typeof v.id!=='string'||!known.has(v.id)){skip('未知资源 ID');return;}
  const b=known.get(v.id)!;if(seen.has(b.id)){skip('重复建议 ID');return;}seen.add(b.id);
  if(b.deleted||b.archived){skip('资源已删除或归档');return;}
  const suggestion:OrganizeSuggestion={id:b.id,expectedUpdatedAt:b.updatedAt};
  if(v.tags!==undefined){if(!Array.isArray(v.tags)||v.tags.length>100||v.tags.some(t=>typeof t!=='string'||t.length>100)){skip('标签格式错误');return;}suggestion.tags=appendTags([],v.tags);}
  if(v.collection!==undefined){if(typeof v.collection!=='string'||v.collection.length>150){skip('收藏集格式错误');return;}suggestion.collection=v.collection.trim();}
  if(typeof v.reason==='string')suggestion.reason=v.reason.slice(0,300);
  if(suggestion.tags===undefined&&suggestion.collection===undefined){skip('没有有效整理字段');return;}
  if(suggestion.tags!==undefined&&JSON.stringify(suggestion.tags)===JSON.stringify(b.tags)&& (suggestion.collection===undefined||suggestion.collection===b.collection))return;
  if(suggestion.tags===undefined&&suggestion.collection===b.collection)return;
  items.push(suggestion);
 });return {items,issues};
}
export function applyOrganizeSuggestions(library:Library,suggestions:OrganizeSuggestion[],tagMode:'append'|'replace',now=Date.now()){
 const byId=new Map(suggestions.map(s=>[s.id,s])),skipped:string[]=[];let changed=0;
 const bookmarks=library.bookmarks.map(b=>{
  const s=byId.get(b.id);if(!s)return b;byId.delete(b.id);
  if(b.deleted||b.archived||b.updatedAt!==s.expectedUpdatedAt){skipped.push(b.id);return b;}
  const tags=s.tags===undefined?b.tags:tagMode==='append'?appendTags(b.tags,s.tags):appendTags([],s.tags);
  const collection=s.collection??b.collection;
  if(JSON.stringify(tags)===JSON.stringify(b.tags)&&collection===b.collection)return b;
  changed++;return {...b,tags,collection,updatedAt:Math.max(now,b.updatedAt+1)};
 });
 skipped.push(...byId.keys());return {library:changed?{...library,bookmarks}:library,changed,skipped};
}
export function parseSearchSuggestions(content:string,source:Bookmark[]):AIResult<string>{
 const known=new Set(source.map(b=>b.id)),seen=new Set<string>(),items:string[]=[],issues:string[]=[];
 readAIArray(content,MAX_AI_BATCH).forEach((v,i)=>{if(typeof v!=='string'||!known.has(v)){issues.push('第 '+(i+1)+' 项：未知资源 ID');return;}if(!seen.has(v)){seen.add(v);items.push(v);}});
 return {items,issues};
}
export function tagKey(value:string){return value.trim().normalize('NFKC').toLocaleLowerCase('en-US');}
export function tagGroups(bookmarks:Bookmark[]){
 const counts=new Map<string,number>();
 for(const b of bookmarks)if(!b.deleted)for(const t of new Set(b.tags))counts.set(t,(counts.get(t)||0)+1);
 const groups=new Map<string,{tag:string;count:number}[]>();
 for(const [tag,count] of counts){const key=tagKey(tag);const group=groups.get(key)||[];group.push({tag,count});groups.set(key,group);}
 return [...groups.values()].map(g=>g.sort((a,b)=>b.count-a.count||a.tag.localeCompare(b.tag))).sort((a,b)=>b.length-a.length||b[0].count-a[0].count||a[0].tag.localeCompare(b[0].tag));
}
export function mergeTags(library:Library,sources:string[],target:string,now=Date.now()){
 const replacement=target.trim();if(!replacement||replacement.length>100)throw Error('目标标签不能为空，且最多 100 字符');
 const selected=new Set(sources);if(!selected.size)throw Error('请选择需要归并的标签');
 let changed=0;
 const bookmarks=library.bookmarks.map(b=>{if(b.deleted||!b.tags.some(t=>selected.has(t)))return b;const tags=[...new Set(b.tags.map(t=>selected.has(t)?replacement:t))];if(JSON.stringify(tags)===JSON.stringify(b.tags))return b;changed++;return {...b,tags,updatedAt:Math.max(now,b.updatedAt+1)};});
 return {library:changed?{...library,bookmarks}:library,changed};
}
export function sourceForAI(bookmarks:Bookmark[]){
 // Only metadata fields needed for classification/search; query, fragment, notes and descriptions never sent.
 return bookmarks.map(b=>({id:b.id,title:b.title,url:new URL(b.url).origin,tags:b.tags,collection:b.collection}));
}

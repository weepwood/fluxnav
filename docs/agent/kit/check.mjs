// Lightweight, read-only project-memory validation. No network or dependencies.
import {lstat,readFile,readdir} from 'node:fs/promises';
import {resolve,relative,dirname,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const required=['AGENTS.md',...['PROJECT','ARCHITECTURE','STATE','ROADMAP','DESIGN','DECISIONS','HANDOFF'].map(n=>'docs/agent/'+n+'.md')];
const datePattern=/^(?:最后核实(?:日期)?|日期)\s*[：:]\s*(\d{4}-\d{2}-\d{2})(?!\d)/m;
const maxAgeDays=30;
export async function inspectMemory(root,now=new Date()){
 root=resolve(root);const errors=[],warnings=[],documents=new Map();
 async function safeStat(path){
  const rel=relative(root,path);if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep))throw Error('path leaves project');
  let current=root;let s=await lstat(root);if(s.isSymbolicLink()||!s.isDirectory())throw Error('unsafe project root');
  for(const part of rel.split(sep).filter(Boolean)){current=resolve(current,part);s=await lstat(current);if(s.isSymbolicLink())throw Error('symbolic link: '+part);}
  return s;
 }
 async function readDocument(rel){
  try{const path=resolve(root,rel);if(!(await safeStat(path)).isFile())throw Error('not a file');const content=await readFile(path,'utf8');if(!content.trim())throw Error('empty document');documents.set(rel,content);}
  catch(e){errors.push(rel+': '+e.message);}
 }
 for(const rel of required)await readDocument(rel);
 // Walk only the memory directory, not application source or unrelated personal files.
 async function scan(rel){
  try{const path=resolve(root,rel);if(!(await safeStat(path)).isDirectory())throw Error('not a directory');for(const item of await readdir(path,{withFileTypes:true})){const child=rel+'/'+item.name;if(item.isSymbolicLink()){errors.push(child+': symbolic link');continue;}if(item.isDirectory())await scan(child);else if(item.isFile()&&/\.md$/i.test(child)&&!documents.has(child))await readDocument(child);}}
  catch(e){errors.push(rel+': '+e.message);}
 }
 if(documents.has('docs/agent/STATE.md'))await scan('docs/agent');
 for(const [rel,content] of documents){
  // This is intentionally a simple check for ordinary inline Markdown links, not a full parser.
  const prose=content.replace(/^```[^\n]*\n[\s\S]*?^```[^\n]*$/gm,'').replace(/\x60[^\x60\n]*\x60/g,'');
  for(const m of prose.matchAll(/!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)){
   const raw=m[1].replace(/^<|>$/g,'');if(raw.startsWith('#')||/^[a-z][a-z\d+.-]*:/i.test(raw)||raw.startsWith('//'))continue;
   try{const path=resolve(root,dirname(rel),decodeURIComponent(raw.split('#')[0]));await safeStat(path);}
   catch(e){errors.push(rel+' -> '+raw+': '+e.message);}
  }
  if(/(?:STATE|HANDOFF)\.md$/.test(rel)){
   const date=content.match(datePattern)?.[1];const ms=date?Date.parse(date+'T00:00:00Z'):NaN;
   if(!date||!Number.isFinite(ms)||new Date(ms).toISOString().slice(0,10)!==date){warnings.push(rel+': missing or invalid verification date');continue;}
   const today=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());const age=Math.floor((today-ms)/86400000);
   if(age<0)warnings.push(rel+': verification date is in the future');else if(age>maxAgeDays)warnings.push(rel+': last verified '+age+' days ago; recheck Git/CI before editing');
   if(/待核实|待填/.test(content)&&/最后核实日期：待填|日期 \/ 用户目标/.test(content))warnings.push(rel+': template needs real project facts');
  }
 }
 return {errors:[...new Set(errors)],warnings:[...new Set(warnings)],documents:documents.size};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=await inspectMemory(process.argv[2]||process.cwd());
 for(const message of result.errors)console.error('ERROR '+message);
 for(const message of result.warnings)console.warn('WARN '+message);
 console.log('Memory: '+result.documents+' documents, '+result.errors.length+' errors, '+result.warnings.length+' warnings');
 if(result.errors.length)process.exitCode=1;
}

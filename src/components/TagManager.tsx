import {useMemo,useState} from 'react';
import {mergeTags,tagGroups} from '../aiSuggestions';
import type {Library} from '../domain';
import {Dialog} from './Dialog';
export function TagManager({library,onApply,onClose}:{library:Library;onApply:(sources:string[],target:string)=>void;onClose:()=>void}){
 const [query,setQuery]=useState(''),[selected,setSelected]=useState<Set<string>>(new Set()),[target,setTarget]=useState(''),[error,setError]=useState(''),[limit,setLimit]=useState(100);
 const groups=useMemo(()=>tagGroups(library.bookmarks),[library]);
 const flat=useMemo(()=>groups.flat(),[groups]);const matches=flat.filter(t=>t.tag.toLowerCase().includes(query.toLowerCase()));
 const duplicates=groups.filter(g=>g.length>1);
 const affected=useMemo(()=>library.bookmarks.filter(b=>!b.deleted&&b.tags.some(t=>selected.has(t))).length,[library,selected]);
 return <Dialog title="标签管理" onClose={onClose}><div className="form"><p className="muted">本地操作，不调用 AI。归并大小写、全角等重复标签，或手动选择多个标签统一命名。包括归档资源，不处理回收站。</p><p>{flat.length} 个标签 · {duplicates.length} 组可能重复</p>{duplicates.length>0&&<details><summary>可能重复的标签组</summary><div className="preview-list">{duplicates.slice(0,50).map((g,i)=><button key={i} onClick={()=>{setSelected(new Set(g.map(t=>t.tag)));setTarget(g[0].tag);}}}>{g.map(t=>t.tag+' ('+t.count+')').join(' / ')}</button>)}</div></details>}
 <label>筛选标签<input value={query} onChange={e=>{setQuery(e.target.value);setLimit(100);}}/></label><div className="inline between"><small>已选 {selected.size} 个标签 · 涉及 {affected} 条资源</small><button onClick={()=>setSelected(new Set())}>清空选择</button></div><div className="preview-list">{matches.slice(0,limit).map(t=><label className="preview-row" key={t.tag}><input type="checkbox" checked={selected.has(t.tag)} onChange={e=>setSelected(old=>{const next=new Set(old);if(e.target.checked)next.add(t.tag);else next.delete(t.tag);return next;})}/><span>{t.tag} · {t.count} 条</span></label>)}</div>{matches.length>limit&&<button onClick={()=>setLimit(n=>n+100)}>加载更多标签</button>}
 <label>目标标签<input maxLength={100} value={target} onChange={e=>setTarget(e.target.value)} placeholder="例如：React"/></label>{error&&<p className="error" role="alert">{error}</p>}<button className="primary" disabled={!selected.size||!target.trim()} onClick={()=>{try{const sources=[...selected];const plan=mergeTags(library,sources,target);if(!plan.changed){setError('没有需要更新的资源');return;}onApply(sources,target);onClose();}catch(e){setError((e as Error).message);}}}>确认归并（{affected} 条资源）</button></div></Dialog>;
}

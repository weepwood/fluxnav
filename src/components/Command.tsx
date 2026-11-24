import {useDeferredValue,useMemo,useState} from 'react';
import {domain,searchBookmarks,type Bookmark} from '../domain';
import {Dialog} from './Dialog';
export function Command({bookmarks,onClose,open,onAdd,onSettings,onAI}:{bookmarks:Bookmark[];onClose:()=>void;open:(b:Bookmark)=>void;onAdd:()=>void;onSettings:()=>void;onAI:()=>void}){
 const [query,setQuery]=useState(''),[index,setIndex]=useState(0);
 const deferred=useDeferredValue(query);
 const commands=useMemo(()=>[{title:'添加资源',run:onAdd},{title:'设置与同步',run:onSettings},{title:'AI 工作台',run:onAI}].filter(x=>x.title.includes(query)),[query,onAdd,onSettings,onAI]);
 const results=useMemo(()=>searchBookmarks(bookmarks,deferred,'relevance').slice(0,12).map(b=>({title:b.title,subtitle:domain(b.url),run:()=>{open(b);onClose();}})),[bookmarks,deferred,open,onClose]);
 const all=[...results,...commands.map(c=>({...c,subtitle:'操作'}))];const active=Math.min(index,Math.max(0,all.length-1));
 return <Dialog title="全局搜索" onClose={onClose}><div className="form"><input autoFocus aria-label="搜索资源和命令" value={query} placeholder="搜索资源或执行命令…" onChange={e=>{setQuery(e.target.value);setIndex(0);}} onKeyDown={e=>{if(e.key==='ArrowDown'){e.preventDefault();setIndex((active+1)%Math.max(1,all.length));}if(e.key==='ArrowUp'){e.preventDefault();setIndex((active+all.length-1)%Math.max(1,all.length));}if(e.key==='Enter'&&!e.nativeEvent.isComposing&&query===deferred&&all[active]){e.preventDefault();all[active].run();}}}/><div className="command-results">{all.map((x,i)=><button key={i} aria-current={i===active} onClick={x.run}><span className="command-label"><strong>{x.title}</strong><small>{x.subtitle}</small></span><span>↵</span></button>)}{!all.length&&<p className="muted">没有结果</p>}</div><small className="muted">↑ ↓ 选择 · Enter 执行 · Esc 关闭</small></div></Dialog>;
}

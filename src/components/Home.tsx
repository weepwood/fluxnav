import {useMemo,useRef} from 'react';
import {domain,searchBookmarks,type Bookmark,type Sort} from '../domain';
export function SiteIcon({bookmark}:{bookmark:Bookmark}) {return <span className="site-icon" aria-hidden="true">{domain(bookmark.url).slice(0,2).toUpperCase()}</span>;}
export function Home({bookmarks,query,setQuery,tag,setTag,sort,open,onManage,onCommand}:{bookmarks:Bookmark[];query:string;setQuery:(s:string)=>void;tag:string;setTag:(s:string)=>void;sort:Sort;open:(b:Bookmark)=>void;onManage:()=>void;onCommand:()=>void}){
 const tags=useMemo(()=>[...new Set(bookmarks.flatMap(b=>b.tags))].sort(),[bookmarks]);
 const items=useMemo(()=>searchBookmarks(bookmarks.filter(b=>!tag||b.tags.includes(tag)),query,sort),[bookmarks,query,tag,sort]);
 const ref=useRef<HTMLInputElement>(null);
 return <div className="home"><header className="home-header"><a className="brand" href="#/"><span className="brand-mark">F</span>FluxNav</a><div className="inline"><button className="quiet" onClick={onCommand}>快捷搜索 <kbd>⌘ K</kbd></button><button className="quiet" onClick={onManage}>管理书签 ↗</button></div></header>
 <main className="home-main"><p className="eyebrow">PERSONAL START PAGE</p><h1>FluxNav</h1><p className="home-subtitle">搜索，然后出发。你的常用网站都在这里。</p>
 <div className="home-search"><span aria-hidden="true">⌕</span><input ref={ref} aria-label="搜索网站或标签" placeholder="搜索网站或标签" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&items[0])open(items[0]);}}/>{query&&<button className="quiet" onClick={()=>setQuery('')}>清除</button>}<kbd>ENTER ↗</kbd></div>
 <nav className="home-tags" aria-label="书签标签">{['',...tags].map(t=><button key={t} aria-pressed={tag===t} className={tag===t?'active':''} onClick={()=>setTag(t)}>{t||'全部'}</button>)}</nav>
 <div className="home-links">{items.slice(0,200).map(b=><a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" onClick={e=>{e.preventDefault();open(b);}}><SiteIcon bookmark={b}/><span><strong>{b.title}</strong><small>{domain(b.url)}</small></span><span className="link-arrow">↗</span></a>)}</div>
 {!items.length&&<div className="empty"><h2>{bookmarks.length?'没有匹配结果':'建立你的个人资源库'}</h2><button onClick={bookmarks.length?()=>{setQuery('');setTag('');}:onManage}>{bookmarks.length?'清除筛选':'添加第一个书签'}</button></div>}{items.length>200&&<button onClick={onManage}>在管理页查看全部 {items.length} 项</button>}</main></div>;
}

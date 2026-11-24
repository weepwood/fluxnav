import {memo,useDeferredValue,useMemo,useState} from 'react';
import type {Appearance} from './Appearance';
import {useSearch} from '../useSearch';
import {Icon} from './Icon';
import {domain,faviconUrl,type Bookmark,type Sort} from '../domain';
const failedIcons=new Set<string>();
export const SiteIcon=memo(function SiteIcon({bookmark,remote=false}:{bookmark:Bookmark;remote?:boolean}) {
 const host=domain(bookmark.url),src=remote?faviconUrl(bookmark.url):null;
 const hue=[...host].reduce((n,c)=>(n*31+c.charCodeAt(0))%360,0);
 const [failed,setFailed]=useState<string|null>(null),[loaded,setLoaded]=useState<string|null>(null);
 const show=!!src&&failed!==src&&!failedIcons.has(src);
 return <span className="site-icon" style={{'--site-hue':hue} as React.CSSProperties} aria-hidden="true">{(!show||loaded!==src)&&host.slice(0,2).toUpperCase()}{show&&<img key={src} src={src!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{opacity:loaded===src?1:0}} onLoad={()=>setLoaded(src)} onError={()=>{if(src){if(failedIcons.size>=2048)failedIcons.clear();failedIcons.add(src);setFailed(src);}}}/>}</span>;
});
export function Home({appearance,bookmarks,query,setQuery,tag,setTag,sort,open,onManage,onCommand}:{appearance:Appearance;bookmarks:Bookmark[];query:string;setQuery:(s:string)=>void;tag:string;setTag:(s:string)=>void;sort:Sort;open:(b:Bookmark)=>void;onManage:()=>void;onCommand:()=>void}){
 const tags=useMemo(()=>[...new Set(bookmarks.flatMap(b=>b.tags))].sort(),[bookmarks]);
 const [onlyFavorite,setOnlyFavorite]=useState(false),[limit,setLimit]=useState(48);const deferred=useDeferredValue(query);
 const candidates=useMemo(()=>bookmarks.filter(b=>(!tag||b.tags.includes(tag))&&(!onlyFavorite||b.favorite||b.pinned)),[bookmarks,tag,onlyFavorite]);const {items,pending}=useSearch(candidates,deferred,deferred?'relevance':sort);
 return <div className="home" data-layout={appearance.homeLayout}><header className="home-header"><a className="brand" href="#/"><span className="brand-mark">F</span>FluxNav</a><div className="inline"><button className="quiet" onClick={onCommand}>快捷搜索 <kbd>⌘ K</kbd></button><button className="quiet" onClick={onManage}>管理书签 ↗</button></div></header>
 <main className="home-main"><p className="eyebrow">PERSONAL START PAGE</p><h1>FluxNav</h1><p className="home-subtitle">搜索，然后出发。你的常用网站都在这里。</p>
 <div className="home-search"><Icon name="search" size={23}/><input aria-label="搜索网站或标签" placeholder="搜索网站或标签" value={query} onChange={e=>{setLimit(48);setQuery(e.target.value);}} onKeyDown={e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&deferred===query&&!pending&&items[0])open(items[0]);}}/>{query&&<button className="quiet" onClick={()=>{setQuery('');setLimit(48);}}>清除</button>}<kbd>ENTER ↗</kbd></div>
 <div className="home-filter"><button aria-pressed={onlyFavorite} onClick={()=>{setOnlyFavorite(v=>!v);setLimit(48);}} className="tool-button"><Icon name="favorite"/>收藏与置顶</button><small>{items.length} 个网站{query!==deferred||pending?' · 搜索中…':''}</small></div><nav className="home-tags" aria-label="书签标签">{['',...tags].map(t=><button key={t} aria-pressed={tag===t} className={tag===t?'active':''} onClick={()=>{setTag(t);setLimit(48);}}>{t||'全部'}</button>)}</nav>
 <div className="home-links" data-layout={appearance.homeLayout}>{items.slice(0,limit).map(b=><a key={b.id} href={b.url} target="_blank" rel="noopener noreferrer" onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(b);}}><SiteIcon bookmark={b} remote={appearance.siteIcons}/><span><strong>{b.title}{b.pinned&&<span className="pin-mark"> •</span>}</strong><small>{domain(b.url)}</small></span><span className="link-arrow"><Icon name="arrow"/></span></a>)}</div>
 {!items.length&&!pending&&<div className="empty"><h2>{bookmarks.length?'没有匹配结果':'建立你的个人资源库'}</h2><button onClick={bookmarks.length?()=>{setQuery('');setTag('');setOnlyFavorite(false);}:onManage}>{bookmarks.length?'清除筛选':'添加第一个书签'}</button></div>}{items.length>limit&&<div className="home-more"><button onClick={()=>setLimit(v=>v+48)}>加载更多 · {Math.min(limit,items.length)} / {items.length}</button></div>}</main></div>;
}

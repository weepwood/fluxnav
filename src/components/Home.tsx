import {IconButton,SearchField,Segmented} from './ui';
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
type HomeProps={appearance:Appearance;onAppearance:(v:Appearance)=>void;bookmarks:Bookmark[];query:string;setQuery:(s:string)=>void;tag:string;setTag:(s:string)=>void;sort:Sort;open:(b:Bookmark)=>void;onManage:()=>void;onCommand:()=>void;onSettings:()=>void;onAdd:()=>void};
function HomeLink({bookmark:b,appearance,open}:{bookmark:Bookmark;appearance:Appearance;open:(b:Bookmark)=>void}){
 return <a className="home-resource" href={b.url} target="_blank" rel="noopener noreferrer" title={b.title} onClick={e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();open(b);}}>
 <SiteIcon bookmark={b} remote={appearance.siteIcons}/><span className="home-resource-text"><strong>{b.title}</strong>{appearance.homeShowDomains&&<small>{domain(b.url)}</small>}</span><span className="home-resource-actions">{b.pinned&&<span className="home-resource-pin" title="置顶"><Icon name="pin" size={12}/></span>}<span className="link-arrow"><Icon name="arrow" size={15}/></span></span></a>;
}
export function Home({appearance,onAppearance,bookmarks,query,setQuery,tag,setTag,sort,open,onManage,onCommand,onSettings,onAdd}:HomeProps){
 const tags=useMemo(()=>{const counts=new Map<string,number>();for(const b of bookmarks)for(const t of b.tags)counts.set(t,(counts.get(t)||0)+1);return [...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));},[bookmarks]);
 const [onlyFavorite,setOnlyFavorite]=useState(false),[limit,setLimit]=useState(48),[showAllTags,setShowAllTags]=useState(false);
 const deferred=useDeferredValue(query);
 const candidates=useMemo(()=>bookmarks.filter(b=>(!tag||b.tags.includes(tag))&&(!onlyFavorite||b.favorite||b.pinned)),[bookmarks,tag,onlyFavorite]);const {items,pending}=useSearch(candidates,deferred,deferred?'relevance':sort);
 const filtering=!!query||!!tag||onlyFavorite;const loading=pending||query!==deferred;
 const splitPinned=appearance.homeShowPinned&&!filtering;
 const pinned=splitPinned?items.filter(b=>b.pinned):[];
 const normal=splitPinned?items.filter(b=>!b.pinned):items;
 const shownTags=showAllTags?tags.slice(0,120):tags.slice(0,12);const displayedTags=tag&&!shownTags.some(([t])=>t===tag)?[...shownTags,...tags.filter(([t])=>t===tag)]:shownTags;
 const clear=()=>{setQuery('');setTag('');setOnlyFavorite(false);setLimit(48);};
 return <div className="home home-v18 home-background" data-layout={appearance.homeLayout} data-background={appearance.homeBackground} data-density={appearance.homeDensity} data-width={appearance.homeWidth} data-accent={appearance.homeAccent}>
 <header className="home-header"><a className="brand" href="#/"><span className="brand-mark">F</span>FluxNav</a><div className="home-header-actions"><button className="quiet tool-button" aria-label="快捷搜索" onClick={onCommand}><Icon name="search"/>快捷搜索 <kbd>⌘ / Ctrl K</kbd></button><button className="icon-button" aria-label="外观设置" title="外观设置" onClick={onSettings}><Icon name="settings" size={18}/></button><button className="home-manage tool-button" onClick={onManage}>管理书签 <Icon name="arrow"/></button></div></header>
 <main className="home-main"><section className="home-hero"><p className="eyebrow">个人导航</p><h1>{appearance.homeTitle}{!/[.!?。！？]$/.test(appearance.homeTitle)&&<span>.</span>}</h1>{appearance.homeShowSubtitle&&<p className="home-subtitle">{appearance.homeSubtitle}</p>}
 <SearchField className="home-search" iconSize={21} value={query} onValueChange={v=>{setLimit(48);setQuery(v);}} onClear={()=>{setQuery('');setLimit(48);}} shortcut="Enter ↗" inputProps={{'aria-label':'搜索网站或标签',placeholder:'搜索书签、网站或标签',onKeyDown:e=>{if(e.key==='Enter'&&!e.nativeEvent.isComposing&&!loading&&items[0])open(items[0]);if(e.key==='Escape'&&!e.nativeEvent.isComposing){e.stopPropagation();setQuery('');setLimit(48);}}}}/><div className="home-search-hint"><span role="status">{loading?'正在搜索…':query?items.length+' 个匹配结果':'搜索本地资源 · Enter 打开首个结果'}</span></div></section>
 <section className="home-library"><div className="home-section-heading"><div><h2>{query?'搜索结果':onlyFavorite?'收藏与置顶':'我的书签'}</h2><p className="muted">{items.length} 个网站{tag?' · '+tag:''}</p></div><div className="home-library-tools"><button className="tool-button home-favorite" aria-label="收藏与置顶" aria-pressed={onlyFavorite} onClick={()=>{setOnlyFavorite(v=>!v);setLimit(48);}}><Icon name="favorite"/><span>收藏</span></button><Segmented<'list'|'tiles'> className="view-switch home-view-switch" label="首页布局" value={appearance.homeLayout} options={[{value:'list',label:'首页列表',icon:'list'},{value:'tiles',label:'首页磁贴',icon:'all'}]} onChange={homeLayout=>onAppearance({...appearance,homeLayout})}/><IconButton className="home-add" icon="plus" label="添加书签" onClick={onAdd}/></div></div>
 {tags.length>0&&<nav className="home-tags" aria-label="书签标签"><button aria-pressed={!tag} className={!tag?'active':''} onClick={()=>{setTag('');setLimit(48);}}>全部</button>{displayedTags.map(([t,n])=><button key={t} aria-pressed={tag===t} className={tag===t?'active':''} title={t+' · '+n+' 个网站'} onClick={()=>{setTag(t);setLimit(48);}}>{t}<small>{n}</small></button>)}{tags.length>12&&<button className="home-tag-more" aria-expanded={showAllTags} onClick={()=>setShowAllTags(v=>!v)}>{showAllTags?'收起标签':'更多标签'}</button>}{showAllTags&&tags.length>120&&<button className="home-tag-more" onClick={onManage}>管理全部标签</button>}</nav>}
 {!!pinned.length&&<section className="home-pinned"><div className="home-group-heading"><Icon name="pin" size={14}/><h3>置顶</h3><small>{pinned.length}</small></div><div className="home-links" data-layout={appearance.homeLayout}>{pinned.slice(0,limit).map(b=><HomeLink key={b.id} bookmark={b} appearance={appearance} open={open}/>)}</div></section>}
 {normal.length>0&&<section className="home-normal">{!!pinned.length&&<div className="home-group-heading"><h3>其他书签</h3><small>{normal.length}</small></div>}<div className="home-links" data-layout={appearance.homeLayout} aria-busy={loading}>{normal.slice(0,Math.max(0,limit-pinned.length)).map(b=><HomeLink key={b.id} bookmark={b} appearance={appearance} open={open}/>)}</div></section>}
 {!items.length&&loading&&<div className="home-loading" role="status">正在准备资源…</div>}
 {!items.length&&!loading&&<div className="empty"><span className="empty-icon"><Icon name={filtering?'search':'all'} size={24}/></span><h2>{filtering?'没有匹配结果':'建立你的个人资源库'}</h2><p>{filtering?'尝试其他关键词或取消当前筛选。':'收藏常用网站，将这里变成自己的起始页。'}</p><div className="inline">{filtering?<button onClick={clear}>清除筛选</button>:<><button className="primary" onClick={onAdd}>添加第一个书签</button><button onClick={onManage}>管理书签</button></>}</div></div>}
 {items.length>limit&&<div className="home-more"><button onClick={()=>setLimit(v=>v+48)}>显示更多 <Icon name="chevron" size={13}/></button><small>已显示 {Math.min(limit,items.length)} / {items.length}</small></div>}</section></main>
 <footer className="home-footer"><span><Icon name="shield" size={14}/> Local-first · 优先本地存储</span><button className="quiet" onClick={onSettings}>外观与设置</button></footer></div>;
}

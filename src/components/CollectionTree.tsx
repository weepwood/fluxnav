import {useMemo,useState,type ReactNode} from 'react';
import {collectionSeparator,type CollectionNode} from '../domain';
import {Icon} from './Icon';
export function CollectionTree({nodes,selected,query,onSelect,onMove}:{nodes:CollectionNode[];selected:string;query:string;onSelect:(path:string)=>void;onMove:(id:string,path:string)=>void}){
 const [closed,setClosed]=useState<Set<string>>(()=>new Set());
 const [hover,setHover]=useState('');
 const needle=query.trim().toLowerCase();const [budget,setBudget]=useState({query:'',limit:160});const limit=budget.query===needle?budget.limit:160;
 const matches=useMemo(()=>{if(!needle)return null;const found=new Set<string>();const visit=(n:CollectionNode):boolean=>{let yes=n.path.toLowerCase().includes(needle);for(const child of n.children)if(visit(child))yes=true;if(yes)found.add(n.path);return yes;};for(const node of nodes)visit(node);return found;},[nodes,needle]);
 let count=0,hasMore=false;
 function renderList(list:CollectionNode[],depth:number):ReactNode[]{const output:ReactNode[]=[];for(const node of list){if(matches&&!matches.has(node.path))continue;if(count>=limit){hasMore=true;break;}count++;output.push(render(node,depth));}return output;}
 const render=(node:CollectionNode,depth:number)=>{const expanded=!!needle||!closed.has(node.path);
 return <div key={node.path} className="collection-branch"><div className="collection-row" data-drop={hover===node.path} style={{paddingLeft:Math.min(depth,8)*10}} onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-fluxnav-bookmark')){e.preventDefault();e.dataTransfer.dropEffect='move';setHover(node.path);}}} onDragLeave={e=>{if(e.relatedTarget instanceof Node&&e.currentTarget.contains(e.relatedTarget))return;setHover(old=>old===node.path?'':old);}} onDrop={e=>{e.preventDefault();setHover('');const id=e.dataTransfer.getData('application/x-fluxnav-bookmark');if(id)onMove(id,node.path);}}>
 {node.children.length?<button className="folder-toggle" aria-label={(expanded?'折叠 ':'展开 ')+node.path} aria-expanded={expanded} onClick={()=>setClosed(old=>{const next=new Set(old);if(next.has(node.path))next.delete(node.path);else next.add(node.path);return next;})}><span className="folder-chevron" data-expanded={expanded}>›</span></button>:<span className="folder-spacer"/>}
 <button className="collection-select" title={node.path} aria-label={node.path} aria-pressed={selected===node.path} onClick={()=>onSelect(node.path)}><span className="nav-label"><Icon name="folder"/><span>{node.name}</span></span><small>{node.count}</small></button></div>
 {expanded&&renderList(node.children,depth+1)}</div>;};
 const rows=renderList(nodes,0);return <div className="collection-tree" aria-label="收藏集层级">{rows}{hasMore&&<button className="quiet more-collections" onClick={()=>setBudget({query:needle,limit:limit+160})}>显示更多收藏集</button>}{!rows.length&&needle&&<small className="sidebar-empty">没有匹配收藏集</small>}{selected&&<small className="collection-path">{selected.split(collectionSeparator).join(' › ')}</small>}</div>;
}

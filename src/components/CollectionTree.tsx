import {useState} from 'react';
import {collectionSeparator,type CollectionNode} from '../domain';
import {Icon} from './Icon';
export function CollectionTree({nodes,selected,query,onSelect,onMove}:{nodes:CollectionNode[];selected:string;query:string;onSelect:(path:string)=>void;onMove:(id:string,path:string)=>void}){
 const [closed,setClosed]=useState<Set<string>>(()=>new Set());
 const [hover,setHover]=useState('');
 const match=(n:CollectionNode):boolean=>n.path.toLowerCase().includes(query.trim().toLowerCase())||n.children.some(match);
 const render=(node:CollectionNode,depth:number)=>{if(!match(node))return null;const expanded=!!query||!closed.has(node.path);
 return <div key={node.path} className="collection-branch"><div className="collection-row" data-drop={hover===node.path} style={{paddingLeft:Math.min(depth,8)*10}} onDragOver={e=>{if(e.dataTransfer.types.includes('application/x-fluxnav-bookmark')){e.preventDefault();e.dataTransfer.dropEffect='move';setHover(node.path);}}} onDragLeave={()=>setHover('')} onDrop={e=>{e.preventDefault();setHover('');const id=e.dataTransfer.getData('application/x-fluxnav-bookmark');if(id)onMove(id,node.path);}}>
 {node.children.length?<button className="folder-toggle" aria-label={(expanded?'折叠 ':'展开 ')+node.path} aria-expanded={expanded} onClick={()=>setClosed(old=>{const next=new Set(old);if(next.has(node.path))next.delete(node.path);else next.add(node.path);return next;})}><span className="folder-chevron" data-expanded={expanded}>›</span></button>:<span className="folder-spacer"/>}
 <button className="collection-select" title={node.path} aria-label={node.path} aria-pressed={selected===node.path} onClick={()=>onSelect(node.path)}><span className="nav-label"><Icon name="folder"/><span>{node.name}</span></span><small>{node.count}</small></button></div>
 {expanded&&node.children.map(n=>render(n,depth+1))}</div>;};
 return <div className="collection-tree" aria-label="收藏集层级">{nodes.map(n=>render(n,0))}{selected&&<small className="collection-path">{selected.split(collectionSeparator).join(' › ')}</small>}</div>;
}

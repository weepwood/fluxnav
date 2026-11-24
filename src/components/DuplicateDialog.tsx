import {useMemo,useState} from 'react';
import {duplicateGroups,type Bookmark} from '../domain';
import {Dialog} from './Dialog';
export function DuplicateDialog({bookmarks,onMerge,onClose}:{bookmarks:Bookmark[];onMerge:(keep:string,remove:string[])=>void;onClose:()=>void}){
 const groups=useMemo(()=>duplicateGroups(bookmarks),[bookmarks]);
 const [index,setIndex]=useState(0),[selection,setSelection]=useState<Record<string,string>>({}),[error,setError]=useState('');
 const current=Math.min(index,Math.max(0,groups.length-1)),group=groups[current];
 if(!group)return <Dialog title="合并重复资源" onClose={onClose}><div className="form"><p>没有需要合并的重复资源。</p><button onClick={onClose}>完成</button></div></Dialog>;
 const key=group[0].id,keep=group.find(b=>b.id===selection[key])||group[0];
 return <Dialog title="合并重复资源" onClose={onClose}><div className="form"><p>第 {current+1} / {groups.length} 组 · {group.length} 条记录</p><p className="muted">同一规范化网址（忽略片段）可能指向不同章节，请先核对。保留所选网址与标题，合并标签、描述、备注及访问记录；其余记录移入回收站，可撤销。长文本与标签仍受字段长度限制。</p>{group.length>500&&<p className="error">该组超过 500 条，请分批处理；为避免误合并，暂不支持整组合并。</p>}<div className="preview-list">{group.slice(0,500).map(b=><label className="duplicate-option" key={b.id}><input type="radio" name="survivor" checked={b.id===keep.id} onChange={()=>setSelection(s=>({...s,[key]:b.id}))}/><span><strong>{b.title}</strong><small>{b.url}</small><small>{b.collection||'未分类'} · {b.tags.join(' / ')} · 访问 {b.visitCount} 次{b.archived?' · 已归档':''}</small></span></label>)}</div>{error&&<p role="alert" className="error">{error}</p>}<div className="inline between"><button disabled={!current} onClick={()=>setIndex(current-1)}>上一组</button><button disabled={current===groups.length-1} onClick={()=>setIndex(current+1)}>下一组</button></div><button className="primary" disabled={group.length>500} onClick={()=>{try{onMerge(keep.id,group.filter(b=>b.id!==keep.id).map(b=>b.id));setError('');}catch(e){setError((e as Error).message);}}}>确认合并此组</button></div></Dialog>;
}

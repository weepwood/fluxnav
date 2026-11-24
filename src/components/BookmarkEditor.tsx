import {useState} from 'react';
import {parseBookmark,type Bookmark} from '../domain';
import {Dialog} from './Dialog';
export function BookmarkEditor({initial,onSave,onClose,onSuggest,collections}:{initial?:Partial<Bookmark>;onSave:(b:Bookmark)=>void;onClose:()=>void;onSuggest:(url:string)=>Promise<Bookmark>;collections:string[]}) {
 const [form,setForm]=useState({url:initial?.url||'',title:initial?.title||'',description:initial?.description||'',notes:initial?.notes||'',tags:initial?.tags?.join(', ')||'',collection:initial?.collection||''});
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);
 function field(key:keyof typeof form,value:string){setForm(f=>({...f,[key]:value}));}
 return <Dialog title={initial?.id?'编辑资源':'添加资源'} onClose={onClose}><form className="form" onSubmit={e=>{e.preventDefault();try{onSave(parseBookmark({...initial,...form,tags:form.tags.split(/[,，\n]/).map(x=>x.trim()).filter(Boolean),updatedAt:Date.now()}));}catch(e){setError((e as Error).message);}}}>
 <label>网址<div className="inline"><input autoFocus value={form.url} onChange={e=>field('url',e.target.value)} placeholder="https://example.com" required/><button type="button" disabled={busy||!form.url} onClick={async()=>{setBusy(true);setError('');try{const b=await onSuggest(form.url);setForm(f=>({...f,title:f.title||b.title,description:f.description||b.description,notes:f.notes||b.notes,tags:f.tags||b.tags.join(', ')}));}catch(e){setError((e as Error).message);}finally{setBusy(false);}}}>{busy?'生成中…':'AI 建议'}</button></div></label>
 <label>标题<input value={form.title} onChange={e=>field('title',e.target.value)} required/></label>
 <label>描述<textarea value={form.description} onChange={e=>field('description',e.target.value)} rows={2}/></label>
 <label>备注<textarea value={form.notes} onChange={e=>field('notes',e.target.value)} rows={2}/></label>
 <label>标签（逗号分隔）<input value={form.tags} onChange={e=>field('tags',e.target.value)}/></label>
 <label>收藏集<input list="collections" value={form.collection} onChange={e=>field('collection',e.target.value)} placeholder="例如：设计资源"/><datalist id="collections">{collections.map(c=><option key={c} value={c}/>)}</datalist></label>
 {error&&<p role="alert" className="error">{error}</p>}<div className="actions"><button type="button" onClick={onClose}>取消</button><button className="primary" disabled={busy}>保存资源</button></div></form></Dialog>;
}

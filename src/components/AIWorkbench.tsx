import {useRef,useState} from 'react';
import {askAI,parseAIItems,type AIProfile} from '../services';
import {type Bookmark} from '../domain';
import {Dialog} from './Dialog';
export function AIWorkbench({bookmarks,profile,apiKey,onAdd,onApply,onSearch,onClose}:{bookmarks:Bookmark[];profile:AIProfile;apiKey:string;onAdd:(b:Bookmark[])=>void;onApply:(b:Bookmark[])=>void;onSearch:(ids:string[])=>void;onClose:()=>void}){
 const [mode,setMode]=useState<'add'|'organize'|'search'>('add'),[prompt,setPrompt]=useState(''),[items,setItems]=useState<Bookmark[]>([]),[selected,setSelected]=useState<string[]>([]),[ids,setIds]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const controller=useRef<AbortController|null>(null);
 const reset=()=>{setItems([]);setSelected([]);setIds([]);setError('');};
 async function run(){reset();setBusy(true);const c=new AbortController();controller.current=c;try{
 const source=bookmarks.slice(0,200).map(b=>({id:b.id,title:b.title,url:b.url,description:b.description,tags:b.tags,collection:b.collection}));
 const system=mode==='add'?'返回 JSON 数组，每项包含 url,title,description,tags,notes,collection。只提供推测的网址，不要声称已经验证。':mode==='organize'?'返回 JSON 数组，每项包含原 id,url,title,description,tags,collection。仅建议分类，不要修改网址和标题。':'从提供的资源中选择匹配需求的 id，返回 JSON 字符串数组，不要生成新 ID。';
 const text=await askAI(profile,apiKey,system,mode==='add'?prompt:JSON.stringify({request:prompt||'整理现有资源',bookmarks:source}),c.signal);
 if(c.signal.aborted)return;
 if(mode==='search'){const result=JSON.parse(text.replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));if(!Array.isArray(result)||result.some(x=>typeof x!=='string'))throw Error('搜索结果格式错误');setIds([...new Set<string>(result)].filter(id=>source.some(b=>b.id===id)));}
 else {const parsed=parseAIItems(text).map((b,i)=>mode==='add'?{...b,id:b.id+'-'+i}:b);const valid=mode==='organize'?parsed.filter(b=>source.some(x=>x.id===b.id)):parsed;setItems(valid);setSelected(valid.map(b=>b.id));}
 }catch(e){if(!c.signal.aborted)setError((e as Error).message);}finally{setBusy(false);controller.current=null;}}
 return <Dialog title="AI 工作台" onClose={()=>{controller.current?.abort();onClose();}}><div className="form"><div className="tabs">{(['add','organize','search'] as const).map(m=><button key={m} disabled={busy} aria-pressed={mode===m} onClick={()=>{setMode(m);reset();}}>{m==='add'?'批量添加':m==='organize'?'智能整理':'语义检索'}</button>)}</div><p className="muted">使用 {profile.name} / {profile.model}。AI 结果仅为建议，不会自动保存。整理和检索最多发送前 200 项书签的标题、网址、描述、标签和收藏集至所配置的模型服务，不发送备注。</p><label>你的需求<textarea rows={3} value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="例如：添加 React、Vue 官方文档"/></label><div className="inline"><button className="primary" disabled={busy||(mode!=='organize'&&!prompt.trim())} onClick={run}>{busy?'生成中…':'生成建议'}</button>{busy&&<button onClick={()=>controller.current?.abort()}>取消请求</button>}</div>{error&&<p className="error" role="alert">{error}</p>}
 {items.length>0&&<><div className="preview-list">{items.map((b,i)=><label key={b.id+i} className="preview-row"><input type="checkbox" checked={selected.includes(b.id)} onChange={e=>setSelected(old=>e.target.checked?[...old,b.id]:old.filter(x=>x!==b.id))}/><span><strong>{b.title}</strong><small>{b.url}</small><small>{b.collection} · {b.tags.join(' / ')}</small></span></label>)}</div><button className="primary" disabled={!selected.length} onClick={()=>{const chosen=items.filter(b=>selected.includes(b.id));mode==='add'?onAdd(chosen):onApply(chosen);onClose();}}>确认应用 {selected.length} 项</button></>}
 {!busy&&mode==='search'&&ids.length>0&&<><div className="preview-list">{ids.map(id=>{const b=bookmarks.find(x=>x.id===id);return b?<p key={id}>{b.title} · {b.url}</p>:null;})}</div><button onClick={()=>onSearch(ids)}>查看匹配资源</button></>}</div></Dialog>;
}

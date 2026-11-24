import {useEffect,useMemo,useRef,useState} from 'react';
import {analyzeHtml,decodeAndAnalyze,MAX_FILE_BYTES,previewImport,type ImportReport} from '../imports';
import type {Bookmark,Library} from '../domain';
import {Dialog} from './Dialog';
import ImportWorker from '../import.worker?worker&inline';
export function ImportDialog({library,onClose,onApply}:{library:Library;onClose:()=>void;onApply:(report:ImportReport,mode:'merge'|'restore')=>void}){
 const [file,setFile]=useState<File|null>(null),[encoding,setEncoding]=useState('auto'),[report,setReport]=useState<ImportReport|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[mode,setMode]=useState<'merge'|'restore'>('merge'),[confirmed,setConfirmed]=useState(false);
 const generation=useRef(0);
 useEffect(()=>{if(!file){setReport(null);setBusy(false);setError('');return;}const token=++generation.current;setBusy(true);setReport(null);setError('');setMode('merge');setConfirmed(false);
 let worker:Worker|undefined;
 const finish=(payload:{report:ImportReport}|{html:string}|{error:string})=>{if(token!==generation.current)return;try{if('error' in payload)throw Error(payload.error);setReport('report' in payload?payload.report:analyzeHtml(payload.html));}catch(e){setError((e as Error).message);}finally{setBusy(false);worker?.terminate();}};
 void (async()=>{try{if(file.size>MAX_FILE_BYTES)throw Error('文件超过 30 MB');const buffer=await file.arrayBuffer();if(token!==generation.current)return;
 const fallback=()=>{if(token!==generation.current)return;try{finish(decodeAndAnalyze(buffer,encoding,file.name));}catch(e){finish({error:(e as Error).message});}};
 if(file.size>=256*1024&&typeof Worker!=='undefined'){try{worker=new ImportWorker();worker.onmessage=e=>finish(e.data);worker.onerror=()=>{worker?.terminate();fallback();};worker.onmessageerror=()=>{worker?.terminate();fallback();};worker.postMessage({buffer,encoding,name:file.name});return;}catch{worker?.terminate();}}
 fallback();
 }catch(e){finish({error:(e as Error).message});}})();
 return()=>{generation.current++;worker?.terminate();};},[file,encoding]);
 const preview=useMemo(()=>{if(!report)return null;try{return {data:previewImport(report,library,mode),error:''};}catch(e){return {data:null,error:(e as Error).message};}},[report,library,mode]);
 const downloadIssues=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify({total:report.total,invalid:report.invalid,repaired:report.repaired,duplicateIds:report.duplicateIds,duplicateUrls:report.duplicateUrls,issues:report.issues},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='fluxnav-import-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 const close=()=>{generation.current++;onClose();};
 return <Dialog title="导入资源" onClose={close}><div className="form import-dialog"><p className="muted">支持浏览器 HTML 收藏夹和 JSON 书签。先检查再写入；异常记录不会阻止其他有效书签导入。</p><input aria-label="选择书签文件" type="file" accept=".json,.html,.htm" onChange={e=>{setReport(null);setFile(e.target.files?.[0]||null);}}/><label>文件编码<select value={encoding} onChange={e=>{setReport(null);setEncoding(e.target.value);}}><option value="auto">自动（UTF-8 / UTF-16 BOM）</option><option value="gb18030">简体中文 GB18030</option><option value="big5">繁体中文 Big5</option><option value="shift_jis">日文 Shift-JIS</option><option value="windows-1252">西欧 Windows-1252</option></select></label>
 {busy&&<p role="status">正在解析并校验文件…</p>}{error&&<p role="alert" className="error">{error}</p>}
 {report&&<><div className="import-stats">{[['文件条目',report.total],['有效记录',report.records.length],['已修复',report.repaired],['无效跳过',report.invalid],['重复网址',report.duplicateUrls],['重复 ID',report.duplicateIds]].map(([label,count])=><div key={label}><small>{label}</small><strong>{count}</strong></div>)}</div>
 {!report.restoreAllowed&&report.source==='json'&&<p className="muted">此文件不是无异常的完整 FluxNav 备份，仅允许添加新网址，不允许覆盖或删除已有记录。</p>}
 <label>导入方式<select value={mode} onChange={e=>{setMode(e.target.value as 'merge'|'restore');setConfirmed(false);}}><option value="merge">仅添加新网址（安全默认）</option><option value="restore" disabled={!report.restoreAllowed}>按 ID 与版本合并完整备份</option></select></label>
 {preview?.error&&<p className="error" role="alert">{preview.error}</p>}{preview?.data&&<><p>预计新增 {preview.data.added} · 更新 {preview.data.updated} · 跳过 {preview.data.skipped} · 删除标记 {preview.data.deletions}</p>{preview.data.idCollisions>0&&<p className="muted">{preview.data.idCollisions} 条 ID 与本地冲突，将分配新 ID，不覆盖原记录。</p>}{preview.data.urlConflicts>0&&<p className="muted">{preview.data.urlConflicts} 条新 ID 对应已有网址，恢复后可能形成重复资源。</p>}{mode==='restore'&&<label className="inline"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>我确认按版本更新记录，可能将已有书签移入回收站</label>}<div className="preview-list">{preview.data.records.slice(0,30).map((b:Bookmark)=><p key={b.id}>{b.title} · {b.url}</p>)}</div>{preview.data.records.length>30&&<small className="muted">仅预览前 30 条，确认后处理全部有效记录。</small>}</>}
 {!!report.issues.length&&<details><summary>异常明细（{report.issues.length} 项）</summary><div className="preview-list">{report.issues.slice(0,50).map((x,i)=><p key={i}>第 {x.row} 条 · {x.message}</p>)}</div><button onClick={downloadIssues}>下载完整异常报告</button></details>}
 {!report.records.length&&<p className="error">没有可导入的有效书签。</p>}
 <button className="primary" disabled={busy||!preview?.data?.records.length||(mode==='restore'&&!confirmed)} onClick={()=>{try{onApply(report,mode);close();}catch(e){setError((e as Error).message);}}}>确认导入</button></>}
 </div></Dialog>;
}

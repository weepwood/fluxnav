import {useEffect,useMemo,useRef,useState} from 'react';
import {searchBookmarks,type Bookmark,type Sort} from './domain';
import SearchWorker from './search.worker?worker&inline';
const WORKER_THRESHOLD=2000;
type Result={list:Bookmark[];query:string;sort:Sort;items:Bookmark[]};
export function useSearch(list:Bookmark[],query:string,sort:Sort){
 const [failed,setFailed]=useState(false),[result,setResult]=useState<Result|null>(null);
 const worker=useRef<Worker|null>(null),seq=useRef(0);
 const large=list.length>=WORKER_THRESHOLD&&typeof Worker!=='undefined'&&!failed;
 const index=useMemo(()=>large?new Map(list.map(b=>[b.id,b])):null,[large,list]);
 useEffect(()=>{if(!large)return;try{const w=new SearchWorker();worker.current=w;w.onerror=()=>setFailed(true);w.onmessageerror=()=>setFailed(true);return()=>{seq.current++;w.terminate();worker.current=null;};}catch{setFailed(true);}},[large]);
 useEffect(()=>{if(!large||!worker.current)return;try{worker.current.postMessage({kind:'dataset',records:list});}catch{setFailed(true);}},[large,list]);
 useEffect(()=>{if(!large||!worker.current||!index)return;const w=worker.current,id=++seq.current;
  w.onmessage=(event:MessageEvent<{id:number;ids?:string[];error?:boolean}>)=>{if(event.data.id!==id||seq.current!==id)return;if(event.data.error||!event.data.ids){setFailed(true);return;}setResult({list,query,sort,items:event.data.ids.map(k=>index.get(k)).filter((b):b is Bookmark=>!!b)});};
  const timer=setTimeout(()=>{try{w.postMessage({kind:'search',id,query,sort});}catch{setFailed(true);}},query?75:0);
  return()=>{clearTimeout(timer);seq.current++;};
 },[large,list,query,sort,index]);
 const immediate=useMemo(()=>large?null:searchBookmarks(list,query,sort),[large,list,query,sort]);
 return {items:immediate??(result?.list===list?result.items:[]),pending:large&&(result?.list!==list||result.query!==query||result.sort!==sort)};
}

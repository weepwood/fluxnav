import {searchBookmarks,type Bookmark,type Sort} from './domain';
let records:Bookmark[]=[];
self.onmessage=(event:MessageEvent<{kind:'dataset';records:Bookmark[]}|{kind:'search';id:number;query:string;sort:Sort}>)=>{
 const m=event.data;if(m.kind==='dataset'){records=m.records;return;}
 try{self.postMessage({id:m.id,ids:searchBookmarks(records,m.query,m.sort).map(b=>b.id)});}catch{self.postMessage({id:m.id,error:true});}
};

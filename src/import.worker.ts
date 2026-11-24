import {decodeAndAnalyze} from './imports';
self.onmessage=(event:MessageEvent<{buffer:ArrayBuffer;encoding:string;name:string}>)=>{
 try{self.postMessage(decodeAndAnalyze(event.data.buffer,event.data.encoding,event.data.name));}catch(e){self.postMessage({error:(e as Error).message});}
};

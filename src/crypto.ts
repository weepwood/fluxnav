import {parseLibrary,type Library} from './domain.ts';
const iterations=600000;
const encode=(bytes:Uint8Array)=>{let str='';for(let i=0;i<bytes.length;i+=8192)str+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(str);};
const decode=(s:unknown)=>{if(typeof s!=='string'||s.length>50_000_000)throw Error('加密数据格式错误');return Uint8Array.from(atob(s),x=>x.charCodeAt(0));};
async function derive(password:string,salt:Uint8Array<ArrayBuffer>){
 const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export type EncryptedLibrary={format:'fluxnav-encrypted-v1';salt:string;iv:string;ciphertext:string};
export async function encodeLibrary(library:Library,password:string):Promise<Library|EncryptedLibrary>{
 if(!password)return library;
 if(password.length<12)throw Error('加密口令至少需要 12 个字符');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await derive(password,salt);
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(library)));
 return {format:'fluxnav-encrypted-v1',salt:encode(salt),iv:encode(iv),ciphertext:encode(new Uint8Array(encrypted))};
}
export async function decodeLibrary(raw:unknown,password:string):Promise<Library>{
 const data=raw as Partial<EncryptedLibrary>;
 if(!data||data.format!=='fluxnav-encrypted-v1')return parseLibrary(raw);
 if(!password)throw Error('远端数据已加密，请输入加密口令');
 try{const salt=decode(data.salt),iv=decode(data.iv),cipher=decode(data.ciphertext);if(salt.length!==16||iv.length!==12||cipher.length<16)throw Error('格式错误');
 const key=await derive(password,salt);const clear=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
 return parseLibrary(JSON.parse(new TextDecoder().decode(clear)));}catch{throw Error('无法解密：口令错误或远端数据损坏');}
}

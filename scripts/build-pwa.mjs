import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=(await readdir('dist',{recursive:true,withFileTypes:true})).filter(f=>f.isFile()&&f.name!=='sw.js').map(f=>f.parentPath.replace(/^dist\/?/,'')+(f.parentPath==='dist'?'':'/')+f.name).sort();
const hash=createHash('sha256');for(const f of files)hash.update(await readFile('dist/'+f));
const name='fluxnav-shell-'+hash.digest('hex').slice(0,16);
const source=`const CACHE=${JSON.stringify(name)};const FILES=${JSON.stringify(files.map(f=>'./'+f))};
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./',...FILES]))));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('fluxnav-shell-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);const root=new URL(self.registration.scope);if(e.request.method!=='GET'||u.origin!==root.origin||!u.pathname.startsWith(root.pathname))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match('./index.html'))));return;}
if(FILES.some(f=>new URL(f,root).href===u.href))e.respondWith(caches.open(CACHE).then(c=>c.match(e.request)).then(hit=>hit||fetch(e.request)));});
`;
await writeFile('dist/sw.js',source);
console.log('PWA precache:',files.length,'assets');

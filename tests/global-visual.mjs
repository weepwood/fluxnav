import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4179','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4179/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const rows=Array.from({length:10000},(_,i)=>({id:'qa-'+i,url:'https://qa'+i+'.example/',title:'QA resource '+String(i).padStart(5,'0'),description:'',notes:'',tags:['QA','Tag '+(i%24)],collection:'Folder '+String(i%500).padStart(3,'0'),addedAt:1000+i,updatedAt:1000+i,lastVisited:0,visitCount:0,favorite:i%7===0,pinned:i<4,archived:false,deleted:false}));
 await page.addInitScript(data=>{if(!localStorage.getItem('qa-seeded')){localStorage.setItem('fluxnav-bookmarks',JSON.stringify({schemaVersion:1,bookmarks:data}));localStorage.setItem('qa-seeded','1');}},rows);
 await mkdir('global-visual-artifacts',{recursive:true});
 const overflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document horizontal overflow');
 const start=performance.now();await page.goto('http://127.0.0.1:4179/#/manage');await page.locator('.resources[aria-busy=false] article').first().waitFor({timeout:60000});const initialMs=Math.round(performance.now()-start);
 assert.ok(await page.locator('.resources article').count()<=80,'bounded resource page');assert.equal(await page.locator('.collection-select').count(),160);await page.getByRole('button',{name:'显示更多收藏集',exact:true}).click();assert.equal(await page.locator('.collection-select').count(),320);
 const side=page.getByRole('textbox',{name:'筛选收藏集和标签'});await side.fill('Folder 499');await page.getByRole('button',{name:'Folder 499',exact:true}).waitFor();assert.equal(await page.locator('.collection-select').count(),1);await side.fill('');
 const input=page.getByRole('textbox',{name:'筛选资源'});const searchStart=performance.now();await input.fill('qa9999.example');await page.waitForFunction(()=>{const r=document.querySelector('.resources');return r?.getAttribute('aria-busy')==='false'&&r.querySelectorAll('article').length===1&&r.textContent.includes('QA resource 09999');});const searchMs=Math.round(performance.now()-searchStart);await page.getByRole('button',{name:'清空搜索',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.resources')?.getAttribute('aria-busy')==='false'&&document.querySelectorAll('.resources article').length===80);
 const settings=page.getByRole('button',{name:'设置 / 同步'});const themes=[['编辑式','editorial'],['极简','minimal'],['深色','dark'],['北欧','nordic']];
 for(const [label,key] of themes){
  await settings.click();await page.getByRole('button',{name:label,exact:true}).click();await page.waitForFunction(k=>document.documentElement.dataset.theme===k,key);await page.screenshot({path:'global-visual-artifacts/'+key+'-settings.png'});await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  await page.locator('.resource-main').first().click();await page.locator('.resource-inspector[data-visible=true][data-empty=false]').waitFor();await overflow();await page.screenshot({path:'global-visual-artifacts/'+key+'-workspace.png'});
  await page.getByRole('button',{name:'网格视图',exact:true}).click();await page.locator('.resources.grid').waitFor();await overflow();await page.screenshot({path:'global-visual-artifacts/'+key+'-grid.png'});
  await page.getByRole('button',{name:'列表视图',exact:true}).click();await page.getByRole('link',{name:'起始页',exact:true}).click();await page.locator('.home-resource').first().waitFor();await overflow();await page.screenshot({path:'global-visual-artifacts/'+key+'-home.png'});
  await page.getByRole('button',{name:'管理书签',exact:false}).first().click();await page.locator('.resource-main').first().waitFor();
 }
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await page.getByRole('textbox',{name:'筛选资源'}).focus();assert.equal(await page.locator('.library-search').evaluate(e=>getComputedStyle(e).outlineStyle),'solid');await page.screenshot({path:'global-visual-artifacts/forced-colors.png'});
 await page.emulateMedia({forcedColors:'none',reducedMotion:'reduce'});await page.setViewportSize({width:390,height:844});await page.locator('.workspace[data-mode=phone]').waitFor();await overflow();await page.screenshot({path:'global-visual-artifacts/mobile.png'});
 await page.getByRole('textbox',{name:'筛选资源'}).fill('no-matching-qa-1234567');await page.locator('.resources[aria-busy=false]').waitFor();await page.getByRole('heading',{name:'没有匹配的资源'}).waitFor();
 assert.deepEqual(errors,[]);const result={records:10000,initialMs,searchMs,initialCollectionLimit:160,resourcePageLimit:80,notes:'Runner-specific wall time including browser scheduling; not a frame-rate or hardware benchmark.'};await writeFile('global-visual-artifacts/metrics.json',JSON.stringify(result,null,2));console.log('Global visual checks passed:',JSON.stringify(result));
}finally{await browser?.close();server.kill();}

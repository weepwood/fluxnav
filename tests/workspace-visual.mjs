import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4174','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4174/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready,'server ready');
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const records=Array.from({length:96},(_,i)=>({id:'demo-'+i,url:'https://resource'+i+'.example/',title:i===0?'A long resource title for checking truncation and layout':i===1?'BoardUI · Design system':'Resource '+String(i).padStart(2,'0'),description:i===0?'A local visual test description.':'A useful saved website.',notes:i===0?'Notes on UI design, spacing and interaction.':'',tags:['Design','UI','React','Tag '+i],collection:'Design / '+(i%3===0?'Components':i%3===1?'Inspiration':'Tools'),addedAt:Date.UTC(2026,0,1)+i*86400000,updatedAt:Date.UTC(2026,0,1)+i*86400000,lastVisited:0,visitCount:0,favorite:i%7===0,pinned:i===0,archived:false,deleted:false}));
 // Seed only the browser's isolated test storage to keep screenshots free of import toasts.
 await page.addInitScript(data=>{if(!localStorage.getItem('fluxnav-visual-seeded')){localStorage.setItem('fluxnav-bookmarks',JSON.stringify({schemaVersion:1,bookmarks:data}));localStorage.setItem('fluxnav-visual-seeded','1');}},records);
 await page.goto('http://127.0.0.1:4174/#/manage');await page.getByRole('button',{name:'＋ 添加'}).waitFor();
 await page.locator('.resources article').first().waitFor();await page.locator('.resources article .resource-main').first().click();
 await page.locator('.resource-inspector[data-empty=false]').waitFor();
 await mkdir('visual-artifacts',{recursive:true});
 const geometry=()=>page.evaluate(()=>{const rect=s=>{const e=document.querySelector(s);if(!e)throw Error(s);const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};return {nav:rect('.workspace-nav'),main:rect('.library'),detail:rect('.resource-inspector'),head:rect('.library-head'),scroll:rect('.library-scroll'),foot:rect('.sidebar-bottom'),overflow:document.documentElement.scrollWidth>innerWidth+1};});
 const initial=await geometry();assert.ok(initial.nav.w>=160&&initial.detail.w>=240&&initial.main.w>400);assert.equal(initial.overflow,false);const checkbox=await page.getByRole('checkbox',{name:'选择本页全部资源'}).boundingBox();const search=await page.locator('.library-search').boundingBox();assert.ok(checkbox.width<=16&&checkbox.x<initial.main.x+60&&search.width>initial.main.w*0.5,'toolbar checkbox and search alignment');assert.ok(initial.scroll.y>=initial.head.y+initial.head.h-1);
 await page.screenshot({path:'visual-artifacts/desktop-editorial.png'});
 await page.locator('.library-scroll').evaluate(e=>e.scrollTop=1000);const scrolled=await geometry();assert.equal(scrolled.head.y,initial.head.y);assert.equal(scrolled.foot.y,initial.foot.y);
 await page.getByRole('button',{name:'切换侧栏'}).click();const collapsed=await geometry();assert.ok(collapsed.nav.w<=60);assert.ok(collapsed.main.w>initial.main.w);assert.equal(collapsed.detail.w,initial.detail.w);await page.screenshot({path:'visual-artifacts/desktop-icon-rail.png'});
 await page.getByRole('button',{name:'切换侧栏'}).click();await page.getByRole('button',{name:'网格视图'}).click();await page.locator('.resources.grid').waitFor();await page.screenshot({path:'visual-artifacts/desktop-grid.png'});
 await page.getByRole('button',{name:'设置 / 同步'}).click();await page.getByRole('button',{name:'深色',exact:true}).click();await page.keyboard.press('Escape');await page.getByRole('button',{name:'列表视图'}).click();await page.screenshot({path:'visual-artifacts/desktop-dark.png'});
 await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.locator('.workspace-nav[data-expanded=false]').waitFor({state:'attached'});assert.equal(await page.locator('.workspace-nav').isVisible(),false);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.getByRole('button',{name:'切换侧栏'}).click();await page.locator('.workspace-nav[data-expanded=true]').waitFor();await page.screenshot({path:'visual-artifacts/mobile-navigation.png'});await page.keyboard.press('Escape');
 await page.locator('.resources article .resource-main').first().click();await page.locator('.resource-inspector[data-empty=false]').waitFor();assert.ok((await geometry()).detail.w<=390);await page.screenshot({path:'visual-artifacts/mobile-inspector.png'});await page.keyboard.press('Escape');await page.screenshot({path:'visual-artifacts/mobile-list.png'});
 assert.deepEqual(errors,[]);console.log('Workspace visual checks passed: geometry, fixed toolbar, icon rail, grid, dark theme and mobile overlays.');
}finally{await browser?.close();server.kill();}

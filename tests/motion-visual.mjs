import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4176','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4176/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const records=Array.from({length:14},(_,i)=>({id:'motion-'+i,url:'https://site'+i+'.example/',title:'Motion resource '+i,description:'',notes:'',tags:['Design'],collection:i%2?'Design / Tools':'Design / UI',addedAt:1000+i,updatedAt:1000+i,lastVisited:0,visitCount:0,favorite:false,pinned:false,archived:false,deleted:false}));
 await page.addInitScript(data=>{if(!localStorage.getItem('motion-seeded')){localStorage.setItem('fluxnav-bookmarks',JSON.stringify({schemaVersion:1,bookmarks:data}));localStorage.setItem('motion-seeded','1');}},records);
 await page.goto('http://127.0.0.1:4176/#/manage');await page.locator('.resource-main').first().waitFor();
 const nav=page.locator('.workspace-nav'),toggle=page.getByRole('button',{name:'切换侧栏'}),icon=nav.locator('.nav-entry svg').first();
 const wide=await nav.boundingBox(),pos=await icon.boundingBox();
 await toggle.click();await page.waitForFunction(()=>document.querySelector('.workspace-nav').getBoundingClientRect().width<=53);
 const rail=await nav.boundingBox(),collapsed=await icon.boundingBox();assert.ok(wide.width>160&&rail.width<=53);assert.ok(Math.abs(pos.x-collapsed.x)<=1&&Math.abs(pos.y-collapsed.y)<=1,'icon position stable');
 await toggle.click();await page.waitForTimeout(55);await toggle.click();await page.waitForTimeout(40);await toggle.click();
 await page.waitForFunction(()=>document.querySelector('.workspace-nav').getBoundingClientRect().width>=207);assert.ok(Math.abs((await icon.boundingBox()).x-pos.x)<=1);
 await page.locator('.resource-main').first().click();await page.locator('.resource-inspector[data-visible=true][data-empty=false]').waitFor();await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.waitForFunction(()=>document.querySelector('.resource-inspector').getBoundingClientRect().width<1);assert.equal(await page.locator('.resource-main').first().evaluate(e=>document.activeElement===e),true);
 await page.locator('.resource-main').first().click();await page.waitForFunction(()=>document.querySelector('.resource-inspector').getBoundingClientRect().width>=289);
 const settings=page.getByRole('button',{name:'设置 / 同步'});await settings.click();const dialog=page.getByRole('dialog',{name:'设置与同步'});await dialog.waitFor();await page.waitForTimeout(190);
 const bounds=await dialog.boundingBox();for(const name of ['首页','AI 服务','跨设备同步','本地恢复','外观']){await page.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name,exact:true}).click();const now=await dialog.boundingBox();assert.ok(Math.abs(bounds.height-now.height)<1&&Math.abs(bounds.width-now.width)<1,'settings size unchanged');}
 await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await settings.evaluate(e=>document.activeElement===e),true,'dialog focus restored');
 const more=page.locator('.resource-more').first();await more.click();const menu=page.getByRole('menu');await menu.waitFor();await page.keyboard.press('ArrowDown');await page.keyboard.press('Escape');await menu.waitFor({state:'detached'});assert.equal(await more.evaluate(e=>document.activeElement===e),true);
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.workspace-nav')).visibility==='hidden');await toggle.click();await page.waitForFunction(()=>Math.abs(document.querySelector('.workspace-nav').getBoundingClientRect().x)<1);await page.keyboard.press('Escape');await page.waitForFunction(()=>getComputedStyle(document.querySelector('.workspace-nav')).visibility==='hidden');assert.equal(await toggle.evaluate(e=>document.activeElement===e),true);
 await page.emulateMedia({reducedMotion:'reduce'});await settings.click();await dialog.waitFor();assert.equal(await dialog.evaluate(e=>getComputedStyle(e).animationName),'none');await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});await toggle.click();assert.equal(await nav.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);console.log('Motion checks passed: stable icons, rapid reversal, pane geometry, modal focus, settings dimensions, mobile drawer and reduced motion.');
}finally{await browser?.close();server.kill();}

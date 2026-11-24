import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4178','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4178/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const records=Array.from({length:92},(_,i)=>({id:'responsive-'+i,url:'https://resource'+i+'.example/',title:i===0?'用于检查极窄窗口文字截断与长标题显示的测试资源':'Resource '+String(i).padStart(2,'0'),description:'本地演示数据，检查内容宽度、滚动及资源详情布局。',notes:'Long note '.repeat(30),tags:['Design','UI','Tag '+i,'LongLabel'.repeat(8)],collection:'Design / '+(i%2?'Tools':'Components'),addedAt:Date.UTC(2026,0,1)+i*86400000,updatedAt:Date.UTC(2026,0,1)+i*86400000,lastVisited:0,visitCount:0,favorite:i%5===0,pinned:i===0,archived:false,deleted:false}));
 const seed=async p=>{await p.addInitScript(data=>{if(!localStorage.getItem('responsive-seeded')){localStorage.setItem('fluxnav-bookmarks',JSON.stringify({schemaVersion:1,bookmarks:data}));localStorage.setItem('responsive-seeded','1');}},records);await p.goto('http://127.0.0.1:4178/#/manage');await p.locator('.resource-main').first().waitFor();};
 await seed(page);await mkdir('responsive-artifacts',{recursive:true});
 const noOverflow=async p=>assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'document horizontal overflow');
 const geom=async()=>page.evaluate(()=>{const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};return {header:rect('.workspace-header'),nav:rect('.workspace-nav'),library:rect('.library'),detail:rect('.resource-inspector'),scroll:rect('.library-scroll'),status:rect('.workspace-status'),search:rect('.library-search'),headerTools:rect('.header-tools')};});
 for(const [width,height,mode] of [[2560,1440,'wide'],[1600,900,'wide'],[1440,900,'desktop'],[1200,800,'desktop'],[1199,800,'desktop'],[1001,768,'desktop'],[1000,768,'tablet'],[768,1024,'tablet'],[651,800,'tablet'],[650,800,'phone'],[390,844,'phone'],[320,700,'phone'],[844,390,'tablet'],[568,320,'phone']]){
  console.log('Checking viewport',width,height,mode);await page.setViewportSize({width,height});await page.locator('.workspace[data-mode='+mode+']').waitFor();await noOverflow(page);
  let g=await geom();assert.ok(g.library.w>220&&g.scroll.h>40,'usable library at '+width+'x'+height);assert.ok(g.headerTools.right<=width+1,'header controls within viewport at '+width);assert.ok(g.status.bottom<=height+1);
  if(mode==='desktop'||mode==='wide'){assert.ok(g.nav.w>=160&&g.library.x>=g.nav.right-1);}
  await page.locator('.library-scroll').evaluate(e=>e.scrollTop=0);const first=page.locator('.resource-main').first();await first.click();await page.locator('.resource-inspector[data-visible=true][data-empty=false]').waitFor();g=await geom();
  assert.ok(g.detail.right<=width+1&&g.detail.bottom<=height+1&&g.detail.w>=240,'inspector fits '+width+'x'+height);
  if(mode==='desktop'||mode==='wide'){assert.ok(g.library.right<=g.detail.x+1,'nonoverlap three panes');}
  else {assert.equal(await page.locator('.library').evaluate(e=>e.inert),true,'overlay blocks background');assert.ok(await page.getByRole('button',{name:'关闭详情',exact:true}).evaluate(e=>document.activeElement===e),'overlay focus');}
  if([2560,1200,768,390,320,844,568].includes(width))await page.screenshot({path:'responsive-artifacts/'+width+'x'+height+'-detail.png'});
  await page.getByRole('button',{name:'关闭详情',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.library').inert);
  if(mode==='phone'){
   await page.getByRole('button',{name:'切换侧栏'}).click();await page.locator('.workspace-nav[data-expanded=true]').waitFor();g=await geom();assert.ok(g.nav.h>=height-g.header.h-g.status.h-2,'full drawer height');assert.equal(await page.locator('.library').evaluate(e=>e.inert),true);await page.screenshot({path:'responsive-artifacts/'+width+'x'+height+'-drawer.png'});
   await page.getByRole('button',{name:'全部资源',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.library').inert);
  }
 }
 await page.setViewportSize({width:320,height:700});await page.locator('.workspace[data-mode=phone]').waitFor();
 await page.getByRole('checkbox',{name:'选择本页全部资源'}).check();await page.getByRole('group',{name:'批量操作'}).waitFor();
 assert.ok(await page.locator('.bulk-actions').evaluate(e=>e.scrollWidth>e.clientWidth),'narrow batch toolbar scrolls internally');await noOverflow(page);
 await page.getByRole('button',{name:'追加标签',exact:true}).click();await page.getByRole('textbox',{name:'新增标签'}).fill('Responsive');await page.getByRole('button',{name:'应用',exact:true}).click();await page.locator('.bulk').waitFor({state:'detached'});
 await page.getByRole('button',{name:'设置 / 同步'}).click();const settings=page.getByRole('dialog',{name:'设置与同步'});await settings.waitFor();await page.getByRole('navigation',{name:'设置分类'}).getByRole('button',{name:'首页',exact:true}).click();assert.ok(await settings.evaluate(e=>e.getBoundingClientRect().width<=innerWidth&&e.scrollWidth<=e.clientWidth+2));await page.screenshot({path:'responsive-artifacts/320-settings.png'});await page.keyboard.press('Escape');
 await page.getByRole('link',{name:'起始页',exact:true}).click();await page.locator('.home-v18').waitFor();await page.getByRole('button',{name:'首页磁贴',exact:true}).click();await noOverflow(page);await page.screenshot({path:'responsive-artifacts/320-home.png'});
 const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});await seed(touch);assert.equal(await touch.evaluate(()=>matchMedia('(pointer: coarse)').matches),true);assert.equal(await touch.locator('.drag-grip').first().isVisible(),false);await touch.locator('.resource-main').first().tap();await touch.locator('.resource-inspector[data-visible=true]').waitFor();await noOverflow(touch);await touch.getByRole('button',{name:'关闭详情',exact:true}).tap();
 assert.deepEqual(errors,[]);console.log('Responsive checks passed: 14 viewports, pane geometry, drawer height, overlay focus, bulk scrolling, settings, home and touch.');
}finally{await browser?.close();server.kill();}

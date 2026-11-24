import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4177','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let ready=false;for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:4177/')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}assert.ok(ready);
 browser=await chromium.launch();const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4177/#/design');await page.getByRole('heading',{name:'组件与设计规范'}).waitFor();await page.waitForFunction(()=>!!document.documentElement.dataset.theme);
 await mkdir('design-visual-artifacts',{recursive:true});
 const rootTheme=await page.evaluate(()=>document.documentElement.dataset.theme);
 const lab=page.locator('.design-lab');const theme=page.getByRole('group',{name:'预览主题'});
 const colors=[];for(const [name,key] of [['编辑式','editorial'],['极简','minimal'],['深色','dark'],['北欧','nordic']]){await theme.getByRole('button',{name,exact:true}).click();assert.equal(await lab.getAttribute('data-theme'),key);colors.push(await lab.evaluate(e=>getComputedStyle(e).getPropertyValue('--color-canvas').trim()));assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),rootTheme);await page.screenshot({path:'design-visual-artifacts/'+key+'.png',fullPage:true});}
 assert.equal(new Set(colors).size,4);
 assert.equal(await page.getByRole('button',{name:'加载中',exact:true}).isDisabled(),true);assert.equal(await page.getByRole('button',{name:'加载中',exact:true}).getAttribute('aria-busy'),'true');assert.equal(await page.getByRole('button',{name:'不可用',exact:true}).isDisabled(),true);
 const search=page.getByRole('textbox',{name:'演示搜索'});await search.fill('test');await page.getByRole('button',{name:'清除搜索',exact:true}).click();assert.equal(await search.inputValue(),'');assert.ok(await search.evaluate(e=>document.activeElement===e));
 await page.getByRole('checkbox',{name:'显示错误边框'}).check();assert.equal(await page.getByRole('textbox',{name:'异常状态'}).getAttribute('aria-invalid'),'true');
 await page.getByRole('group',{name:'演示视图'}).getByRole('button',{name:'网格',exact:true}).click();assert.equal(await page.getByRole('group',{name:'演示视图'}).getByRole('button',{name:'网格',exact:true}).getAttribute('aria-pressed'),'true');
 const opener=page.getByRole('button',{name:'打开演示弹窗'});await opener.click();await page.getByRole('dialog',{name:'演示弹窗'}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog',{name:'演示弹窗'}).waitFor({state:'detached'});assert.ok(await opener.evaluate(e=>document.activeElement===e));
 const menuOpener=page.getByRole('button',{name:'快捷菜单',exact:true});await menuOpener.click();await page.getByRole('menu').waitFor();assert.equal(await page.getByRole('menu').getAttribute('data-theme'),'nordic');await page.keyboard.press('Escape');await page.getByRole('menu').waitFor({state:'detached'});assert.ok(await menuOpener.evaluate(e=>document.activeElement===e));
 await page.setViewportSize({width:320,height:720});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:'design-visual-artifacts/mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:900});await page.getByRole('link',{name:/返回工作台/}).click();await page.getByRole('button',{name:'＋ 添加'}).click();await page.getByPlaceholder('https://example.com').fill('https://test.example/');await page.getByRole('button',{name:'保存资源',exact:true}).click();await page.locator('.resources article').first().waitFor();assert.ok(await page.locator('.resources article').first().innerText().then(s=>s.includes('test.example')));
 await page.getByRole('button',{name:'全局搜索',exact:true}).click();const global=page.getByRole('textbox',{name:'搜索资源和命令'});await global.fill('test.example');await page.getByRole('button',{name:'清除搜索',exact:true}).click();assert.equal(await global.inputValue(),'');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'设置 / 同步'}).click();await page.getByRole('link',{name:/组件与设计规范/}).click();await page.getByRole('heading',{name:'组件与设计规范'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),rootTheme);
 assert.deepEqual(errors,[]);console.log('Design system checks passed: four scoped themes, disabled/loading, search focus, validation, segments, modal/menu focus, mobile and real editor submission.');
}finally{await browser?.close();server.kill();}

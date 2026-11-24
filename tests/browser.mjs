import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn('npm',['run','dev','--','--host','127.0.0.1','--port','4173','--strictPort'],{stdio:'inherit'});
let browser;
try{
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:4173/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,200));}
  browser=await chromium.launch({headless:true});const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4173/#/manage');
  await page.getByRole('button',{name:'＋ 添加'}).click();
  await page.getByPlaceholder('https://example.com').fill('https://example.com');
  await page.getByLabel('标题',{exact:true}).fill('Example');
  await page.getByRole('button',{name:'保存资源'}).click();
  await page.getByRole('button',{name:/Example/}).first().waitFor();
  await page.getByRole('button',{name:/Example/}).first().click();
  await page.getByRole('button',{name:'收藏',exact:true}).last().click();
  await page.getByRole('button',{name:'移入回收站',exact:true}).click();
  await page.getByRole('button',{name:/回收站/}).first().click();
  await page.getByRole('button',{name:/Example/}).first().click();
  await page.getByRole('button',{name:'恢复资源'}).click();
  await page.getByRole('button',{name:/全部资源/}).first().click();
  await page.getByRole('button',{name:/Example/}).first().waitFor();
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByRole('button',{name:/Example/}).first().waitFor();
  await page.keyboard.press('Control+k');
  await page.getByRole('dialog',{name:'全局搜索'}).waitFor();
  await page.getByRole('textbox',{name:'搜索资源和命令'}).fill('Example');
  await page.getByRole('button',{name:/Example/}).last().waitFor();
  await page.keyboard.press('Escape');
  assert.deepEqual(errors,[]);
  console.log('Browser smoke test passed');
}finally{await browser?.close();server.kill();}

import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {browser} from '../scripts/browser.js';
import {serve} from '../scripts/serve.js';
test('full lab workflows: independent evidence, blind review, fingerprints and efficiency',async()=>{
  const server=await serve(0);let instance;
  try{
    instance=await browser();const page=await instance.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const url=`http://127.0.0.1:${server.address().port}`;await page.goto(url);await page.waitForFunction(()=>window.testSkillLab);await page.evaluate(()=>testSkill.pause());
    await page.locator('#finger-run').click();await page.waitForFunction(()=>document.querySelector('#finger-status').textContent.includes('样本不足'));
    assert.equal(await page.locator('#finger-features meter').count(),14);
    await page.locator('#fingerprint details').evaluate(e=>e.open=true);await page.locator('#sample-model').fill('Declared fixture');await page.locator('#sample-provenance').fill('Handcrafted test, not a model');await page.locator('#sample-add').click();await page.waitForFunction(()=>document.querySelector('#sample-count').textContent==='1');
    await page.locator('#sample-add').click();await page.waitForFunction(()=>document.querySelector('#finger-status').textContent.includes('已登记'));
    await page.locator('#arena-demo').click();await page.locator('#arena-start').click();assert.equal(await page.locator('#arena-setup').isVisible(),false);assert.equal(await page.locator('#arena-cards svg').count(),2);
    assert.deepEqual(await page.locator('#arena-cards h3').allTextContents(),['作品 A','作品 B']);
    await page.locator('#arena-reveal').click();assert.match(await page.locator('#arena-status').textContent(),/全部八项评分/);
    for(const s of await page.locator('#arena-cards select').all())await s.selectOption('75');
    const dl=page.waitForEvent('download');await page.locator('#arena-reveal').click();await dl;assert.match((await page.locator('#arena-cards h3').allTextContents()).join(' '),/手工参考/);
    for(const s of await page.locator('#review-controls select').all())await s.selectOption('75');await page.locator('#review-model').fill('Fixture only');await page.locator('#review-tokens').fill('1000');await page.locator('#review-save').click();await page.waitForFunction(()=>document.querySelector('#review-status').textContent.includes('已保存'));assert.equal(await page.locator('#quality-chart circle').count(),1);
    await page.locator('#judge-fixture').click();await page.locator('#judge-run').click();await page.waitForFunction(()=>document.querySelector('#judge-frames img')!==null,{},{timeout:25000});assert.equal(await page.locator('#judge-frames img').count(),4);assert.equal(await page.locator('#technical-score').textContent(),'100');
    // Reject cross-origin JSON posts; do not execute their body.
    const response=await fetch(url+'/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json','Origin':'https://unrelated.example'},body:'{}'});assert.equal(response.status,403);
    await page.locator('#challenge').selectOption('paths');await page.locator('#apply').click();assert.match(await page.locator('#status').textContent(),/Path-only/);await page.locator('#challenge').selectOption('standard');await page.locator('#reset').click();
    await mkdir('work/visual',{recursive:true});await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:'work/visual/lab-v2.png',fullPage:true});
    await page.locator('#judge').screenshot({path:'work/visual/independent.png'});await page.locator('#arena').screenshot({path:'work/visual/arena.png'});
    await page.locator('#scene').screenshot({path:'work/visual/hero-v2.png'});
    await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'work/visual/mobile-v2.png',fullPage:true});
    await page.reload();await page.waitForFunction(()=>window.testSkillLab);assert.equal(await page.locator('#sample-count').textContent(),'1');assert.equal(await page.locator('#quality-chart circle').count(),1);
    assert.deepEqual(errors,[]);await writeFile('work/visual/lab-report.json',JSON.stringify({workflows:['independent HTML and four evidence frames','blind labels hidden until eight ratings','fingerprint abstention','sample deduplication and persistence','quality/token chart and persistence','cross-origin request rejection','challenge enforcement','390px viewport','no page errors'],fixtureOnly:true},null,2));
  }finally{await instance?.close();await new Promise(r=>server.close(r));}
});

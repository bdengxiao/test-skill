import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {serve} from '../scripts/serve.js';
import {browser} from '../scripts/browser.js';
const server=await serve(0);let instance;const checks=[];
try{
  instance=await browser();const page=await instance.newPage({viewport:{width:1440,height:1160}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text());});
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.testSkill);
  const p0=await page.evaluate(()=>testSkill.phase);await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>testSkill.phase)>p0);checks.push('requestAnimationFrame advances');
  await page.evaluate(()=>testSkill.pause());
  const reports=await page.evaluate(()=>Object.entries(testSkill.animals).map(([name,data])=>({name,...testSkill.inspect(JSON.stringify(data),30)})));
  for(const r of reports){assert.equal(r.pass,true,`${r.name}: ${r.errors}`);assert.equal(r.samples.length,16);checks.push(`${r.name}: 16 phases, bounds and contacts`);}
  const wheel0=await page.locator('#wheel-a').getAttribute('transform');await page.evaluate(()=>testSkill.frame(.25));assert.notEqual(await page.locator('#wheel-a').getAttribute('transform'),wheel0);checks.push('wheel transform changes');
  const good=await page.evaluate(()=>JSON.stringify(testSkill.compactAnimals.cat));
  assert.deepEqual(errors,[]);
  const malicious=[
    '<g id="animal"><script>alert(1)</script></g>',
    '<g id="animal" onload="alert(1)"/>',
    '<g id="animal"><image href="https://example.com/x"/></g>',
    '<g id="animal"><path fill="url(https://example.com)" d="M0 0"/></g>',
    '<g id="animal"><circle r="NaN"/></g>',
    '<g id="animal"><g></g>',
    '<!DOCTYPE svg><g id="animal"/>',
    good.replace('"cx":296','"cx":9999'),
    good.replace('"stroke-width":10','"stroke-width":0'),
    good.replace('"pedal-a"','"missing"'),
    '<g id="animal"><g id="animal"/></g>',
    good.replace('M273 256Q221 259 243 221','M273 256Q221'),
    good.replace('"cx":296','"cx":1e999'),
    good.replace('"stroke":"#c98557"','"stroke":"transparent"')
  ];
  for(const [i,s] of malicious.entries()){const r=await page.evaluate(s=>testSkill.inspect(s,30),s);assert.equal(r.pass,false,`Case ${i}: ${s.slice(0,80)}`);}checks.push(`${malicious.length} invalid and unsafe submissions rejected`);
  assert.ok(errors.every(e=>/attribute (r|cx|d):/.test(e)),errors.join('\n'));errors.length=0;
  assert.equal(await page.evaluate(s=>testSkill.inspect(s,2).pass,good),false);checks.push('element budget enforced');
  const raw=await page.evaluate(async()=>{document.querySelector('#format').value='svg';document.querySelector('#format').dispatchEvent(new Event('change'));return document.querySelector('#source').value;});
  assert.equal(await page.evaluate(s=>testSkill.inspect(s).pass,raw),true);checks.push('raw SVG round trip');
  const prev=await page.evaluate(()=>testSkill.submitted);await page.evaluate(()=>testSkill.apply('<g/>'));assert.equal(await page.evaluate(()=>testSkill.submitted),prev);checks.push('failed submission preserves scene');
  await page.evaluate(()=>testSkill.select('pelican'));await page.locator('#prompt').click();assert.match(await page.locator('#prompt-text').textContent(),/Animal: pelican/);checks.push('prompt generated');
  const download=page.waitForEvent('download');await page.locator('#export').click();assert.match((await download).suggestedFilename(),/test-skill-pelican/);checks.push('report export');
  await mkdir('work/visual',{recursive:true});await page.screenshot({path:'work/visual/desktop.png',fullPage:true});
  for(const name of ['pelican','cat','rabbit','octopus']){await page.evaluate(n=>{testSkill.select(n);testSkill.frame(.125);},name);await page.locator('#scene').screenshot({path:`work/visual/${name}.png`});}
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:'work/visual/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('390px viewport has no horizontal overflow');
  const reduced=await instance.newPage({reducedMotion:'reduce'});await reduced.goto(`http://127.0.0.1:${server.address().port}`);await reduced.waitForFunction(()=>window.testSkill);await reduced.waitForTimeout(100);assert.equal(await reduced.evaluate(()=>testSkill.phase),0);checks.push('reduced motion starts paused');
  assert.deepEqual(errors,[]);checks.push('no browser console/page errors');await writeFile('work/visual/report.json',JSON.stringify({checks,reports},null,2));console.log(checks.join('\n'));
}finally{await instance?.close();await new Promise(r=>server.close(r));}

import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {browser} from './browser.js';
import {serve,root} from './serve.js';
import {openPreviewServer} from './preview-window.js';
export async function createTrialSession(){
  const server=await serve(0);let instance;
  try{
    instance=await browser();const page=await instance.newPage({viewport:{width:1120,height:900}});
    await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.testSkill);
    const preview=await instance.newPage();
    return {page,preview,async close(){await instance.close();await new Promise(r=>server.close(r));}};
  }catch(e){await instance?.close();await new Promise(r=>server.close(r));throw e;}
}
export async function completeTrial({input,animal='pelican',maxElements=30,out,session,openPreview=false}){
const started=performance.now(),owned=!session;
input=resolve(input);const source=await readFile(input,'utf8');
if(!Number.isInteger(maxElements)||maxElements<1||maxElements>200)throw Error('max-elements must be an integer from 1 to 200');
out=resolve(out||join('outputs','test-skill-'+new Date().toISOString().replace(/[:.]/g,'-')));
await mkdir(dirname(out),{recursive:true});await mkdir(out);
const name=source.trim().startsWith('{')?'animal.json':'animal.svg';await writeFile(join(out,name),source);
const report={version:'0.3.1',animal,track:'A',maxElements,firstAttempt:true,repairAttempts:0,sourceHash:createHash('sha256').update(source).digest('hex'),model:null,usage:null,qualityScore:null,createdAt:new Date().toISOString(),validation:null,artifacts:{source:name,html:null,screenshot:null}};
try{
  session ||= await createTrialSession();const {page,preview}=session;
  report.validation=await page.evaluate(({source,maxElements})=>{testSkill.pause();return testSkill.inspect(source,maxElements);},{source,maxElements});
  if(report.validation.pass){
    await page.locator('#limit').fill(String(maxElements));await page.evaluate(source=>{testSkill.apply(source);testSkill.frame(.125);},source);
    await page.locator('#scene').screenshot({path:join(out,'preview.png')});
    const svg=await page.evaluate(()=>new XMLSerializer().serializeToString(document.querySelector('#rider #animal')));
    const rig=(await readFile(join(root,'template/rig.js'),'utf8')).replace(/^import[^\n]*\n/,'').replaceAll('export class ','class ').replaceAll('export function ','function ');
    const safe=JSON.stringify(svg).replaceAll('<','\\u003c');
    const title=animal.replace(/[&<>"']/g,'');
    const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test Skill · ${title}</title><style>body{margin:0;background:#f5f5ed;color:#34504a;font:14px system-ui}main{box-sizing:border-box;max-width:950px;height:100vh;margin:0 auto;padding:18px;display:flex;flex-direction:column}header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}svg{display:block;width:100%;min-height:0;flex:1;border-radius:12px}button{background:white;border:1px solid #abc0af;border-radius:6px;padding:8px 18px;color:inherit}p{font-size:12px;color:#7d8f83}</style><main><header><b>Test Skill / ${title}</b><button id="play">暂停</button></header><svg id="scene" viewBox="0 0 640 440" role="img" aria-label="Animal riding a bicycle"></svg><p>${report.validation.elementCount} SVG elements · first attempt · 16-phase validation passed</p></main><script type="module">const NS='http://www.w3.org/2000/svg';${rig}
const bike=new BikeRig(document.getElementById('scene')),rider=new RiderRig(bike);const doc=new DOMParser().parseFromString('<svg xmlns="'+NS+'">'+${safe}+'</svg>','image/svg+xml');rider.mount(document.importNode(doc.documentElement.firstElementChild,true));let playing=!matchMedia('(prefers-reduced-motion:reduce)').matches,phase=.125,last=0;const button=document.getElementById('play');button.textContent=playing?'暂停':'播放';button.onclick=()=>{playing=!playing;button.textContent=playing?'暂停':'播放';};bike.render(phase);rider.render();window.trialPreview={get phase(){return phase;}};function tick(t){if(playing&&last){phase+=Math.min(t-last,100)/2000;bike.render(phase);rider.render();}last=t;requestAnimationFrame(tick);}requestAnimationFrame(tick);</script></html>`;
    const htmlPath=join(out,'preview.html');await writeFile(htmlPath,html);
    const errors=[],onError=e=>errors.push(e.message);preview.on('pageerror',onError);
    await preview.goto(pathToFileURL(htmlPath).href);await preview.waitForFunction(()=>window.trialPreview);
    const p=await preview.evaluate(()=>trialPreview.phase);await preview.waitForFunction(p=>trialPreview.phase>p,p);const moved=true;preview.off('pageerror',onError);
    if(errors.length||!moved)throw new Error('Standalone preview failed: '+(errors.join('; ')||'animation not advancing'));
    report.artifacts.html='preview.html';report.artifacts.screenshot='preview.png';report.previewVerified=true;
    if(openPreview)report.previewUrl=(await openPreviewServer(out)).url;
  }
}catch(e){report.executionError=e.message;}
finally{if(owned)await session?.close();report.processingMs=Math.round(performance.now()-started);await writeFile(join(out,'report.json'),JSON.stringify(report,null,2));}
return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
const args=process.argv.slice(2),get=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
if(args.includes('--help'))console.log('complete-trial.js --input file [--animal pelican] [--out directory] [--no-preview]');
else if(!get('--input')){console.error('Provide --input');process.exitCode=1;}
else {const report=await completeTrial({input:get('--input'),animal:get('--animal','pelican'),maxElements:Number(get('--max-elements','30')),out:get('--out'),openPreview:!args.includes('--no-preview')});console.log(JSON.stringify(report));if(report.executionError)process.exitCode=1;}
}

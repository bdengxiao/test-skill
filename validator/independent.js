import {browser} from '../scripts/browser.js';
import {createHash} from 'node:crypto';
// Browser-observed evidence, independent of any score or test API in submitted HTML.
export async function evaluateHTML(source,{maxElements=200,timeoutMs=15000}={}){
  if(typeof source!=='string'||Buffer.byteLength(source)>150000)throw new Error('HTML must be at most 150 KB');
  if(!Number.isInteger(maxElements)||maxElements<1||maxElements>2000)throw new Error('Invalid element limit');
  const instance=await browser();let timer;
  const run=async()=>{
    const context=await instance.newContext({viewport:{width:800,height:560},deviceScaleFactor:1,serviceWorkers:'block',acceptDownloads:false});
    const blocked=[],errors=[],dialogs=[];
    await context.route('**/*',route=>{blocked.push(route.request().url().slice(0,200));return route.abort();});
    await context.routeWebSocket('**/*',ws=>ws.close());
    context.on('page',p=>{p.on('dialog',d=>{dialogs.push(d.type());d.dismiss().catch(()=>{});});});
    const page=await context.newPage();page.setDefaultTimeout(2500);page.on('pageerror',e=>errors.push(e.message.slice(0,300)));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,300));});
    // Opaque-origin sandbox prevents access to the lab and disallows popups, forms and downloads.
    await page.setContent('<style>body{margin:0}iframe{border:0;width:800px;height:560px}</style><iframe sandbox="allow-scripts"></iframe>');
    const policy="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; media-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'";
    await page.locator('iframe').evaluate((el,{source,policy})=>{el.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">${source}`;},{source,policy});
    await page.waitForTimeout(300);const frame=page.frames().find(f=>f!==page.mainFrame());if(!frame)throw new Error('Frame failed to initialize');
    const snapshots=[],samples=[];let firstTime=null;
    for(let i=0;i<4;i++){
      if(i)await page.waitForTimeout(430);
      const observed=Date.now();if(firstTime===null)firstTime=observed;
      const sample=await frame.evaluate(()=>{
        const svgs=[...document.querySelectorAll('svg')];let invalidGeometry=0,clipped=0,visible=0;
        const shapes=[...document.querySelectorAll('svg path,svg circle,svg ellipse,svg rect,svg line,svg polygon,svg polyline,svg text')];
        const circles=[];
        for(const el of shapes.slice(0,3000)){
          const r=el.getBoundingClientRect(),cs=getComputedStyle(el);
          if(![r.x,r.y,r.width,r.height].every(Number.isFinite))invalidGeometry++;
          if(r.width&&r.height&&cs.visibility!=='hidden'&&cs.display!=='none'&&Number(cs.opacity)>0)visible++;
          if(r.width>0&&r.height>0&&(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5))clipped++;
          if(el.tagName==='circle'&&r.width>=35&&r.height>=35)circles.push({x:r.x+r.width/2,y:r.y+r.height/2,r:r.width/2});
        }
        const wheelPair=circles.some((a,i)=>circles.slice(i+1).some(b=>Math.abs(a.y-b.y)<15&&Math.abs(a.r-b.r)<12&&Math.abs(a.x-b.x)>a.r+b.r));
        const clippedRoots=svgs.filter(svg=>{const r=svg.getBoundingClientRect();return r.width>0&&r.height>0&&(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5);}).length;
        return {svgCount:svgs.length,elementCount:document.querySelectorAll('svg,svg *').length,visibleShapes:visible,invalidGeometry,clippedShapes:clipped,clippedRoots,wheelPairEvidence:wheelPair};
      });
      samples.push({observedMs:observed-firstTime,...sample});snapshots.push((await page.locator('iframe').screenshot({timeout:2500})).toString('base64'));
    }
    const probe=await context.newPage();
    const pixels=await probe.evaluate(async images=>{
      const frames=[];
      for(const b64 of images){const img=new Image();img.src='data:image/png;base64,'+b64;await img.decode();const c=document.createElement('canvas');c.width=200;c.height=140;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,200,140);frames.push(ctx.getImageData(0,0,200,140).data);}
      const n=200*140,diffs=[];
      for(let i=1;i<frames.length;i++){let changed=0;for(let p=0;p<frames[i].length;p+=4)if(Math.abs(frames[i][p]-frames[i-1][p])+Math.abs(frames[i][p+1]-frames[i-1][p+1])+Math.abs(frames[i][p+2]-frames[i-1][p+2])>45)changed++;diffs.push(changed/n);}
      const first=frames[0];let contrast=0;for(let p=0;p<first.length;p+=4)if(Math.abs(first[p]-first[0])+Math.abs(first[p+1]-first[1])+Math.abs(first[p+2]-first[2])>60)contrast++;
      return {changedFractions:diffs,nonBackgroundFraction:contrast/n};
    },snapshots);
    const uniqueErrors=[...new Set(errors)],network=[...new Set(blocked)];
    const checks=[
      {id:'svg',label:'存在可见 SVG',pass:samples.every(s=>s.svgCount>0&&s.visibleShapes>0)&&pixels.nonBackgroundFraction>.005,weight:25},
      {id:'motion',label:'观察到画面运动',pass:pixels.changedFractions.filter(x=>x>.0005).length>=2,weight:25},
      {id:'bounds',label:'几何与画布边界',pass:samples.every(s=>s.invalidGeometry===0&&s.clippedRoots===0),weight:20},
      {id:'budget',label:'SVG 元素预算',pass:samples.every(s=>s.elementCount<=maxElements),weight:10},
      {id:'runtime',label:'无运行或依赖错误',pass:uniqueErrors.length===0&&network.length===0&&dialogs.length===0,weight:20}
    ];
    return {version:'0.2.0',track:'B',sourceHash:createHash('sha256').update(source).digest('hex'),pass:checks.every(c=>c.pass),technicalScore:checks.reduce((sum,c)=>sum+(c.pass?c.weight:0),0),checks,samples,pixels,errors:uniqueErrors,blockedRequests:network,dialogs,frames:snapshots.map(b=>'data:image/png;base64,'+b),recognizability:null,qualityScore:null,limitations:['Frame changes do not establish correct bicycle motion.','Wheel-pair detection is an unscored circle heuristic.','Four real-time samples, not exhaustive continuous validation.','Browser isolation is intended for local model outputs, not a hostile multi-tenant execution service.']};
  };
  try{return await Promise.race([run(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Evaluation timed out')),timeoutMs);})]);}
  finally{clearTimeout(timer);await Promise.race([instance.close(),new Promise(r=>setTimeout(r,3000))]);}
}

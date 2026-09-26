import http from 'node:http';
import {readFile,writeFile,mkdir,readdir,copyFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {completeTrial,createTrialSession} from './complete-trial.js';
const here=dirname(fileURLToPath(import.meta.url));
const data=resolve(process.env.TEST_SKILL_DATA||join(homedir(),'.codex','test-skill-data'));
const args=process.argv.slice(2),get=(k,d)=>args.includes(k)?args[args.indexOf(k)+1]:d;
export function summarize(reports){
  const valid=reports.filter(r=>!r.executionError&&r.validation).length;
  return {score:valid===reports.length&&valid?Math.round(100*reports.filter(r=>r.validation.pass).length/reports.length):null,passed:reports.filter(r=>r.validation?.pass).length,total:reports.length};
}
async function launch(url){
  let command,options;
  if(process.platform==='win32'){
    command=[join(process.env.PROGRAMFILES||'C:/Program Files','Google/Chrome/Application/chrome.exe'),join(process.env['PROGRAMFILES(X86)']||'C:/Program Files (x86)','Microsoft/Edge/Application/msedge.exe')].find(existsSync);
    if(command)options=['--new-window','--start-maximized',url];
    else {command='rundll32.exe';options=['url.dll,FileProtocolHandler',url];}
  }else {command=process.platform==='darwin'?'open':'xdg-open';options=[url];}
  await new Promise((ok,no)=>{const p=spawn(command,options,{detached:true,stdio:'ignore'});p.once('error',no);p.once('spawn',()=>{p.unref();ok();});});
}
async function history(){
  await mkdir(data,{recursive:true});const runs=[];
  for(const name of await readdir(data)){if(!/^run-[\w-]+$/.test(name))continue;try{runs.push(JSON.parse(await readFile(join(data,name,'run.json'),'utf8')));}catch{}}
  return runs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
async function server(){
  let idle;const reset=()=>{clearTimeout(idle);idle=setTimeout(()=>s.close(),3600000);idle.unref();};
  const s=http.createServer(async(req,res)=>{
    if(!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')||!['GET','HEAD'].includes(req.method)){res.writeHead(403).end();return;}
    reset();const url=new URL(req.url,'http://localhost');
    try{
      let body,type='text/html; charset=utf-8';
      if(url.pathname==='/')body=await readFile(join(here,'../template/studio.html'));
      else if(url.pathname==='/api/runs'){body=JSON.stringify(await history());type='application/json';}
      else {
        const m=url.pathname.match(/^\/runs\/(run-[\w-]+)\/(pelican|cat|octopus|rabbit|penguin|frog|monkey|giraffe|snake)\/(preview\.html|preview\.png|report\.json)$/);
        if(!m){res.writeHead(404).end();return;}
        body=await readFile(join(data,m[1],m[2],m[3]));type=m[3].endsWith('.png')?'image/png':m[3].endsWith('.json')?'application/json':'text/html; charset=utf-8';
      }
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(body);
    }catch{res.writeHead(404).end('Result unavailable');}
  });
  s.listen(0,'127.0.0.1',async()=>{await writeFile(join(data,'server.json'),JSON.stringify({url:`http://127.0.0.1:${s.address().port}/`,pid:process.pid}));reset();});
}
async function main(){
  await mkdir(data,{recursive:true});
  if(args.includes('--serve')){await server();return;}
  const started=performance.now();let run;
  if(get('--manifest')){
    const manifestPath=resolve(get('--manifest')),manifest=JSON.parse((await readFile(manifestPath,'utf8')).replace(/^\uFEFF/,''));
    if(!Array.isArray(manifest.tasks)||!manifest.tasks.length)throw Error('Manifest requires tasks');
    const allowed=['pelican','cat','octopus','rabbit','penguin','frog','monkey','giraffe','snake'];
    const names=manifest.tasks.map(t=>t.animal);
    if(names.some(n=>!allowed.includes(n))||new Set(names).size!==names.length)throw Error('Animals must be supported and unique');
    const id='run-'+new Date().toISOString().replace(/[:.]/g,'-');
    const out=resolve(get('--out',join('outputs',id)));await mkdir(out,{recursive:true});
    run={id,createdAt:new Date().toISOString(),protocol:'structure-1',model:manifest.model||null,settings:manifest.settings||null,kind:manifest.kind==='demo'?'demo':'trial',reports:[]};
    let session;try{session=await createTrialSession();
    for(const task of manifest.tasks){
      const target=join(out,task.animal);
      const report=await completeTrial({input:resolve(dirname(manifestPath),task.file),animal:task.animal,maxElements:30,out:target,session});run.reports.push(report);
      const saved=join(data,id,task.animal);await mkdir(saved,{recursive:true});
      for(const file of [report.artifacts.source,'report.json',report.artifacts.html,report.artifacts.screenshot].filter(Boolean))await copyFile(join(target,file),join(saved,file));
    }
    }finally{await session?.close();}
    run.processingMs=Math.round(performance.now()-started);run.generationMs=null;
    Object.assign(run,summarize(run.reports));run.condition=JSON.stringify({protocol:run.protocol,animals:names.slice().sort(),limit:30,model:run.model,settings:run.settings});
    await writeFile(join(out,'run.json'),JSON.stringify(run,null,2));await writeFile(join(data,id,'run.json'),JSON.stringify(run,null,2));
  }
  const child=spawn(process.execPath,[fileURLToPath(import.meta.url),'--serve'],{detached:true,stdio:'ignore',windowsHide:true});child.unref();
  let state;for(let i=0;i<60;i++){try{state=JSON.parse(await readFile(join(data,'server.json'),'utf8'));if(state.pid===child.pid)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  if(state?.pid!==child.pid)throw Error('Studio did not start');
  const url=state.url+(run?'?run='+run.id:'');let opened=false;
  if(!args.includes('--no-open')){try{await launch(url);opened=true;}catch(e){console.error('Browser launch failed: '+e.message);}}
  console.log(JSON.stringify({url,opened,score:run?.score??null,kind:run?.kind??null,processingMs:run?.processingMs??null}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});

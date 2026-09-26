import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {serve,root} from './serve.js';
import {browser} from './browser.js';
import {promptFor,VERSION} from '../lib/contract.js';
import {normalizeUsage,score} from '../lib/metrics.js';
import {evaluateHTML} from '../validator/independent.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
const args=process.argv.slice(2), arg=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;
if(args.includes('--help')||!args.length){console.log('Plan: node scripts/run-benchmark.js --plan work/plan.json [--budgets 50,100,250,500,1000] [--skills none,micro,mini,full]\nRun: node scripts/run-benchmark.js --manifest work/manifest.json [--out results/runs/run-id] [--adapter path/to/adapter.js]\nDefault provider reads saved outputs; no model calls. Track B runs in an isolated browser; visual quality needs review.');process.exit(0);}
const tasks=(await readFile(resolve(root,'benchmark/tasks.jsonl'),'utf8')).trim().split('\n').map(JSON.parse);
async function getPrompt(task,mode){
  if(!['none','micro','mini','full'].includes(mode))throw new Error('Unknown skill mode');
  const skill=mode==='none'?'':await readFile(resolve(root,mode==='full'?'SKILL.md':`skills/SKILL-${mode}.md`),'utf8');
  return promptFor(task,skill);
}
if(args.includes('--plan')){
  const entries=[];
  for(const task of tasks)for(const budget of arg('--budgets','50,100,250,500,1000').split(',').map(Number))for(const skill of arg('--skills','none,micro,mini,full').split(',')){
    if(!Number.isInteger(budget)||budget<1)throw new Error('Budget must be positive integer');
    const t={...task,budget}; const prompt=await getPrompt(t,skill);
    entries.push({task:t,skill,prompt,promptHash:hash(prompt),file:null,model:null,usage:{inputTokens:null,outputTokens:null,reasoningTokens:null,totalTokens:null,latencyMs:null,costUSD:null}});
  }
  const out=resolve(arg('--plan'));await mkdir(dirname(out),{recursive:true});await writeFile(out,JSON.stringify(entries,null,2));console.log(`${entries.length} reproducible prompts -> ${out}`);process.exit(0);
}
if(!args.includes('--manifest'))throw new Error('Expected --manifest');
const manifest=resolve(arg('--manifest')),entries=JSON.parse(await readFile(manifest,'utf8'));
if(!Array.isArray(entries)||!entries.length)throw new Error('Manifest must be a nonempty array');
const output=resolve(arg('--out',`results/runs/${Date.now()}`));await mkdir(output,{recursive:true});
const adapter=await import(args.includes('--adapter')?pathToFileURL(resolve(arg('--adapter'))).href:'../providers/offline.js');
const server=await serve(0);let instance;
try{
  instance=await browser();const page=await instance.newPage({viewport:{width:1280,height:1000}});const consoleErrors=[];
  page.on('pageerror',e=>consoleErrors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.testSkill);await page.evaluate(()=>testSkill.pause());
  const records=[];
  for(const [index,entry] of entries.entries()){
    const task=entry.task;
    if(!task||!['A','B'].includes(task.track)||!task.animal||!Number.isInteger(task.budget)||task.budget<1||!Number.isInteger(task.maxElements)||task.maxElements<1)throw new Error(`Invalid task at ${index}`);
    const skill=entry.skill||'none', prompt=await getPrompt(task,skill);
    if(entry.prompt && entry.prompt!==prompt)throw new Error('Prompt drift: regenerate plan or restore pinned skill');
    const record={version:VERSION,runId:String(index).padStart(4,'0'),task,skill,prompt,promptHash:hash(prompt),createdAt:new Date().toISOString(),review:entry.review||null,model:entry.model||'unreported',provider:entry.provider||'offline',provenance:entry.provenance||null};
    try{
      const response=await adapter.generate({task,prompt,entry,baseDir:dirname(manifest)});
      if(typeof response.content!=='string')throw new Error('Adapter content must be a string');
      record.model=response.model;record.provider=response.provider;record.usage=normalizeUsage(response.usage);record.rawUsage=response.rawUsage??null;record.responseHash=hash(response.content);
      const file=`${record.runId}.${task.track==='B'?'html':response.content.trim().startsWith('{')?'json':'svg'}`;
      await writeFile(resolve(output,file),response.content);record.responseFile=file;
      if(task.track==='B'){
        const evaluation=await evaluateHTML(response.content,{maxElements:task.maxElements});record.frames=[];
        for(const [i,data] of evaluation.frames.entries()){const name=`${record.runId}-frame-${i}.png`;await writeFile(resolve(output,name),Buffer.from(data.split(',')[1],'base64'));record.frames.push(name);}
        const {frames,...validation}=evaluation;record.validation=validation;
      }else record.validation=await page.evaluate(({source,limit})=>testSkill.inspect(source,limit),{source:response.content,limit:task.maxElements});
      record.consoleErrors=[...consoleErrors];
      if(consoleErrors.length&&task.track==='A'){record.validation.pass=false;record.validation.errors.push('Browser errors');}
      if(record.validation.pass&&task.track==='A'){
        await page.locator('#limit').fill(String(task.maxElements));await page.evaluate(s=>testSkill.apply(s),response.content);
        record.frames=[];
        for(const phase of [0,.25,.5,.75]){await page.evaluate(p=>testSkill.frame(p),phase);const name=`${record.runId}-${phase}.png`;await page.locator('#scene').screenshot({path:resolve(output,name)});record.frames.push(name);}
      }
      Object.assign(record,score(record));
    }catch(e){record.error=e.message;record.validation={pass:false,errors:[e.message]};record.usage??=normalizeUsage();Object.assign(record,score(record));}
    records.push(record);console.log(`${record.runId} ${task.animal} ${task.track} ${record.validation.pass===null?'NOT EVALUATED':record.validation.pass?'PASS':'FAIL'}`);
  }
  await writeFile(resolve(output,'results.jsonl'),records.map(r=>JSON.stringify(r)).join('\n')+'\n');console.log(`Saved ${records.length} records to ${output}`);
}finally{await instance?.close();await new Promise(r=>server.close(r));}

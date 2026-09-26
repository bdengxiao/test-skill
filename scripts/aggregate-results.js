import {readFile,writeFile} from 'node:fs/promises';
import {score} from '../lib/metrics.js';
const paths=process.argv.slice(2);if(!paths.length){console.log('node scripts/aggregate-results.js results/runs/<id>/results.jsonl [...]');process.exit(0);}
const records=(await Promise.all(paths.map(p=>readFile(p,'utf8')))).flatMap(s=>s.trim().split('\n').filter(Boolean).map(JSON.parse));
const groups=new Map();
for(const r of records){
  const key=JSON.stringify([r.version,r.model,r.provider,r.task.track,r.skill,r.task.budget,r.task.animal,r.task.maxElements,r.task.requirement||'',r.provenance?.settings||null]);
  if(!groups.has(key))groups.set(key,[]);groups.get(key).push({...r,...score(r)});
}
const mean=v=>v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
const result=[...groups].map(([key,rows])=>({group:JSON.parse(key),attempts:rows.length,evaluated:rows.filter(r=>r.validation?.pass!=null).length,passRate:mean(rows.filter(r=>r.validation?.pass!=null).map(r=>Number(r.validation.pass))),meanQuality:mean(rows.map(r=>r.qualityScore).filter(v=>v!==null)),meanQualityPer1kTokens:mean(rows.map(r=>r.qualityPer1kTokens).filter(v=>v!==null)),budgetPassRate:mean(rows.map(r=>r.budgetPass).filter(v=>v!==null).map(Number)),reviewed:rows.filter(r=>r.qualityScore!==null).length,usageReported:rows.filter(r=>r.usage?.totalTokens!=null).length}));
console.log(JSON.stringify({groupFields:['version','model','provider','track','skill','budget','animal','maxElements','requirement','settings'],groups:result},null,2));

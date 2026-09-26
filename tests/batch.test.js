import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {completeTrial,createTrialSession} from '../scripts/complete-trial.js';
import {animals} from '../examples/animals.js';
test('shared browser validates independent first attempts and preserves failures',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'test-skill-batch-'));let session;
 try{
  session=await createTrialSession();const samples=[JSON.stringify(animals.cat),'<g id="animal"><script>alert(1)</script></g>',JSON.stringify(animals.octopus)];
  for(let i=0;i<samples.length;i++){
   const input=join(dir,'input-'+i);await writeFile(input,samples[i]);
   const out=join(dir,'result-'+i),r=await completeTrial({input,animal:i===2?'octopus':'cat',out,session});
   assert.equal(r.validation.pass,i!==1);assert.equal(r.executionError,undefined);
   assert.equal(await readFile(join(out,r.artifacts.source),'utf8'),samples[i]);
   assert.equal(r.artifacts.html,i===1?null:'preview.html');assert.ok(r.processingMs>0);
   if(i!==1){assert.equal(r.validation.samples.length,16);assert.equal(r.previewVerified,true);}
  }
 }finally{await session?.close();await rm(dir,{recursive:true,force:true});}
});

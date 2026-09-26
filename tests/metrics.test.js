import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUsage,score} from '../lib/metrics.js';
import {promptFor} from '../lib/contract.js';
test('unknown usage is not zero and reasoning is not double counted',()=>{
  assert.equal(normalizeUsage().totalTokens,null);
  assert.equal(normalizeUsage({inputTokens:200,outputTokens:100,reasoningTokens:50}).totalTokens,300);
  assert.throws(()=>normalizeUsage({outputTokens:30,reasoningTokens:40}));
  assert.throws(()=>normalizeUsage({inputTokens:-1}));
  assert.throws(()=>normalizeUsage({inputTokens:1,outputTokens:2,totalTokens:7}));
});
test('quality requires review, actual usage and completed validation',()=>{
  const r={version:'0.1.0',task:{budget:100},usage:normalizeUsage({inputTokens:100,outputTokens:100}),validation:{pass:true}};
  assert.equal(score(r).qualityScore,null);
  r.review={recognizability:90,motion:60,morphology:90};assert.equal(score(r).qualityPer1kTokens,400);
  r.validation.pass=false;assert.equal(score(r).qualityScore,0);
  r.validation.pass=null;assert.equal(score(r).qualityScore,null);
});
test('Track B does not receive Track A skeleton contract',()=>{
  const p=promptFor({track:'B',animal:'snake',budget:500,maxElements:20});
  assert.match(p,/complete single-file HTML/);assert.doesNotMatch(p,/data-origin/);
});

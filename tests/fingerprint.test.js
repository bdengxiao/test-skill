import test from 'node:test';
import assert from 'node:assert/strict';
import {inferFingerprint,validateSample,sourceFeatures,crossValidate} from '../lib/fingerprint.js';
import {pareto,reviewScore} from '../lib/review.js';
import {score} from '../lib/metrics.js';
const vec=x=>Array(14).fill(x);
const corpus=[0,1,2].flatMap(i=>[{model:'known-a',condition:'source|same',features:vec(.1+i*.01),hash:'a'+i},{model:'known-b',condition:'source|same',features:vec(.8+i*.01),hash:'b'+i}]);
test('fingerprints abstain without enough same-condition samples',()=>{
  assert.equal(inferFingerprint(vec(.1),[], 'source|same').status,'insufficient-data');
  assert.equal(inferFingerprint(vec(.1),corpus,'source|other').status,'insufficient-data');
  assert.equal(inferFingerprint(vec(.1),corpus,'source|same','a0').status,'insufficient-data');
});
test('leave-one-out excludes its answer and reports coverage separately',()=>{
  assert.equal(crossValidate(corpus).evaluated,0);
  const rows=[...corpus,{model:'known-a',condition:'source|same',features:vec(.13),hash:'a3'},{model:'known-b',condition:'source|same',features:vec(.83),hash:'b3'}];
  const r=crossValidate(rows);assert.equal(r.evaluated,8);assert.equal(r.coverage,1);assert.equal(r.accuracyAmongAccepted,1);
});
test('retrieval ranks synthetic clusters without calling similarity a probability',()=>{
  const r=inferFingerprint(vec(.11),corpus,'source|same');assert.equal(r.status,'candidate');assert.equal(r.candidates[0].model,'known-a');assert.equal(r.probability,null);
  assert.equal(inferFingerprint(vec(.46),corpus,'source|same').status,'out-of-distribution');
  const close=corpus.map(s=>({...s,features:vec(s.model==='known-a'?.2:.21)}));assert.equal(inferFingerprint(vec(.205),close,'source|same').status,'ambiguous');
});
test('sample validation rejects missing provenance and nonfinite features',()=>{
  assert.throws(()=>validateSample(corpus[0]));assert.throws(()=>validateSample({...corpus[0],provenance:'declared source',features:vec(NaN)}));
});
test('source features ignore claimed model identity text',()=>{
  assert.deepEqual(sourceFeatures('<g><path d="M0 0Q1 2 3 4"/></g><!-- model alpha -->'),sourceFeatures('<g><path d="M0 0Q1 2 3 4"/></g><!-- model beta -->'));
});
test('four-dimension quality needs a complete review and valid submission',()=>{
  assert.equal(reviewScore({recognizability:100,motion:100,morphology:100},{pass:true}),null);
  assert.equal(reviewScore({recognizability:100,motion:80,morphology:100,craft:80},{pass:true}),90);
  assert.equal(score({version:'0.2.0',task:{budget:500},review:{recognizability:100,motion:100,morphology:100},validation:{pass:true}}).qualityScore,null);
});
test('Pareto excludes dominated and unknown-usage records',()=>{
  const a={tokens:100,quality:70},b={tokens:200,quality:65},c={tokens:300,quality:90};assert.deepEqual(pareto([a,b,c,{tokens:null,quality:100}]),[a,c]);
});

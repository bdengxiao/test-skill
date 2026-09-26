import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateHTML} from '../validator/independent.js';
const scene='<style>body{margin:0}svg{display:block}</style><svg width="800" height="560"><rect width="800" height="560" fill="#eee"/><g id="wheel"><circle cx="250" cy="300" r="70" fill="none" stroke="black" stroke-width="5"/><path d="M180 300H320" stroke="red" stroke-width="4"/></g><circle cx="470" cy="300" r="70" fill="none" stroke="black" stroke-width="5"/></svg>';
test('independent evaluator observes motion and ignores submitted score claims',async()=>{
  const moving=await evaluateHTML(scene+'<script>window.score=0;function tick(t){document.getElementById("wheel").setAttribute("transform","rotate("+(t/10)+" 250 300)");requestAnimationFrame(tick)}requestAnimationFrame(tick)</script>');
  assert.equal(moving.pass,true,JSON.stringify(moving));assert.equal(moving.technicalScore,100);assert.equal(moving.frames.length,4);assert.equal(moving.qualityScore,null);
  const stationary=await evaluateHTML(scene+'<script>window.score=100</script>');assert.equal(stationary.checks.find(c=>c.id==='motion').pass,false);assert.equal(stationary.pass,false);
});
test('runtime errors, external resources and element overages are evidence',async()=>{
  const bad=await evaluateHTML(scene+'<img src="https://example.com/no.png"><script>throw new Error("fixture failure")</script>',{maxElements:2});
  assert.equal(bad.checks.find(c=>c.id==='runtime').pass,false);assert.equal(bad.checks.find(c=>c.id==='budget').pass,false);assert.ok(bad.errors.some(e=>e.includes('fixture failure')));
});
test('blank output and nonterminating scripts cannot pass',async()=>{
  const blank=await evaluateHTML('<html><body></body></html>');assert.equal(blank.checks.find(c=>c.id==='svg').pass,false);
  await assert.rejects(evaluateHTML('<script>while(true){}</script>',{timeoutMs:1200}),/timed out/i);
});

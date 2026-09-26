import {animals,compactAnimals,labels} from '../examples/animals.js';
import {validate,parseSubmission} from '../lib/validate.js';
import {BikeRig,RiderRig,geometry} from './rig.js';
import {promptFor,VERSION} from '../lib/contract.js';
const $=id=>document.getElementById(id), bike=new BikeRig($('scene')), rider=new RiderRig(bike);
let selected='pelican', phase=0, playing=!matchMedia('(prefers-reduced-motion: reduce)').matches, last=0, report=null, submitted='';
function frame(p){phase=p;bike.render(p);rider.render();$('phase').textContent=(p%1).toFixed(2);}
function inspect(source,limit=30){
  const result=validate(source,limit); const {root,...plain}=result;
  if(!result.pass)return plain;
  const previous=rider.root, savedPhase=phase;
  rider.mount(root); const samples=[];
  try{for(let i=0;i<16;i++){frame(i/16);samples.push({phase:i/16,...geometry(rider)});}}
  catch(e){plain.errors.push(e.message);plain.pass=false;}
  plain.samples=samples;plain.pass=plain.pass && samples.every(s=>s.pass);plain.errors=[...new Set([...plain.errors,...samples.flatMap(s=>s.errors)])];
  if(previous)rider.mount(previous);else rider.layer.replaceChildren();
  frame(savedPhase);return plain;
}
function inspectTask(source){
  const limit=Number($('limit').value);
  if(!Number.isInteger(limit)||limit<1||limit>200)return {pass:false,errors:['元素上限必须为 1–200'],elementCount:0,bytes:0};
  const result=inspect(source,limit);
  const challenge=$('challenge').value;
  if(result.pass&&challenge!=='standard'){
    const root=parseSubmission(source),nodes=[root,...root.querySelectorAll('*')];
    if(challenge==='paths'&&nodes.some(n=>!['g','path'].includes(n.tagName)))result.errors.push('Path-only 挑战不允许基本形状');
    if(challenge==='twelve'&&nodes.length>12)result.errors.push('极限压缩挑战最多 12 个元素');
    if(challenge==='silhouette'){
      const colors=new Set(nodes.flatMap(n=>['fill','stroke'].map(a=>n.getAttribute(a))).filter(c=>c&&c!=='none'));
      if(colors.size>1)result.errors.push('剪影挑战只允许一种显式颜色');
    }
    result.pass=result.errors.length===0;
  }
  return result;
}
function apply(source){
  const limit=Number($('limit').value),result=inspectTask(source);
  report={version:VERSION,kind:'local-validation',species:selected,source,maxElements:limit,challenge:$('challenge').value,validation:result,usage:null,qualityScore:null,createdAt:new Date().toISOString()};
  $('elements').textContent=result.elementCount;$('bytes').textContent=result.bytes;
  $('validity').textContent=result.pass?'PASS':'FAIL';$('status').textContent=result.pass?'16 个相位检查通过。接触点与踏板保持连接。':result.errors.join(' · ');
  $('editor-status').textContent=result.pass?'已挂载 · 可编辑后再次运行':'提交未挂载 · 当前画面保持原样';
  if(result.pass){submitted=source;rider.mount(parseSubmission(source));frame(phase);}
  return result;
}
function example(){const data=JSON.stringify(($('preset').value==='compact'?compactAnimals:animals)[selected],null,2);$('source').value=$('format').value==='json'?data:new XMLSerializer().serializeToString(parseSubmission(data)).replace(' xmlns="http://www.w3.org/2000/svg"','');apply($('source').value);}
function select(name){selected=name;$('species-label').textContent=name.toUpperCase();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.animal===name));example();}
for(const name of Object.keys(animals)){const b=document.createElement('button');b.textContent=labels[name];b.dataset.animal=name;b.onclick=()=>select(name);$('animals').append(b);}
$('play').onclick=()=>{playing=!playing;$('play').textContent=playing?'暂停':'播放';};
$('step').onclick=()=>{playing=false;$('play').textContent='播放';frame(phase+.25);};
$('show-anchors').onchange=()=>bike.svg.querySelector('#anchors').setAttribute('visibility',$('show-anchors').checked?'visible':'hidden');
$('apply').onclick=()=>apply($('source').value);$('reset').onclick=example;$('format').onchange=example;
$('preset').onchange=example;
$('challenge').onchange=()=>{$('editor-status').textContent='挑战条件已更改，重新校验后生效';};
$('limit').onchange=()=>apply($('source').value);
$('prompt').onclick=async()=>{
  try{const mode=$('skill').value;let skill='';if(mode!=='none'){const r=await fetch(mode==='full'?'SKILL.md':`skills/SKILL-${mode}.md`);if(!r.ok)throw new Error('Skill 加载失败');skill=await r.text();}
    const requirements={standard:'',silhouette:'Use one solid color only; species must be recognizable from silhouette.',paths:'Use only g and path SVG elements.',twelve:'Use at most 12 SVG elements including root.'};
    const prompt=promptFor({animal:selected,track:$('track').value,budget:Number($('budget').value),maxElements:$('challenge').value==='twelve'?Math.min(12,Number($('limit').value)):Number($('limit').value),requirement:requirements[$('challenge').value]},skill);
    $('prompt-text').textContent=prompt;try{await navigator.clipboard.writeText(prompt);$('prompt').textContent='已复制 Prompt ✓';}catch{$('prompt').textContent='Prompt 已生成，可在下方复制';}
  }catch(e){$('editor-status').textContent=e.message;}
};
$('export').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`test-skill-${selected}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
const params=new URLSearchParams(location.search);select(Object.hasOwn(animals,params.get('animal'))?params.get('animal'):'pelican');
const speed=Number(params.get('speed'));if(speed>=.2&&speed<=2)$('speed').value=speed;
if(!playing)$('play').textContent='播放';
function tick(time){if(playing && last)frame(phase+Math.min(time-last,100)/2000*Number($('speed').value));last=time;requestAnimationFrame(tick);}requestAnimationFrame(tick);
window.testSkill={inspect,inspectTask,select,frame,apply,animals,compactAnimals,pause(){playing=false;$('play').textContent='播放';},get phase(){return phase;},get submitted(){return submitted;},get selected(){return selected;},get report(){return report;}};
await import('./lab-ui.js');

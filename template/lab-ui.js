import {BikeRig,RiderRig} from './rig.js';
import {parseSubmission} from '../lib/validate.js';
import {RUBRIC,reviewScore,pareto} from '../lib/review.js';
import {sourceFeatures,visualFeatures,inferFingerprint,validateSample,crossValidate} from '../lib/fingerprint.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
function download(name,data){const u=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=el('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function load(key,fallback){try{return JSON.parse(localStorage.getItem('test-skill-v2-'+key))??fallback;}catch{return fallback;}}
function store(key,value){localStorage.setItem('test-skill-v2-'+key,JSON.stringify(value));}
async function hash(data){const bytes=typeof data==='string'?new TextEncoder().encode(data):data;return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function read(file,limit=150000){if(!file)throw new Error('先选择文件');if(file.size>limit)throw new Error('文件超过大小限制');return file.text();}
function action(id,status,fn){$(id).onclick=async()=>{try{await fn();}catch(e){$(status).textContent=e.message;}};}
let independent=null;
action('judge-run','judge-status',async()=>{
  $('judge-run').disabled=true;$('judge-status').textContent='正在隔离浏览器中运行，采样四帧…';$('judge-export').disabled=true;independent=null;$('technical-score').textContent='…';$('judge-checks').replaceChildren();$('judge-frames').replaceChildren();
  try{
    const response=await fetch('/api/evaluate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:$('html-source').value,maxElements:200}),signal:AbortSignal.timeout(22000)});
    const report=await response.json();if(!response.ok)throw new Error(report.error||'评测失败');independent=report;
    $('technical-score').textContent=report.technicalScore;
    for(const c of report.checks){const row=el('div',undefined,'check-row');row.append(el('span',c.pass?'✓':'×',c.pass?'pass':'fail'),el('span',c.label),el('b',`${c.pass?c.weight:0}/${c.weight}`));$('judge-checks').append(row);}
    report.frames.forEach((src,i)=>{const fig=el('figure'),img=el('img');img.src=src;img.alt=`独立评测第 ${i+1} 帧`;fig.append(img,el('figcaption',`T+${report.samples[i].observedMs} ms`));$('judge-frames').append(fig);});
    $('judge-status').textContent=`${report.pass?'技术检查通过':'有未通过项'}。画面变化比例：${report.pixels.changedFractions.map(x=>(x*100).toFixed(2)+'%').join(' / ')}。此分数不评价物种辨识、美术质量或踩踏是否合理。`+(report.errors.length?' 错误：'+report.errors.join(' | '):'');$('judge-export').disabled=false;
  }finally{$('judge-run').disabled=false;}
});
$('judge-export').onclick=()=>independent&&download('test-skill-independent.json',independent);
$('html-file').onchange=async()=>{try{$('html-source').value=await read($('html-file').files[0]);}catch(e){$('judge-status').textContent=e.message;}};
$('judge-fixture').onclick=()=>{
  const svg=$('scene').cloneNode(true);svg.removeAttribute('id');svg.setAttribute('style','width:100%;height:100%');
  $('html-source').value=`<!doctype html><html><meta charset="utf-8"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#dfeef0}svg{display:block}</style>${new XMLSerializer().serializeToString(svg)}<script>
function tick(t){const a=t/330;['wheel-a','wheel-b'].forEach((id,i)=>document.getElementById(id).setAttribute('transform','translate('+(i?421:210)+' 332) rotate('+(a*180/Math.PI)+')'));
const points={'hand':[399,224],'pedal-a':[330+24*Math.cos(a),334+24*Math.sin(a)],'pedal-b':[330-24*Math.cos(a),334-24*Math.sin(a)]};
const pa=points['pedal-a'],pb=points['pedal-b'];document.getElementById('crank').innerHTML='<path d="M'+pa+'L'+pb+'"/>';
document.querySelectorAll('[data-anchor]').forEach(e=>{const [x,y]=e.getAttribute('data-origin').split(',').map(Number),[tx,ty]=points[e.getAttribute('data-anchor')],b=Number(e.getAttribute('data-bend')||20);e.setAttribute('d','M'+x+' '+y+'Q'+((x+tx)/2+b)+' '+((y+ty)/2)+' '+tx+' '+ty);});requestAnimationFrame(tick);}requestAnimationFrame(tick);
<\/script></html>`;
  $('judge-status').textContent='已载入手工演示件。运行后可查看技术证据，不作为模型成绩。';
};
function ratingControls(parent,prefix){
  for(const [key,label,hint] of RUBRIC){const row=el('label',undefined,'rating-row');row.append(el('span',label));const input=el('select');input.id=`${prefix}-${key}`;input.setAttribute('aria-label',label);input.append(new Option('待评分',''));for(const v of [0,25,50,75,100])input.append(new Option(String(v),String(v)));row.append(input,el('small',hint));parent.append(row);}
}
function ratings(prefix){return Object.fromEntries(RUBRIC.map(([k])=>[k,$(`${prefix}-${k}`).value===''?null:Number($(`${prefix}-${k}`).value)]));}
let arena=[],arenaFrame=0;
action('arena-start','arena-status',()=>{
  const entries=['left','right'].map(side=>({label:$('model-'+side).value.trim()||'未标注',source:$('source-'+side).value}));
  for(const r of entries){r.validation=testSkill.inspect(r.source,200);if(!r.validation.pass)throw new Error('对比提交无效：'+r.validation.errors.join(' · '));}
  if(crypto.getRandomValues(new Uint8Array(1))[0]%2)entries.reverse();arena=entries;$('arena-cards').replaceChildren();$('arena-setup').hidden=true;$('arena-start').disabled=true;$('arena-demo').disabled=true;
  entries.forEach((r,i)=>{const card=el('div',undefined,'arena-card');card.append(el('h3',`作品 ${i?'B':'A'}`));const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 640 440');svg.setAttribute('aria-label',`匿名作品 ${i?'B':'A'}`);card.append(svg);r.bike=new BikeRig(svg);r.rider=new RiderRig(r.bike);r.rider.mount(parseSubmission(r.source));ratingControls(card,`arena-${i}`);$('arena-cards').append(card);});
  cancelAnimationFrame(arenaFrame);const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const move=t=>{arena.forEach(r=>{r.bike.render(reduced ? 0.125 : t/2000);r.rider.render();});if(!reduced)arenaFrame=requestAnimationFrame(move);};arenaFrame=requestAnimationFrame(move);
  $('arena-reveal').disabled=false;$('arena-status').textContent='顺序已随机化。两份作品同步播放；请完成两组四维评分。';
});
$('arena-demo').onclick=()=>{const name=testSkill.selected;$('model-left').value='手工参考 · 精细版';$('model-right').value='手工参考 · 极简版';$('source-left').value=JSON.stringify(testSkill.animals[name]);$('source-right').value=JSON.stringify(testSkill.compactAnimals[name]);$('arena-status').textContent='已载入手工对照，仅用来体验盲评，不是模型对比。';};
action('arena-reveal','arena-status',async()=>{
  const reviews=arena.map((r,i)=>({scores:ratings(`arena-${i}`),r}));if(reviews.some(x=>reviewScore(x.scores,x.r.validation)===null))throw new Error('请先完成全部八项评分，再揭晓。');
  const saved=await Promise.all(reviews.map(async({scores,r},i)=>({label:r.label,blindSlot:i?'B':'A',scores,quality:reviewScore(scores,r.validation),hash:await hash(r.source),source:r.source,createdAt:new Date().toISOString(),method:'human-blind-v2'})));
  const history=load('blind',[]);store('blind',[...history,...saved]);
  saved.forEach((r,i)=>{$('arena-cards').children[i].querySelector('h3').textContent=`${r.blindSlot} · ${r.label} · ${r.quality}/100`;});
  $('arena-cards').querySelectorAll('select').forEach(s=>s.disabled=true);
  $('arena-reveal').disabled=true;$('arena-status').textContent='盲评分已保存并揭晓。记录文件已导出。';download('test-skill-blind-review.json',saved);
});
$('arena-reset').onclick=()=>{cancelAnimationFrame(arenaFrame);arena=[];$('arena-cards').replaceChildren();$('arena-setup').hidden=false;$('arena-start').disabled=false;$('arena-demo').disabled=false;$('arena-reveal').disabled=true;$('arena-status').textContent='可开始新一轮。';};
let samples=[];try{samples=load('fingerprints',[]).map(validateSample);}catch{}
let currentFingerprint=null,lastInference=null;
$('sample-count').textContent=samples.length;
async function imageVector(blob){
  const url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,96,96);const scale=Math.min(96/img.width,96/img.height),w=img.width*scale,h=img.height*scale;ctx.drawImage(img,(96-w)/2,(96-h)/2,w,h);return visualFeatures(ctx.getImageData(0,0,96,96));}finally{URL.revokeObjectURL(url);}
}
async function fingerprint(){
  const mode=$('finger-mode').value,condition=mode+'|'+$('finger-condition').value.trim();if(!$('finger-condition').value.trim())throw new Error('请填写完整实验条件');
  if(mode==='image'){const file=$('finger-image').files[0];if(!file||file.size>5000000)throw new Error('选择一张 5 MB 以内的作品图片');const bytes=await file.arrayBuffer();return {condition,features:[...Array(10).fill(0),...await imageVector(file)],hash:await hash(bytes),mode};}
  const source=$('source').value;const validation=testSkill.inspect(source,200);if(!validation.pass)throw new Error('先修复当前提交：'+validation.errors.join(' · '));
  const root=parseSubmission(source),svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','150 75 285 310');svg.append(root);
  // Evaluate only the animal, excluding the shared background and bicycle from visual fingerprints.
  const bike={svg:{querySelector:()=>svg},contacts:{hand:[399,224],'pedal-a':[347,351],'pedal-b':[313,317]}};
  new RiderRig(bike).mount(root);
  const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});
  return {condition,features:[...sourceFeatures(source),...await imageVector(blob)],hash:await hash(source),mode};
}
action('finger-run','finger-status',async()=>{
  currentFingerprint=null;lastInference=null;
  const q=await fingerprint();currentFingerprint=q;const result=inferFingerprint(q.features,samples,q.condition,q.hash);lastInference={...result,query:q};
  const descriptions={'insufficient-data':'样本不足 · 无法判断',ambiguous:'多个候选相近 · 无法区分','out-of-distribution':'超出样本分布 · 可能不在候选库',candidate:'发现相似候选 · 尚不能确认身份'};
  $('finger-status').textContent=descriptions[result.status]+'。'+result.message;$('finger-candidates').replaceChildren();
  if(!result.candidates.length)$('finger-candidates').append(el('p','还没有足够的同条件来源样本。'));
  result.candidates.slice(0,3).forEach((c,i)=>{const row=el('div',undefined,'candidate');row.append(el('small',`0${i+1} / ${c.samples} 份样本`),el('h3',c.model),el('strong',`${c.similarity} / 100 相似度`),el('p','较接近的特征：'+c.evidence.map(e=>e.feature).join(' · ')));$('finger-candidates').append(row);});
  $('finger-features').replaceChildren();['路径占比','曲线使用','圆形占比','分组占比','配色数量','元素密度','小数使用','脚本占比','声明式动画','JS 动画','画面对称','画面占比','颜色离散','边缘密度'].forEach((label,i)=>{if(q.mode==='image'&&i<10)return;const row=el('div');row.append(el('span',label));const bar=el('meter');bar.min=0;bar.max=1;bar.value=q.features[i];row.append(bar,el('small',q.features[i].toFixed(2)));$('finger-features').append(row);});
});
action('sample-add','finger-status',async()=>{
  if(!currentFingerprint)throw new Error('先分析当前作品，再登记来源');
  // Recompute to prevent registering stale vectors under changed source/condition.
  const fresh=await fingerprint();if(fresh.hash!==currentFingerprint.hash||fresh.condition!==currentFingerprint.condition)throw new Error('作品或实验条件已变化，请重新分析');
  const s=validateSample({...fresh,model:$('sample-model').value,provenance:$('sample-provenance').value});
  if(samples.some(x=>x.hash===s.hash))throw new Error('此作品已登记。重复回答不能增加样本量');
  if(samples.length>=1000)throw new Error('本地样本上限 1000');samples.push(s);store('fingerprints',samples);$('sample-count').textContent=samples.length;$('finger-status').textContent='已保存来源样本。标签来源为用户声明，并非本工具认证。';
});
$('sample-export').onclick=()=>download('test-skill-fingerprints.json',samples);
action('sample-calibrate','calibration-status',()=>{const r=crossValidate(samples);$('calibration-status').textContent=r.evaluated?`可评 ${r.evaluated} 项；作出候选判断 ${r.accepted} 项；覆盖率 ${(r.coverage*100).toFixed(1)}%；接受项准确率 ${r.accuracyAmongAccepted===null?'未知':(r.accuracyAmongAccepted*100).toFixed(1)+'%'}。${r.warning}`:'样本不足。留一验证至少需要两个模型、每个模型 4 个不同的同条件样本。';download('test-skill-fingerprint-validation.json',r);});
$('sample-import').onchange=async()=>{try{const data=JSON.parse(await read($('sample-import').files[0],2000000));if(!Array.isArray(data)||data.length>1000)throw new Error('需要最多 1000 个样本的数组');const validated=data.map(validateSample),merged=[...samples];let added=0;for(const s of validated)if(!merged.some(x=>x.hash===s.hash)){merged.push(s);added++;}if(merged.length>1000)throw new Error('合并后超过 1000 个样本');store('fingerprints',merged);samples=merged;$('sample-count').textContent=samples.length;$('finger-status').textContent=`已导入 ${added} 个新样本，重复项已跳过。`;}catch(e){$('finger-status').textContent=e.message;}};
action('finger-export','finger-status',()=>{if(!lastInference)throw new Error('请先分析作品');download('test-skill-fingerprint-analysis.json',lastInference);});
ratingControls($('review-controls'),'review');
let records=load('reviews',[]);if(!Array.isArray(records))records=[];
function svgEl(tag,attrs,text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function chart(){
  const cond=$('curve-condition').value,rows=records.filter(r=>r.condition===cond&&Number.isFinite(r.tokens)&&r.tokens>0&&Number.isFinite(r.quality));const svg=$('quality-chart');svg.replaceChildren();
  svg.append(svgEl('path',{d:'M50 20V260H525',fill:'none',stroke:'#97a9aa'}));
  for(const y of [0,25,50,75,100]){svg.append(svgEl('path',{d:`M50 ${260-y*2.3}H525`,stroke:'#e0e7e4'}),svgEl('text',{x:35,y:264-y*2.3,'text-anchor':'end',fill:'#778a86','font-size':11},y));}
  svg.append(svgEl('text',{x:285,y:300,'text-anchor':'middle',fill:'#778a86','font-size':12},'实际总 Token →'));
  if(!rows.length){svg.append(svgEl('text',{x:285,y:140,'text-anchor':'middle',fill:'#778a86','font-size':14},'添加真实评分和用量后显示'));return;}
  const max=Math.max(...rows.map(r=>r.tokens))*1.15,x=t=>50+t/max*470,y=q=>260-q*2.3;
  const front=pareto(rows).sort((a,b)=>a.tokens-b.tokens);svg.append(svgEl('path',{d:front.map((r,i)=>`${i?'L':'M'}${x(r.tokens)} ${y(r.quality)}`).join(' '),fill:'none',stroke:'#bd8d56','stroke-width':2,'stroke-dasharray':'4 5'}));
  rows.forEach(r=>{const dot=svgEl('circle',{cx:x(r.tokens),cy:y(r.quality),r:6,fill:'#427f78'});dot.append(svgEl('title',{},`${r.model}: ${r.quality}/100, ${r.tokens} tokens`));svg.append(dot,svgEl('text',{x:x(r.tokens)+9,y:y(r.quality)-7,fill:'#304e4d','font-size':10},r.model.slice(0,18)));});
  for(const t of [0,Math.round(max/2),Math.round(max)])svg.append(svgEl('text',{x:x(t),y:280,'text-anchor':'middle',fill:'#778a86','font-size':10},t));
}
function conditions(){const prev=$('curve-condition').value;$('curve-condition').replaceChildren();const values=[...new Set(records.map(r=>r.condition))];for(const c of values)$('curve-condition').append(new Option(c,c));if(!values.length)$('curve-condition').append(new Option('暂无记录',''));if(values.includes(prev))$('curve-condition').value=prev;chart();}
action('review-save','review-status',async()=>{
  const scores=ratings('review'),source=$('source').value,validation=testSkill.inspectTask(source),quality=reviewScore(scores,validation),model=$('review-model').value.trim(),condition=$('review-condition').value.trim();
  if(quality===null||!model||!condition)throw new Error('请完成四维评分、模型标签与实验条件');
  const tokens=$('review-tokens').value===''?null:Number($('review-tokens').value);if(tokens!==null&&(!Number.isInteger(tokens)||tokens<=0))throw new Error('总 Token 应为正整数，未知请留空');
  const r={model,condition,scores,quality,tokens,qualityPer1kTokens:tokens?quality*1000/tokens:null,source,hash:await hash(source),validation,method:'human-open-v2',createdAt:new Date().toISOString()};records.push(r);store('reviews',records);conditions();$('curve-condition').value=condition;chart();$('review-status').textContent=`已保存 ${quality}/100。${tokens?'每千 Token 质量：'+r.qualityPer1kTokens.toFixed(2):'未知 Token 保持空值，不绘入效率图。'}`;
});
$('review-export').onclick=()=>download('test-skill-reviews.json',records);$('curve-condition').onchange=chart;conditions();
window.testSkillLab={inferFingerprint,sourceFeatures,visualFeatures,reviewScore,pareto};
function syncCondition(){const c=[testSkill.selected,$('budget').value,$('skill').value,$('format').value,$('challenge').value,'elements='+$('limit').value].join(' / ');$('finger-condition').value=c;$('review-condition').value=c;}
for(const id of ['budget','skill','format','challenge','limit'])$(id).addEventListener('change',syncCondition);
$('animals').addEventListener('click',syncCondition);syncCondition();

// Candidate retrieval, not identity verification. Features exclude labels and model-name strings.
export const FEATURE_NAMES=['pathShare','curveShare','circleShare','groupShare','palette','detail','decimals','jsShare','cssAnimation','jsAnimation','symmetry','occupancy','colorSpread','edgeDensity'];
const clamp=x=>Math.max(0,Math.min(1,x));
export function sourceFeatures(source){
  let text=String(source), json;
  try{json=JSON.parse(text);}catch{}
  if(json?.nodes){const flatten=nodes=>nodes.flatMap(n=>[n,...flatten(n.children||[])]);text=flatten(json.nodes).map(n=>`<${n.tag} ${Object.entries(n.attrs||{}).map(([k,v])=>`${k}="${v}"`).join(' ')}>`).join('');}
  const count=re=>(text.match(re)||[]).length;
  const tags=count(/<(?:path|circle|ellipse|rect|polygon|polyline|g|line)\b/g)||1;
  const paths=count(/<path\b/g), ds=[...text.matchAll(/\bd=["']([^"']*)["']/g)].map(x=>x[1]).join('');
  const commands=(ds.match(/[MLHVCSQTAZ]/gi)||[]).length||1;
  const colors=new Set((text.match(/#[0-9a-f]{3,8}\b/gi)||[]).map(x=>x.toLowerCase()));
  const numbers=text.match(/-?\d+(?:\.\d+)?/g)||[];
  const scripts=[...text.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).join('');
  return [paths/tags,(ds.match(/[CQSA]/gi)||[]).length/commands,count(/<(?:circle|ellipse)\b/g)/tags,count(/<g\b/g)/tags,clamp(colors.size/20),clamp(Math.log2(tags+1)/8),numbers.filter(x=>x.includes('.')).length/(numbers.length||1),clamp(scripts.length/(text.length||1)),Number(/@keyframes|<animate(?:Transform)?\b/i.test(text)),Number(/requestAnimationFrame|setInterval/.test(text))];
}
export function visualFeatures(imageData){
  const {data,width,height}=imageData;let symmetry=0,occupied=0,sum=[0,0,0],sq=[0,0,0],edges=0;const n=width*height;
  const bg=[data[0],data[1],data[2]];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,j=(y*width+(width-1-x))*4;
    let delta=0,edge=0;for(let c=0;c<3;c++){const v=data[i+c];sum[c]+=v;sq[c]+=v*v;delta+=Math.abs(v-bg[c]);symmetry+=Math.abs(v-data[j+c]);if(x)edge+=Math.abs(v-data[i-4+c]);}
    if(delta>70&&data[i+3]>20)occupied++;if(edge>100)edges++;
  }
  return [clamp(1-symmetry/(n*3*255)),occupied/n,clamp(Math.sqrt(sq.reduce((a,v,c)=>a+Math.max(0,v/n-(sum[c]/n)**2),0)/3)/128),edges/n];
}
export function distance(a,b){if(a.length!==b.length)throw new Error('Feature dimensions differ');return Math.sqrt(a.reduce((s,v,i)=>s+(v-b[i])**2,0)/a.length);}
export function inferFingerprint(query,samples,condition,queryHash=null){
  const seen=new Set();
  const matching=samples.filter(s=>{if(s.condition!==condition||s.features?.length!==query.length||!s.features.every(Number.isFinite)||!s.hash||s.hash===queryHash||seen.has(s.hash))return false;seen.add(s.hash);return true;});
  const groups=new Map();for(const s of matching){if(!groups.has(s.model))groups.set(s.model,[]);groups.get(s.model).push(s);}
  const eligible=[...groups].filter(([,rows])=>rows.length>=3);
  if(eligible.length<2)return {status:'insufficient-data',message:'需要至少两个候选模型，每个模型至少 3 个同条件、来源明确的不同样本。',candidates:[],sampleCount:matching.length};
  const candidates=eligible.map(([model,rows])=>{
    const offset=condition.startsWith('image|')?10:0;
    const ds=rows.map(s=>distance(query.slice(offset),s.features.slice(offset))).sort((a,b)=>a-b);const d=ds.slice(0,3).reduce((a,b)=>a+b,0)/3;
    const center=query.map((_,i)=>rows.reduce((a,s)=>a+s.features[i],0)/rows.length);
    return {model,distance:d,similarity:Math.round(100*(1-clamp(d))),samples:rows.length,evidence:query.map((v,i)=>({feature:FEATURE_NAMES[i]||`visual-${i}`,difference:Math.abs(v-center[i])})).slice(offset).sort((a,b)=>a.difference-b.difference).slice(0,3)};
  }).sort((a,b)=>a.distance-b.distance);
  const margin=candidates[1].distance-candidates[0].distance;
  return {status:candidates[0].distance>.3?'out-of-distribution':margin<.035?'ambiguous':'candidate',message:'相似度不是身份概率；这些手工阈值未经真实模型校准。',candidates,sampleCount:matching.length,margin,probability:null};
}
export function crossValidate(samples){
  const unique=[...new Map(samples.map(s=>[s.hash,s])).values()];let evaluated=0,accepted=0,correct=0;const confusion={};
  for(const sample of unique){
    const result=inferFingerprint(sample.features,unique.filter(s=>s.hash!==sample.hash),sample.condition);
    if(result.status==='insufficient-data')continue;evaluated++;
    const prediction=result.status==='candidate'?result.candidates[0].model:'[abstain]';
    if(prediction!=='[abstain]'){accepted++;if(prediction===sample.model)correct++;}
    const key=JSON.stringify([sample.model,prediction]);confusion[key]=(confusion[key]||0)+1;
  }
  return {protocol:'leave-one-distinct-output-out, same-condition',evaluated,accepted,correct,coverage:evaluated?accepted/evaluated:null,accuracyAmongAccepted:accepted?correct/accepted:null,confusion,warning:'探索性留一验证；同源或近似回答仍可能泄漏。不能代表新题目或未知模型的识别准确率。'};
}
export function validateSample(s){
  if(!s||typeof s.model!=='string'||!s.model.trim()||typeof s.condition!=='string'||!s.condition.trim()||typeof s.provenance!=='string'||s.provenance.trim().length<3||typeof s.hash!=='string'||!Array.isArray(s.features)||s.features.length!==14||s.features.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('样本需要 model、condition、provenance、hash 和 14 项合法特征');
  return {model:s.model.trim().slice(0,100),condition:s.condition.trim().slice(0,200),provenance:s.provenance.slice(0,500),hash:s.hash,features:s.features};
}

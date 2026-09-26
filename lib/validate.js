import {NS,TAGS,ATTRS,ANCHORS} from './contract.js';
const number = /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const required = {path:['d'],circle:['cx','cy','r'],ellipse:['cx','cy','rx','ry'],rect:['x','y','width','height'],line:['x1','y1','x2','y2'],polygon:['points'],polyline:['points']};
function validPath(d){
  const tokens=d.match(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[];
  if(!tokens.length||!/^m$/i.test(tokens[0])||d.replace(/[a-z]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?|[\s,]/gi,''))return false;
  const sizes={m:2,l:2,h:1,v:1,c:6,s:4,q:4,t:2,a:7,z:0};let i=0;
  while(i<tokens.length){const cmd=tokens[i++].toLowerCase(),n=sizes[cmd];if(n===undefined)return false;if(n===0)continue;
    let count=0;while(i<tokens.length&&!/^[a-z]$/i.test(tokens[i])){
      if(i+n>tokens.length)return false;const args=tokens.slice(i,i+n).map(Number);
      if(args.some(v=>!Number.isFinite(v)||Math.abs(v)>10000))return false;
      if(cmd==='a'&&(args[0]<0||args[1]<0||![0,1].includes(args[3])||![0,1].includes(args[4])))return false;
      i+=n;count++;
    }if(!count)return false;
  }return true;
}
export function parseSubmission(source, doc = document) {
  if (typeof source !== 'string' || source.length > 100000) throw new Error('Submission must be text, at most 100,000 characters');
  if (source.trim().startsWith('{')) {
    const data = JSON.parse(source);
    if (!data || typeof data.species !== 'string' || !Array.isArray(data.nodes) || Object.keys(data).some(k=>!['species','nodes'].includes(k))) throw new Error('Expected species and nodes');
    let count=0;
    const make = (node, depth=0) => {
      if (++count>200 || depth>16) throw new Error('JSON tree too complex');
      if (!node || !TAGS.includes(node.tag) || Object.keys(node).some(k=>!['tag','attrs','children'].includes(k)) || !node.attrs || typeof node.attrs!=='object' || Array.isArray(node.attrs)) throw new Error('Invalid node');
      const el=doc.createElementNS(NS,node.tag);
      for (const [k,v] of Object.entries(node.attrs)) {
        if (!ATTRS.includes(k) || !['string','number'].includes(typeof v)) throw new Error('Invalid attribute');
        el.setAttribute(k,String(v));
      }
      if (node.children !== undefined && (node.tag!=='g' || !Array.isArray(node.children))) throw new Error('Only groups have children');
      for (const child of node.children || []) el.append(make(child,depth+1));
      return el;
    };
    const root=doc.createElementNS(NS,'g'); root.id='animal';
    data.nodes.forEach(n=>root.append(make(n))); return root;
  }
  if (/<!|<\?/.test(source)) throw new Error('Declarations and entities are prohibited');
  const parsed=new DOMParser().parseFromString(`<svg xmlns="${NS}">${source}</svg>`,'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Malformed SVG/XML');
  if (parsed.documentElement.children.length!==1 || [...parsed.documentElement.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) throw new Error('Expected one root group');
  return doc.importNode(parsed.documentElement.firstElementChild,true);
}
export function validate(source, maxElements=30) {
  const errors=[]; let root;
  try {root=parseSubmission(source);} catch(e){return {pass:false,errors:[e.message],elementCount:0,bytes:new TextEncoder().encode(source).length};}
  if (root.tagName!=='g' || root.id!=='animal') errors.push('Root must be <g id="animal">');
  const nodes=[root,...root.querySelectorAll('*')], ids=new Set(), contacts=new Set();
  if (nodes.length>maxElements) errors.push(`Element budget exceeded: ${nodes.length}/${maxElements}`);
  for (const el of nodes) {
    if (el.namespaceURI!==NS || !TAGS.includes(el.tagName)) errors.push(`Forbidden element: ${el.tagName}`);
    if(el.tagName!=='g'&&el.children.length)errors.push('Only groups have children');
    if ([...el.childNodes].some(n=>n.nodeType===3 && n.textContent.trim())) errors.push('Text content is prohibited');
    for (const a of el.attributes) {
      if (!ATTRS.includes(a.name)) errors.push(`Forbidden attribute: ${a.name}`);
      if (/url\s*\(|https?:|javascript:|data:|NaN|Infinity/i.test(a.value)) errors.push(`Unsafe or non-finite attribute: ${a.name}`);
      if (['fill','stroke'].includes(a.name) && !/^(none|#[0-9a-f]{3,8}|[a-z]+)$/i.test(a.value)) errors.push('Use a simple color');
      if (['cx','cy','r','rx','ry','x','y','x1','y1','x2','y2','width','height','stroke-width','opacity','data-bend'].includes(a.name) && (!number.test(a.value)||!Number.isFinite(Number(a.value))||Math.abs(Number(a.value))>10000)) errors.push(`Invalid number: ${a.name}`);
      if (['r','rx','ry','width','height','stroke-width'].includes(a.name) && Number(a.value)<0) errors.push(`Negative size: ${a.name}`);
      if(a.name==='d'&&!el.hasAttribute('data-anchor')&&!validPath(a.value))errors.push('Invalid path data');
      if(a.name==='points'){const values=a.value.trim().split(/[\s,]+/);if(values.length<4||values.length%2||values.some(v=>!number.test(v)||Math.abs(Number(v))>10000))errors.push('Invalid points');}
      if(a.name==='opacity'&&(Number(a.value)<0||Number(a.value)>1))errors.push('Opacity outside 0..1');
      if(a.name==='data-profile'&&!['joint','wing'].includes(a.value))errors.push('Unknown motion profile');
      if(a.name==='transform'){
        const parts=[...a.value.matchAll(/(translate|scale|rotate|matrix|skewX|skewY)\s*\(([^()]*)\)/g)];
        if(!parts.length||a.value.replace(/(translate|scale|rotate|matrix|skewX|skewY)\s*\([^()]*\)/g,'').trim())errors.push('Invalid transform');
        for(const p of parts){const nums=p[2].trim().split(/[\s,]+/);const lens={translate:[1,2],scale:[1,2],rotate:[1,3],matrix:[6],skewX:[1],skewY:[1]};if(!lens[p[1]].includes(nums.length)||nums.some(v=>!number.test(v)||Math.abs(Number(v))>10000))errors.push('Invalid transform');}
      }
    }
    if(el.id){if(ids.has(el.id)|| (el!==root && el.id==='animal')) errors.push('Duplicate ID'); ids.add(el.id);}
    const anchor=el.getAttribute('data-anchor');
    if(anchor){
      contacts.add(anchor);
      if(el.tagName!=='path'||!ANCHORS.includes(anchor)) errors.push('Invalid contact');
      const xy=(el.getAttribute('data-origin')||'').split(',');
      if(xy.length!==2||xy.some(v=>!number.test(v)||Math.abs(Number(v))>10000)) errors.push('Contact needs finite data-origin="x,y"');
      let parent=el; while(parent){if(parent.hasAttribute('transform')) errors.push('Contact and its ancestors cannot have transforms'); parent=parent.parentElement;}
    }
    for(const attr of required[el.tagName]||[]) if(!el.hasAttribute(attr) && !(attr==='d' && anchor)) errors.push(`Missing ${el.tagName}.${attr}`);
  }
  for(const a of ANCHORS) if(!contacts.has(a)) errors.push(`Missing ${a} contact`);
  return {pass:errors.length===0,errors:[...new Set(errors)],elementCount:nodes.length,bytes:new TextEncoder().encode(source).length,root};
}

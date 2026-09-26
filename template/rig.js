import {NS} from '../lib/contract.js';
export class BikeRig {
  constructor(svg){
    this.svg=svg;
    svg.innerHTML=`<rect width="640" height="440" fill="#f2f4e9"/><circle cx="506" cy="97" r="38" fill="#dce6ba"/><path d="M0 363 Q100 310 200 358 T440 345 T640 360 V440 H0" fill="#e5ead6"/><path d="M0 398 H640" stroke="#afbaa0"/><g id="road" stroke="#c0c9b3" stroke-width="2"><path d="M30 413h45m100 0h45m100 0h45m100 0h45m100 0h45"/></g><g fill="none" stroke="#273d39" stroke-width="5"><g id="wheel-a"></g><g id="wheel-b"></g><path d="M210 332 L280 270 L330 334 Z M280 270 L382 270 L330 334 M382 270 L421 332 M382 270 L371 225 L399 224" stroke="#638b59" stroke-width="7" stroke-linejoin="round"/><path d="M280 270L285 285 M267 282H306"/><circle cx="330" cy="334" r="8" fill="#273d39"/></g><g id="crank" stroke="#273d39" stroke-width="5"/><g id="rider"/><g id="anchors" fill="#e46d42" visibility="hidden"/>`;
    const background=svg.querySelector('rect');
    background.insertAdjacentHTML('beforebegin',`<defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#dfeef0"/><stop offset="1" stop-color="#fcf0da"/></linearGradient><linearGradient id="road-fill" x2="0" y2="1"><stop stop-color="#c9d8c0"/><stop offset="1" stop-color="#e7e7cb"/></linearGradient></defs>`);
    background.setAttribute('fill','url(#sky)');
    svg.querySelector('circle[cx="506"]')?.remove();
    const hills=svg.querySelector('path');
    hills.insertAdjacentHTML('beforebegin',`<g id="scenery"><circle cx="494" cy="88" r="43" fill="#efbd70" opacity=".8"/><circle cx="494" cy="88" r="56" fill="none" stroke="#efbd70" opacity=".2"/><path d="M0 267L94 153 165 224 228 171 339 278 450 201 540 270 607 209 660 265V400H0" fill="#acccd0"/><path d="M0 305Q99 232 187 282T360 271T640 298V400H0" fill="#83b1ac"/><path d="M0 334Q84 290 162 312T348 309T640 324V400H0" fill="#b9ccad"/><g fill="#fff" opacity=".7"><path d="M46 96h87q6-12-6-16-6-22-29-9-20-11-25 8-28-5-27 17"/><path d="M383 139h82q6-11-10-14-7-18-25-7-13-11-24 6-25-2-23 15"/></g><g fill="#4f8277"><path d="M67 300v-93l-30 58h19l-24 33h35m0-62l27 46H77l23 23H67"/><path d="M554 321v-92l-27 54h17l-22 32h32m0-58l23 42h-12l23 24h-34"/></g><g fill="none" stroke="#e6eee0" stroke-width="2" opacity=".7"><path d="M98 334l-5-11m5 11 7-15m412 14-5-14m5 14 7-9"/></g></g>`);
    hills.setAttribute('fill','url(#road-fill)');
    const frame=svg.querySelector('#wheel-a').parentElement;
    frame.insertAdjacentHTML('beforeend',`<path d="M162 310A55 55 0 0 1 258 310M374 310A55 55 0 0 1 468 310" stroke="#b37641" stroke-width="3"/><path d="M280 270L276 253M264 253H297" stroke="#433c37" stroke-width="7" stroke-linecap="round"/><path d="M330 329L217 327Q209 333 216 338L330 340Z" stroke="#5f7771" stroke-width="1.5"/><path d="M374 225H399" stroke="#443e37" stroke-width="7" stroke-linecap="round"/><circle cx="373" cy="219" r="4" fill="#dba558" stroke-width="1"/>`);
    this.wheels=['wheel-a','wheel-b'].map((id,i)=>{
      const g=svg.querySelector('#'+id); const x=i?421:210;
      g.innerHTML=`<circle r="62" stroke-width="7"/><circle r="56" stroke="#dcc69c" stroke-width="4"/><circle r="53" stroke="#829a91" stroke-width="1"/>${Array.from({length:12},(_,n)=>{const a=n*Math.PI/6;return `<path d="M0 0L${53*Math.cos(a)} ${53*Math.sin(a)}" stroke="#78908a" stroke-width="1"/>`;}).join('')}<path d="M19-49L26-45" stroke="#f2bd6c" stroke-width="4"/><circle r="6" fill="#d3b578" stroke-width="2"/>`;
      return {g,x};
    }); this.render(0);
  }
  render(phase){
    this.phase=phase; const angle=phase*Math.PI*2;
    this.contacts={hand:[399,224], 'pedal-a':[330+24*Math.cos(angle),334+24*Math.sin(angle)],'pedal-b':[330-24*Math.cos(angle),334-24*Math.sin(angle)]};
    this.wheels.forEach(({g,x})=>g.setAttribute('transform',`translate(${x} 332) rotate(${phase*360})`));
    this.svg.querySelector('#road').setAttribute('transform',`translate(${-((phase*120)%145)} 0)`);
    const a=this.contacts['pedal-a'],b=this.contacts['pedal-b'];
    this.svg.querySelector('#crank').innerHTML=`<path d="M${a}L${b}"/><path d="M${a[0]-9} ${a[1]}h18 M${b[0]-9} ${b[1]}h18" stroke-width="7"/>`;
    this.svg.querySelector('#anchors').innerHTML=Object.values(this.contacts).map(([x,y])=>`<circle cx="${x}" cy="${y}" r="5"/>`).join('');
  }
}
export class RiderRig {
  constructor(bike){this.bike=bike; this.layer=bike.svg.querySelector('#rider');}
  mount(root){this.layer.replaceChildren(root); this.root=root; this.render();}
  render(){
    if(!this.root)return;
    for(const el of this.root.querySelectorAll('[data-anchor]')){
      const [x,y]=el.getAttribute('data-origin').split(',').map(Number),[tx,ty]=this.bike.contacts[el.getAttribute('data-anchor')];
      const bend=Number(el.getAttribute('data-bend')||20);
      const profile=el.getAttribute('data-profile');
      if(profile==='joint'){
        const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy)||1,off=Math.min(32,dist*.32)*(bend<0?-1:1);
        const kx=(x+tx)/2+dy/dist*off,ky=(y+ty)/2-dx/dist*off;
        el.setAttribute('d',`M${x} ${y} L${kx} ${ky} L${tx} ${ty} M${tx} ${ty}l-6 3h13L${tx} ${ty}`);
      }else if(profile==='wing'){
        el.setAttribute('d',`M${tx} ${ty}Q${x+31} ${y-9} ${x} ${y}Q${x+12} ${y+31} ${tx} ${ty}Z`);
      }else el.setAttribute('d',`M${x} ${y} Q${(x+tx)/2+bend} ${(y+ty)/2} ${tx} ${ty}`);
    }
  }
}
export function geometry(rider){
  const box=rider.root.getBBox(); const errors=[];
  if(![box.x,box.y,box.width,box.height].every(Number.isFinite)||box.width<=0||box.height<=0) errors.push('Empty or non-finite geometry');
  // Stroke-aware clipping approximation, deliberately conservative.
  const pad=Math.max(0,...[rider.root,...rider.root.querySelectorAll('*')].map(e=>parseFloat(getComputedStyle(e).strokeWidth)||0))/2;
  if(box.x-pad<0||box.y-pad<0||box.x+box.width+pad>640||box.y+box.height+pad>440) errors.push('Animal exceeds canvas');
  for(const el of rider.root.querySelectorAll('[data-anchor]')) {
    const end=el.getPointAtLength(el.getTotalLength()), target=rider.bike.contacts[el.getAttribute('data-anchor')];
    if(Math.hypot(end.x-target[0],end.y-target[1])>0.1) errors.push('Contact detached');
    const style=getComputedStyle(el);
    if(style.stroke==='none'||style.stroke==='rgba(0, 0, 0, 0)'||parseFloat(style.strokeWidth)<=0) errors.push('Invisible contact');
    let ancestor=el;while(ancestor&&ancestor!==rider.layer){if(Number(getComputedStyle(ancestor).opacity)===0)errors.push('Invisible contact');ancestor=ancestor.parentElement;}
  }
  return {pass:errors.length===0,errors,bounds:{x:box.x,y:box.y,width:box.width,height:box.height}};
}

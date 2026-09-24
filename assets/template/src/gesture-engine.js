import { clamp } from './geometry.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const palm=h=>({x:(h[0].x+h[5].x+h[9].x+h[17].x)/4,y:(h[0].y+h[5].y+h[9].y+h[17].y)/4});
export function classifyHand(h){
  if(!h||h.length!==21||h.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return 'none';
  const extended=[8,12,16,20].map(tip=>dist(h[tip],h[0])>dist(h[tip-2],h[0])*1.13);
  const palmSize=Math.max(.025,dist(h[0],h[9]));
  if(extended[0]&&extended[1]&&!extended[2]&&!extended[3])return 'victory';
  if(!extended.some(Boolean)&&h[4].y<h[3].y-.03&&h[4].y<h[5].y-.15)return 'thumb';
  if(dist(h[4],h[8])/palmSize<.30)return 'pinch';
  if(!extended[1]&&!extended[2]&&!extended[3]&&(extended[0]||((h[8].z??0)-(h[6].z??0))<-.2*palmSize))return 'point';
  if(extended.filter(Boolean).length>=3)return 'palm';
  return 'rest';
}
// Test hand axes and their short forearm extensions: an arm X often crosses
// below the wrists, rather than between the fingers as in the old detector.
export function crossedHands(hands){
 if(hands.length!==2||hands.some(h=>classifyHand(h)==='none'))return false;
 const [a,b]=hands,scale=(dist(a[0],a[9])+dist(b[0],b[9]))/2;
 if(dist(a[0],b[0])>scale*3.5)return false;
 const cross=(x,y)=>x.x*y.y-x.y*y.x;
 for(const tip of [9,12,8]){
  const p=a[0],q=b[0],u={x:a[tip].x-p.x,y:a[tip].y-p.y},v={x:b[tip].x-q.x,y:b[tip].y-q.y};
  const den=cross(u,v),length=Math.hypot(u.x,u.y)*Math.hypot(v.x,v.y);
  if(!length||Math.abs(den)/length<.35||u.x*v.x>=0||Math.abs(u.x)<scale*.2||Math.abs(v.x)<scale*.2)continue;
  const gap={x:q.x-p.x,y:q.y-p.y},t=cross(gap,v)/den,r=cross(gap,u)/den;
  if(t> -1.6&&t<1.15&&r> -1.6&&r<1.15)return true;
 }
 return false;
}
export class GestureEngine {
 constructor(){this.reset();}
 reset(){this.motionSample=null;this.previous=null;this.mode='none';this.previousTime=0;this.tap=null;this.crossStart=null;this.crossFired=false;this.crossSeen=-Infinity;this.anchor=null;}
 update(hands,time){
  const valid=(hands||[]).filter(h=>classifyHand(h)!=='none');
  if(crossedHands(valid)){
   this.previous=null;this.anchor=null;this.tap=null;this.mode='cross';this.crossSeen=time;
   if(this.crossStart===null)this.crossStart=time;
   const activate=!this.crossFired&&time-this.crossStart>=220;if(activate)this.crossFired=true;
   return {mode:'back',activate};
  }
  if(time-this.crossSeen<400){this.previous=null;return {mode:'rest'};}
  this.crossStart=null;this.crossFired=false;
  if(!valid.length){this.previous=null;this.anchor=null;this.mode='none';this.tap=null;return {mode:'none'};}
  if(time-this.previousTime>300){this.previous=null;this.anchor=null;this.mode='none';this.tap=null;}this.previousTime=time;
  // Keep the same physical hand when MediaPipe changes detection order.
  const h=this.anchor?valid.reduce((best,h)=>dist(palm(h),this.anchor)<dist(palm(best),this.anchor)?h:best):valid[0];
  const center=palm(h),mode=classifyHand(h);
  this.anchor=center;
  // Arm only after a clear single-index pose. Closing an open palm is never a click.
  if(mode==='point'&&valid.length===1){
   this.previous=null;this.mode='point';
   if(!this.tap)this.tap={since:time,phase:'arming'};
   if(time-this.tap.since>=160)this.tap.phase='ready';
   return {mode:'point',phase:this.tap.phase};
  }
  const curled=[8,12,16,20].every(tip=>dist(h[tip],h[0])<=dist(h[tip-2],h[0])*1.13);
  if(this.tap?.phase==='ready'&&valid.length===1&&curled&&mode!=='pinch'){
   this.tap=null;this.previous=null;this.mode='rest';return {mode:'click'};
  }
  // Pinching, changing pose or losing the hand cancels the armed click.
  this.tap=null;
  if(mode==='palm'){
   const position=1-center.x;
   const length=dist(h[0],h[9]),width=dist(h[5],h[17]),size=Math.sqrt(length*width),shape=width/Math.max(.025,length);
   const spread=[8,12,16,20].every(tip=>dist(h[tip],h[0])>dist(h[tip-2],h[0])*1.13)&&dist(h[4],h[5])>length*.45;
   const continuous=['rotate','zoom'].includes(this.mode)&&this.motionSample;
   const raw=continuous?position-this.previous:0;
   const sample=continuous?this.motionSample:{size,shape};
   const change=Math.log(size/Math.max(.01,sample.size));
   const stableShape=Math.abs(Math.log(shape/Math.max(.01,sample.shape)))<.12;
   this.previous=position;
   // Apparent palm size is a relative distance cue, not a centimetre estimate.
   // Lateral motion wins, so swiping never rotates and zooms in the same frame.
   if(valid.length===1&&spread&&stableShape&&Math.abs(raw)<.006&&Math.abs(change)>.025){
    this.motionSample={size,shape};this.mode='zoom';
    return {mode:'zoom',ratio:Math.exp(clamp(change,-.12,.12)*1.3)};
   }
   if(!spread||!stableShape||Math.abs(raw)>=.006||!continuous)this.motionSample={size,shape};
   this.mode='rotate';
   return {mode:'rotate',delta:Math.abs(raw)<.003||Math.abs(raw)>.25?0:clamp(raw,-.08,.08)*5};
  }
  this.previous=null;this.mode='rest';return {mode:'rest'};
 }
}
// Dwell selection requires one continuous hover, and fires once until leaving.
export class DwellSelection {
  constructor(duration=900){this.duration=duration;this.reset();}
  reset(){this.target=null;this.started=0;this.fired=false;}
  update(target,time,select=false){
    if(target===null){this.reset();return {progress:0,activate:false};}
    if(target!==this.target){this.target=target;this.started=time;this.fired=false;}
    const progress=clamp((time-this.started)/this.duration,0,1);
    const activate=!this.fired&&(progress>=1||select);
    if(activate)this.fired=true;
    return {progress:this.fired?1:progress,activate};
  }
}

import { clamp } from './geometry.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const palm=h=>({x:(h[0].x+h[5].x+h[9].x+h[17].x)/4,y:(h[0].y+h[5].y+h[9].y+h[17].y)/4});
export function classifyHand(h){
  if(!h||h.length!==21||h.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return 'none';
  const extended=[8,12,16,20].map(tip=>dist(h[tip],h[0])>dist(h[tip-2],h[0])*1.13);
  const palmSize=Math.max(.025,dist(h[0],h[9]));
  if(dist(h[4],h[8])/palmSize<.30)return 'pinch';
  if(extended[0]&&!extended[1]&&!extended[2])return 'point';
  if(extended.filter(Boolean).length>=3)return 'palm';
  return 'rest';
}
export class GestureEngine {
  constructor(){this.reset();}
  reset(){this.previous=null;this.mode='none';this.previousTime=0;this.smooth=null;this.pinched=false;}
  update(hands,time){
    if(!hands?.length){this.reset();return {mode:'none'};}
    if(time-this.previousTime>400){this.previous=null;this.smooth=null;}
    this.previousTime=time;
    const modes=hands.map(classifyHand);
    if(hands.length>=2&&modes[0]==='palm'&&modes[1]==='palm'){
      const distance=dist(palm(hands[0]),palm(hands[1]));
      const ratio=this.mode==='zoom'&&this.previous?clamp(distance/Math.max(.05,this.previous),.93,1.07):1;
      this.previous=distance;this.mode='zoom';this.smooth=null;this.pinched=false;
      return {mode:'zoom',ratio};
    }
    const h=hands[0],mode=modes[0];
    if(mode==='palm'){
      const position=1-palm(h).x;
      const dx=this.mode==='rotate'&&this.previous!==null?clamp(position-this.previous,-.08,.08):0;
      this.previous=position;this.mode='rotate';this.smooth=null;this.pinched=false;
      return {mode:'rotate',delta:Math.abs(dx)<.0015?0:dx*5};
    }
    if(mode==='point'||mode==='pinch'){
      const cursor={x:clamp((1-h[8].x-.15)/.7,0,1),y:clamp((h[8].y-.1)/.75,0,1)};
      if(!this.smooth)this.smooth=cursor;
      else this.smooth={x:this.smooth.x+(cursor.x-this.smooth.x)*.4,y:this.smooth.y+(cursor.y-this.smooth.y)*.4};
      const select=mode==='pinch'&&!this.pinched;
      this.pinched=mode==='pinch';this.mode='point';this.previous=null;
      return {mode:'point',cursor:this.smooth,select};
    }
    this.previous=null;this.smooth=null;this.pinched=false;this.mode='rest';
    return {mode:'rest'};
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

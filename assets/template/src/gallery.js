import { TAU, clamp, cardPose, layoutFor } from './geometry.js';
export class Gallery {
  constructor(artworks, onOpen) {
    this.el = document.querySelector('#gallery');
    this.ring = document.querySelector('#ring');
    this.artworks = artworks;
    this.onOpen = onOpen;
    this.angle = this.targetAngle = 0; // First travel photo faces the viewer.
    this.zoom = this.targetZoom = 1;
    this.velocity = 0;
    this.frame = 0;
    this.pointers = new Map();
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)');
    this.cards = artworks.map((art, index) => {
      const button = document.createElement('button');
      button.className = 'art-card'; button.dataset.index = index;button.dataset.handAction=`category-${art.id}`;
      button.setAttribute('aria-label', `查看作品：${art.title}`);
      const img = document.createElement('img');img.src = art.image;img.alt = art.alt;img.draggable = false;
      const label = document.createElement('span');label.className = 'art-label';label.setAttribute('aria-hidden','true');
      const strong = document.createElement('strong'); strong.textContent = art.title;
      const small = document.createElement('small');small.textContent = art.category;
      label.append(strong,small);button.append(img,label);this.ring.append(button);
      button.addEventListener('click', e => {
        if (this.suppressClick) { e.preventDefault(); return; }
        onOpen(index, button);
      });
      button.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { this.suppressClick = false; }
      });
      return button;
    });
    this.resize = () => {
      this.layout = layoutFor(innerWidth,innerHeight,artworks.length);
      const {cardWidth,cardHeight,radius,perspective} = this.layout;
      const root = document.documentElement.style;
      root.setProperty('--card-w',`${cardWidth}px`);root.setProperty('--card-h',`${cardHeight}px`);
      root.setProperty('--ring-radius',`${radius}px`);root.setProperty('--perspective',`${perspective}px`);
      this.render();
    };
    this.resize();
    window.addEventListener('resize',this.resize);
    this.el.addEventListener('pointerdown',e=>this.pointerDown(e));
    this.el.addEventListener('pointermove',e=>this.pointerMove(e));
    this.el.addEventListener('pointerup',e=>this.pointerUp(e));
    this.el.addEventListener('pointercancel',e=>this.pointerUp(e,true));
    this.el.addEventListener('wheel',e=>{
      e.preventDefault();this.velocity=0;
      if(Math.abs(e.deltaX)>Math.abs(e.deltaY) && !e.ctrlKey) this.rotate(-e.deltaX*.0025);
      else this.setZoom(this.targetZoom*Math.exp(-e.deltaY*.0012));
    },{passive:false});
    document.addEventListener('keydown',e=>this.keyDown(e));
    document.addEventListener('visibilitychange',()=>{
      if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.velocity=0;}
      else this.wake();
    });
    this.reduced.addEventListener('change',()=>{this.velocity=0;this.wake();});
  }
  render(){
    const {radius,fit}=this.layout;
    this.ring.style.transform=`translateZ(${-radius}px) scale(${fit*this.zoom}) rotateX(${this.layout.mobile?-24:-7}deg)`;
    this.onChange?.(this.frontIndex());this.ring.dataset.angle=this.angle.toFixed(5);this.ring.dataset.zoom=this.zoom.toFixed(4);
    this.cards.forEach((card,i)=>{
      const pose=cardPose(i,this.cards.length,this.angle,radius);
      if(this.cards.length<=5&&!this.layout.mobile){const face=Math.cos(pose.theta);pose.interactive=face>-.1;pose.opacity=face>=-.01?.45+.55*Math.max(0,face):.07;pose.theta=Math.atan2(Math.sin(pose.theta),Math.cos(pose.theta))*.55;}
      if(this.layout.mobile){pose.opacity=pose.facing>0?.65+.35*pose.facing:.24+.12*(1+pose.facing);}
      card.style.transform=`translate3d(${pose.x}px,0,${pose.z}px) rotateY(${pose.theta}rad)`;
      card.style.opacity=pose.opacity;
      card.style.pointerEvents=pose.interactive?'auto':'none';
      card.tabIndex=pose.interactive?0:-1;
      card.setAttribute('aria-hidden',String(!pose.interactive));
    });
    const shadow=document.querySelector('.floor-shadow');
    shadow.style.opacity=clamp(this.zoom*.65,.35,1);
    shadow.style.transform=`translate(-50%,-50%) scaleX(${this.zoom*this.layout.fit})`;
  }
  wake(){if(!this.frame&&!document.hidden)this.frame=requestAnimationFrame(t=>this.tick(t));}
  tick(t){
    this.frame=0;const dt=Math.min(2.5,(t-(this.lastFrame??t))/16.67)||1;this.lastFrame=t;
    if(!this.pointers.size && Math.abs(this.velocity)>.00005){this.targetAngle+=this.velocity*dt;this.velocity*=Math.pow(.93,dt);}
    const ease=this.reduced.matches?1:1-Math.pow(.8,dt);
    this.angle+=(this.targetAngle-this.angle)*ease;this.zoom+=(this.targetZoom-this.zoom)*ease;
    this.render();
    if(Math.abs(this.targetAngle-this.angle)>.00005||Math.abs(this.targetZoom-this.zoom)>.00005||Math.abs(this.velocity)>.00005)this.wake();
    else{this.angle=this.targetAngle;this.zoom=this.targetZoom;this.render();this.lastFrame=null;}
  }
  rotate(delta){this.targetAngle+=delta;this.wake();}
  setZoom(zoom){this.targetZoom=clamp(zoom,.6,1.85);this.wake();}
  reset(){this.velocity=0;this.targetAngle=0;this.targetZoom=1;this.wake();}
  pointerDown(e){
    if(e.button!==0)return;
    this.suppressClick=false;this.velocity=0;
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size===1){this.start={x:e.clientX,y:e.clientY,angle:this.targetAngle,time:e.timeStamp};this.last={x:e.clientX,time:e.timeStamp};this.moved=false;}
    if(this.pointers.size===2){this.pinchStart=this.pointerDistance();this.pinchZoom=this.targetZoom;this.moved=true;this.suppressClick=true;}
    // Capture on the original card so a short tap retains native click semantics.
    e.target.setPointerCapture?.(e.pointerId);
  }
  pointerDistance(){const [a,b]=[...this.pointers.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
  pointerMove(e){
    if(!this.pointers.has(e.pointerId))return;
    this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(this.pointers.size===2){this.setZoom(this.pinchZoom*this.pointerDistance()/Math.max(1,this.pinchStart));return;}
    const dx=e.clientX-this.start.x;
    if(Math.hypot(dx,e.clientY-this.start.y)>6){this.moved=true;this.suppressClick=true;this.el.classList.add('dragging');}
    if(!this.moved)return;
    const sensitivity=this.layout.mobile?.006:.0035;
    this.targetAngle=this.start.angle+dx*sensitivity;
    const elapsed=Math.max(8,e.timeStamp-this.last.time);
    this.velocity=clamp((e.clientX-this.last.x)*sensitivity*16.67/elapsed,-.10,.10);
    this.last={x:e.clientX,time:e.timeStamp};this.wake();
  }
  pointerUp(e,cancelled=false){
    if(!this.pointers.has(e.pointerId))return;
    this.pointers.delete(e.pointerId);
    if(this.pointers.size===1){const [p]=this.pointers.values();this.start={...p,angle:this.targetAngle,time:e.timeStamp};this.last={x:p.x,time:e.timeStamp};this.velocity=0;}
    if(!this.pointers.size){
      this.el.classList.remove('dragging');
      if(cancelled||this.reduced.matches||e.timeStamp-this.last.time>100)this.velocity=0;
      this.wake();
    }
  }
  keyDown(e){
    if(document.querySelector('dialog[open]')||this.el.hidden||e.target.closest('input,textarea,select')||!document.querySelector('#detail').hidden)return;
    if(e.target.closest('.gesture-controls'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
      e.preventDefault();this.velocity=0;this.rotate((e.key==='ArrowRight'?-1:1)*TAU/this.cards.length);
      this.el.focus({preventScroll:true});
    }else if(e.key==='+'||e.key==='='){e.preventDefault();this.setZoom(this.targetZoom*1.15);}
    else if(e.key==='-'){e.preventDefault();this.setZoom(this.targetZoom/1.15);}
    else if(e.key==='Home'||e.key==='0'){e.preventDefault();this.reset();}
    else if((e.key==='Enter'||e.key===' ')&&e.target===this.el){e.preventDefault();const i=this.frontIndex();this.onOpen(i,this.cards[i]);}
  }
  frontIndex(){return ((Math.round(-this.targetAngle/TAU*this.cards.length)%this.cards.length)+this.cards.length)%this.cards.length;}
}

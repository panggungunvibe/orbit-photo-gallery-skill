export class Collection {
  constructor(onOpen) {
    this.el=document.querySelector('#collection');this.track=document.querySelector('#photo-scroll');
    this.onOpen=onOpen;this.positions=new Map();this.cards=[];this.target=0;this.frame=0;this.zoom=this.targetZoom=1;
    this.track.addEventListener('scroll',()=>{this.updateProgress();if(!this.frame)this.target=this.track.scrollLeft;},{passive:true});
    this.track.addEventListener('wheel',e=>{e.preventDefault();this.move(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY);},{passive:false});
    this.track.addEventListener('pointerdown',e=>{if(e.button!==0)return;cancelAnimationFrame(this.frame);this.frame=0;this.drag={id:e.pointerId,x:e.clientX,left:this.track.scrollLeft};this.moved=false;});
    this.track.addEventListener('pointermove',e=>{if(!this.drag||this.drag.id!==e.pointerId)return;const dx=e.clientX-this.drag.x;if(Math.abs(dx)>6){this.moved=true;this.track.setPointerCapture(e.pointerId);this.track.classList.add('dragging');this.track.scrollLeft=this.drag.left-dx;this.target=this.track.scrollLeft;}});
    const release=()=>{this.drag=null;this.track.classList.remove('dragging');};
    this.track.addEventListener('pointerup',release);this.track.addEventListener('pointercancel',release);
    this.track.addEventListener('click',e=>{if(this.moved){e.preventDefault();e.stopImmediatePropagation();this.moved=false;}},true);
    this.track.addEventListener('keydown',e=>{if(!document.querySelector('#detail').hidden)return;if(['ArrowRight','ArrowLeft','Home','End'].includes(e.key)){e.preventDefault();this.move(e.key==='Home'?-this.track.scrollWidth:e.key==='End'?this.track.scrollWidth:(e.key==='ArrowRight'?1:-1)*this.track.clientWidth*.65);}});
    window.addEventListener('resize',()=>this.updateProgress());
  }
  open(category){
    this.category=category;this.el.hidden=false;document.querySelector('#collection-title').textContent=category.title;
    document.querySelector('#collection-note').textContent=category.note;this.track.replaceChildren();
    this.cards=category.photos.map((photo,index)=>{
      const card=document.createElement('button');card.className='scroll-photo';card.dataset.index=index;card.dataset.handAction=`photo-${photo.id}`;card.setAttribute('aria-label',`查看照片：${photo.title}`);card.style.setProperty('--photo-ratio',String(photo.width/photo.height));
      const img=new Image();img.src=photo.image;img.alt=photo.alt;img.draggable=false;img.loading=index<4?'eager':'lazy';
      const caption=document.createElement('span');caption.className='scroll-caption';const num=document.createElement('small');num.textContent=String(index+1).padStart(2,'0');const title=document.createElement('span');title.textContent=photo.title;caption.append(num,title);card.append(img,caption);
      card.addEventListener('click',()=>this.onOpen(photo,card));this.track.append(card);return card;
    });
    this.track.scrollLeft=this.positions.get(category.id)||0;this.target=this.track.scrollLeft;this.updateProgress();this.track.focus({preventScroll:true});
  }
  setZoom(z){this.targetZoom=Math.max(.65,Math.min(1.3,z));this.track.style.setProperty("--collection-zoom",this.targetZoom);this.updateProgress();}
  close(){this.positions.set(this.category.id,this.track.scrollLeft);cancelAnimationFrame(this.frame);this.frame=0;this.el.hidden=true;}
  move(delta){this.target=Math.max(0,Math.min(this.track.scrollWidth-this.track.clientWidth,this.target+delta));if(!this.frame)this.frame=requestAnimationFrame(()=>this.tick());}
  tick(){this.frame=0;const gap=this.target-this.track.scrollLeft;this.track.scrollLeft+=gap*(matchMedia('(prefers-reduced-motion: reduce)').matches?1:.2);if(Math.abs(gap)>1)this.frame=requestAnimationFrame(()=>this.tick());else this.track.scrollLeft=this.target;}
  updateProgress(){const max=this.track.scrollWidth-this.track.clientWidth;const progress=max>0?this.track.scrollLeft/max:0;document.querySelector('#scroll-progress').style.setProperty('--progress',String(progress));document.querySelector('#collection-count').textContent=`${this.cards.length} 张 · 慢慢看，不赶路`;}
}

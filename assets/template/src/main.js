import { setCurrentPhoto } from './library.js';
import './style.css';
import { categories } from './categories.js';
import { Gallery } from './gallery.js';
import { Collection } from './collection.js';
import { AmbientSound } from './audio.js';
import { HandController } from './hands.js';
const $=selector=>document.querySelector(selector);
let detailZoom=1;const detail=$('#detail');let returnFocus=null,categoryOrigin=null;
function openDetail(art,origin){
 returnFocus=origin;setCurrentPhoto(art);detailZoom=1;$('#detail-image').style.transform='';$('#detail-image').src=art.image;$('#detail-image').alt=art.alt;
 $('#detail-title').textContent=art.title;$('#detail-year').textContent=art.year||'';
 $('#detail-category').textContent=art.category;$('#detail-description').textContent=art.description;
 gallery.el.inert=true;collection.el.inert=true;$('#category-nav').inert=true;detail.hidden=false;detail.dataset.artwork=art.id;$('#detail-backdrop').hidden=false;
 $('#announcement').textContent=`${art.title}，照片详情已打开`;$('#detail-close').focus({preventScroll:true});
}
function closeDetail(){if(detail.hidden)return;detail.hidden=true;gallery.el.inert=false;collection.el.inert=false;$('#category-nav').inert=false;$('#detail-backdrop').hidden=true;returnFocus?.focus({preventScroll:true});}
const collection=new Collection(openDetail);
function openCategory(index,origin){
 categoryOrigin=origin;gallery.velocity=0;
 const source=gallery.cards[index].querySelector('img'),from=source.getBoundingClientRect();
 collection.open(categories[index]);
 if(!collection.positions.get(categories[index].id)&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
   const to=collection.cards[0].querySelector('img').getBoundingClientRect(),clone=source.cloneNode();
   clone.setAttribute('aria-hidden','true');clone.className='cover-flight';document.body.append(clone);
   clone.animate([{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px',opacity:1},{left:to.left+'px',top:to.top+'px',width:to.width+'px',height:to.height+'px',opacity:0}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'}).finished.then(()=>clone.remove());
 }gallery.el.hidden=true;$('#category-nav').hidden=true;document.body.dataset.view='collection';
 $('#announcement').textContent=`${categories[index].title}，${categories[index].photos.length} 张照片`;
}
function back(){if(!detail.hidden){closeDetail();return;}if(collection.el.hidden)return;collection.close();gallery.el.hidden=false;$('#category-nav').hidden=false;document.body.dataset.view='ring';gallery.resize();(categoryOrigin||gallery.el).focus({preventScroll:true});}
const gallery=new Gallery(categories,openCategory);
categories.forEach((category,i)=>{const b=document.createElement('button');b.dataset.handAction=`nav-${category.id}`;b.textContent=category.title;const count=document.createElement('small');count.textContent=category.photos.length;b.append(count);b.addEventListener('click',()=>openCategory(i,b));$('#category-nav').append(b);});
gallery.onChange=index=>[...$('#category-nav').children].forEach((b,i)=>b.setAttribute('aria-current',String(i===index)));gallery.render();
$('#collection-back').addEventListener('click',back);$('#detail-close').addEventListener('click',closeDetail);$('#detail-backdrop').addEventListener('click',closeDetail);
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!document.querySelector('dialog[open]'))back();});
new AmbientSound($('#sound-toggle'));
const navigation={
 get cards(){return collection.el.hidden?gallery.cards:collection.cards;},
 currentCard(){if(collection.el.hidden)return gallery.cards[gallery.frontIndex()];return collection.cards.reduce((best,card)=>Math.abs(card.getBoundingClientRect().left+card.offsetWidth/2-innerWidth/2)<Math.abs(best.getBoundingClientRect().left+best.offsetWidth/2-innerWidth/2)?card:best);},
 set velocity(v){gallery.velocity=v;},
 get targetZoom(){return !detail.hidden?detailZoom:collection.el.hidden?gallery.targetZoom:collection.targetZoom;},
 stopMotion(){gallery.velocity=0;cancelAnimationFrame(gallery.frame);gallery.frame=0;gallery.targetAngle=gallery.angle;gallery.targetZoom=gallery.zoom;cancelAnimationFrame(collection.frame);collection.frame=0;collection.target=collection.track.scrollLeft;},
 rotate(delta){this.stopMotion();if(collection.el.hidden){gallery.angle+=delta;gallery.targetAngle=gallery.angle;gallery.render();}else{collection.track.scrollLeft-=delta*1100;collection.target=collection.track.scrollLeft;collection.updateProgress();}},
 setZoom(z){if(!detail.hidden){detailZoom=Math.max(.7,Math.min(1.5,z));$('#detail-image').style.transform=`scale(${detailZoom})`;}else if(collection.el.hidden){gallery.setZoom(z);cancelAnimationFrame(gallery.frame);gallery.frame=0;gallery.zoom=gallery.targetZoom;gallery.render();}else collection.setZoom(z);}
};
const hands=new HandController({gallery:navigation,onClose:back,onActivate:card=>{gallery.suppressClick=false;collection.moved=false;card.click();}});
$('#gesture-toggle').addEventListener('click',()=>hands.toggle());$('#gesture-help-toggle').addEventListener('click',()=>{const help=$('#gesture-help');help.hidden=!help.hidden;$('#gesture-help-toggle').setAttribute('aria-expanded',String(!help.hidden));});window.addEventListener('pagehide',()=>hands.stop());
export {gallery,hands,collection};

const mobileGestures=matchMedia('(max-width:700px), (pointer:coarse)');
function hideMobileHands(){document.querySelector('.gesture-controls').hidden=mobileGestures.matches;document.querySelector('.collection-hint').textContent=mobileGestures.matches?'左右滑动长卷 · 轻点照片读日记':'张掌滑动 · 食指点按 · 双手交叉返回';if(mobileGestures.matches)hands.stop();}
mobileGestures.addEventListener('change',hideMobileHands);hideMobileHands();
document.addEventListener('keydown',e=>{if(e.key!=='Tab'||detail.hidden||document.querySelector('dialog[open]'))return;const controls=[...detail.querySelectorAll('button')];const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});

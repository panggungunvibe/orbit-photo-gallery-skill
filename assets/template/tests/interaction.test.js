import test from 'node:test';
import assert from 'node:assert/strict';
import { cardPose, layoutFor, TAU } from '../src/geometry.js';
import { GestureEngine, DwellSelection, classifyHand, crossedHands } from '../src/gesture-engine.js';
import { categories } from '../src/categories.js';
import { artworks } from '../src/artworks.js';
import { existsSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
function hand(extended=[true,true,true,true],x=.5){
 const h=Array.from({length:21},()=>({x,y:.6,z:0}));h[0]={x,y:.85,z:0};h[4]={x:x-.22,y:.55,z:0};
 [5,9,13,17].forEach((base,i)=>{const fx=x+(i-1.5)*.055;h[base]={x:fx,y:.62,z:0};h[base+1]={x:fx,y:.47,z:0};h[base+2]={x:fx,y:extended[i]?.36:.65,z:0};h[base+3]={x:fx,y:extended[i]?.23:.7,z:0};});return h;
}
test('all curated travel photos exist with centralized provenance and unique identities',()=>{
 assert.ok(artworks.length>=5);assert.equal(new Set(artworks.map(a=>a.id)).size,artworks.length);
 artworks.forEach(a=>{assert.ok(existsSync(`public${a.image}`));assert.ok(a.copySource);assert.ok(a.height>a.width);assert.ok(a.description.length>30);});
});
test('ring wraps continuously after one full revolution; back planes cannot intercept clicks',()=>{
 for(let i=0;i<12;i++){const a=cardPose(i,12,.73,420),b=cardPose(i,12,.73+TAU,420);assert.ok(Math.abs(a.x-b.x)<1e-8);assert.ok(Math.abs(a.z-b.z)<1e-8);}
 const back=cardPose(6,12,0,420);assert.equal(back.interactive,false);assert.ok(back.opacity<.11);
 assert.equal(cardPose(0,12,0,420).interactive,true);
});
test('responsive card dimensions remain positive and bounded at phone, breakpoint, laptop and desktop sizes',()=>{
 for(const [w,h] of [[320,568],[390,844],[700,800],[701,800],[1366,768],[1920,1080],[844,390]]){
  const l=layoutFor(w,h);assert.ok(l.cardHeight>0&&l.cardHeight<h);assert.ok(l.fit>0&&l.fit<=1);assert.ok(Number.isFinite(l.radius));
 }
});
test('recognizes palm, index point, rest and pinch from landmarks',()=>{
 assert.equal(classifyHand(hand()),'palm');assert.equal(classifyHand(hand([true,false,false,false])),'point');assert.equal(classifyHand(hand([false,false,false,false])),'rest');
 const pinch=hand([true,false,false,false]);pinch[4]={...pinch[8],x:pinch[8].x+.01};assert.equal(classifyHand(pinch),'pinch');assert.equal(classifyHand([]),'none');
});
function pinch(){const h=hand([true,false,false,false]);h[4]={...h[8]};return h;}
function crossed(){const a=hand(),b=hand();a[0]={x:.3,y:.8};a[12]={x:.7,y:.3};b[0]={x:.7,y:.8};b[12]={x:.3,y:.3};return [a,b];}
test('same single-palm swipe rotates ring and scrolls collection without reacquisition jump',()=>{
 for(const view of ['ring','collection']){const e=new GestureEngine();assert.equal(e.update([hand()],100,view).delta,0);assert.ok(e.update([hand(undefined,.6)],200,view).delta<0);e.update([],300);assert.equal(e.update([hand(undefined,.8)],400,view).delta,0);}
});
test('closing after scrolling, a fist, and a pinch never click',()=>{
 const e=new GestureEngine();e.update([hand()],100);e.update([hand(undefined,.6)],200);
 for(const pose of [hand([true,true,false,false]),hand([false,false,false,false]),pinch()])for(let t=300;t<=1000;t+=100)assert.notEqual(e.update([pose],t).mode,'click');
});
test('extend a single index then curl it back clicks once, without any depth motion',()=>{
 const e=new GestureEngine(),point=hand([true,false,false,false]),closed=hand([false,false,false,false]);
 assert.equal(e.update([point],100).phase,'arming');assert.equal(e.update([point],280).phase,'ready');
 assert.equal(e.update([closed],380).mode,'click');assert.notEqual(e.update([closed],480).mode,'click');
});
test('static pointing, brief transition while closing palm, pinch and tracking loss never click',()=>{
 const e=new GestureEngine(),point=hand([true,false,false,false]),closed=hand([false,false,false,false]);
 e.update([hand()],100);e.update([point],200);assert.notEqual(e.update([closed],260).mode,'click');
 for(let t=300;t<=1000;t+=100)assert.equal(e.update([point],t).mode,'point');
 assert.notEqual(e.update([pinch()],1100).mode,'click');assert.notEqual(e.update([closed],1200).mode,'click');
 e.update([point],1300);e.update([point],1500);e.update([],1600);assert.notEqual(e.update([closed],1700).mode,'click');
});
test('stationary palm, missing hand and hand-order changes cannot cause drift',()=>{
 const e=new GestureEngine();e.update([hand()],100);assert.ok(e.update([hand(undefined,.55)],200).delta<0);for(let t=250;t<600;t+=50)assert.equal(e.update([hand(undefined,.55)],t).delta,0);assert.equal(e.update([],600).mode,'none');assert.equal(e.update([hand(undefined,.9)],700).delta,0);
});
test('X supports intersection above and below wrists, parallel palms do not return',()=>{
 assert.equal(crossedHands([hand(undefined,.3),hand(undefined,.7)]),false);assert.equal(crossedHands(crossed()),true);
 const forearms=crossed();forearms[0][0]={x:.4,y:.65};forearms[0][12]={x:.2,y:.3};forearms[1][0]={x:.6,y:.65};forearms[1][12]={x:.8,y:.3};assert.equal(crossedHands(forearms),true);
 const e=new GestureEngine();assert.equal(e.update(crossed(),100).activate,false);assert.equal(e.update(crossed(),350).activate,true);assert.equal(e.update(crossed(),500).activate,false);e.update([],550);assert.equal(e.update(crossed(),600).activate,false);e.update([hand()],1100);assert.equal(e.update(crossed(),1200).activate,false);
});
test('dwell requires continuous targeting, fires only once, resets on exit',()=>{
 const d=new DwellSelection(900);assert.equal(d.update(3,0).activate,false);assert.equal(d.update(3,700).activate,false);
 assert.equal(d.update(4,800).progress,0);assert.equal(d.update(4,1701).activate,true);assert.equal(d.update(4,2800).activate,false);
 d.update(null,3000);assert.equal(d.update(4,3001).activate,false);assert.equal(d.update(4,3902).activate,true);
});
test('each selected photo belongs to exactly one nonempty category with a valid cover',()=>{assert.ok(categories.length>=5);assert.deepEqual(categories.flatMap(c=>c.photos.map(p=>p.id)).sort(),artworks.map(p=>p.id).sort());categories.forEach(c=>{assert.ok(c.photos.some(p=>p.image===c.image));});});

test('photos never repeat across categories, ids or identical web files',()=>{
 for(const field of ['id','image'])assert.equal(new Set(artworks.map(a=>a[field])).size,artworks.length);
 const hashes=artworks.map(a=>createHash('sha256').update(readFileSync('public'+a.image)).digest('hex'));assert.equal(new Set(hashes).size,artworks.length);
});


function scaledPalm(scale=1,x=.5){return hand(undefined,x).map(p=>({...p,x:x+(p.x-x)*scale,y:.6+(p.y-.6)*scale}));}
test('open palm approaching zooms in, retreating zooms out, stationary stops',()=>{
 const e=new GestureEngine();assert.equal(e.update([scaledPalm()],100).mode,'rotate');
 const near=e.update([scaledPalm(1.12)],200);assert.equal(near.mode,'zoom');assert.ok(near.ratio>1);
 assert.equal(e.update([scaledPalm(1.12)],250).delta,0);
 const far=e.update([scaledPalm(.95)],300);assert.equal(far.mode,'zoom');assert.ok(far.ratio<1);
 e.update([],400);assert.equal(e.update([scaledPalm(1.4)],500).delta,0);
});
test('lateral swipe wins over size changes; small scale noise and folded fingers do not zoom',()=>{
 const e=new GestureEngine();e.update([scaledPalm()],100);assert.equal(e.update([scaledPalm(1.1,.56)],200).mode,'rotate');
 assert.notEqual(e.update([scaledPalm(1.105,.56)],250).mode,'zoom');
 const folded=hand([true,true,true,false]);e.update([folded],300);const larger=folded.map(p=>({...p,x:.5+(p.x-.5)*1.2,y:.6+(p.y-.6)*1.2}));assert.notEqual(e.update([larger],400).mode,'zoom');
});

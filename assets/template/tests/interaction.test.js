import test from 'node:test';
import assert from 'node:assert/strict';
import { cardPose, layoutFor, TAU } from '../src/geometry.js';
import { GestureEngine, DwellSelection, classifyHand } from '../src/gesture-engine.js';
import { categories } from '../src/categories.js';
import { artworks } from '../src/artworks.js';
import { existsSync,readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
function hand(extended=[true,true,true,true],x=.5){
 const h=Array.from({length:21},()=>({x,y:.6,z:0}));h[0]={x,y:.85,z:0};h[4]={x:x-.22,y:.55,z:0};
 [5,9,13,17].forEach((base,i)=>{const fx=x+(i-1.5)*.055;h[base]={x:fx,y:.62,z:0};h[base+1]={x:fx,y:.47,z:0};h[base+2]={x:fx,y:extended[i]?.36:.65,z:0};h[base+3]={x:fx,y:extended[i]?.23:.7,z:0};});return h;
}
test('all curated travel photos exist with centralized provenance and unique identities',()=>{
 assert.ok(artworks.length>0);assert.equal(new Set(artworks.map(a=>a.id)).size,artworks.length);
 artworks.forEach(a=>{assert.ok(existsSync(`public${a.image}`));assert.ok(a.copySource);assert.ok(a.height>a.width);assert.ok(a.description.length>0);});
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
test('first acquisition and reacquisition after loss do not cause an orbit jump',()=>{
 const engine=new GestureEngine();assert.equal(engine.update([hand()],100).delta,0);
 assert.ok(engine.update([hand([true,true,true,true],.55)],150).delta<0);
 engine.update([],200);assert.equal(engine.update([hand([true,true,true,true],.2)],250).delta,0);
 assert.equal(engine.update([hand([true,true,true,true],.8)],1000).delta,0);
});
test('two-hand spread zooms and switching to a single palm does not jump',()=>{
 const e=new GestureEngine();assert.equal(e.update([hand(undefined,.3),hand(undefined,.7)],100).ratio,1);
 assert.ok(e.update([hand(undefined,.27),hand(undefined,.73)],150).ratio>1);
 assert.equal(e.update([hand()],200).delta,0);
});
test('dwell requires continuous targeting, fires only once, resets on exit',()=>{
 const d=new DwellSelection(900);assert.equal(d.update(3,0).activate,false);assert.equal(d.update(3,700).activate,false);
 assert.equal(d.update(4,800).progress,0);assert.equal(d.update(4,1701).activate,true);assert.equal(d.update(4,2800).activate,false);
 d.update(null,3000);assert.equal(d.update(4,3001).activate,false);assert.equal(d.update(4,3902).activate,true);
});
test('pinch fires once while held, and pointing cursor stays within screen bounds',()=>{
 const e=new GestureEngine();const h=hand([true,false,false,false]);h[4]={...h[8]};
 assert.equal(e.update([h],100).select,true);assert.equal(e.update([h],150).select,false);
 const extreme=hand([true,false,false,false],1.3);const out=e.update([extreme],200);assert.ok(out.cursor.x>=0&&out.cursor.x<=1);
});

test('each selected photo belongs to exactly one nonempty category with a valid cover',()=>{assert.ok(categories.length>0);assert.deepEqual(categories.flatMap(c=>c.photos.map(p=>p.id)).sort(),artworks.map(p=>p.id).sort());categories.forEach(c=>{assert.ok(c.photos.some(p=>p.image===c.image));});});

test('photos never repeat across categories, image paths or identical web files',()=>{
 for(const field of ['id','image'])assert.equal(new Set(artworks.map(a=>a[field])).size,artworks.length);
 const hashes=artworks.map(a=>createHash('sha256').update(readFileSync('public'+a.image)).digest('hex'));assert.equal(new Set(hashes).size,artworks.length);
});

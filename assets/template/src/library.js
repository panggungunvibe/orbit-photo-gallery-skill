import { zipSync } from 'fflate';
import { artworks } from './artworks.js';
import { categories } from './categories.js';
const $=s=>document.querySelector(s);
export const safeName=s=>s.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,90);
export function photoPath(photo){const category=categories.find(c=>c.id===photo.group);return `${safeName(category?.title||photo.category)}/${safeName(photo.title)}-${photo.id}.jpg`;}
const mobile=()=>matchMedia('(max-width:700px), (pointer:coarse)').matches;
const key=`travel-memory-favorites-v1:${document.title}`;
let ids;
try{const saved=JSON.parse(localStorage.getItem(key)||'[]');ids=new Set(Array.isArray(saved)?saved.filter(id=>artworks.some(p=>p.id===id)):[]);}catch{ids=new Set();}
let current=null,items=[],mode='favorites',prepared=[],busy=false,generation=0;
const cache=new Map();
function update(){
 $('#favorite-count').textContent=ids.size;
 $('#favorite-toggle').textContent=ids.has(current?.id)?'♥ 已收藏':'♡ 收藏';
 $('#favorite-toggle').setAttribute('aria-pressed',String(ids.has(current?.id)));
 $('#download-all').textContent=mobile()?'↓ 保存到相册':'↓ 分类下载';
}
function toggle(photo){if(ids.has(photo.id))ids.delete(photo.id);else ids.add(photo.id);try{localStorage.setItem(key,JSON.stringify([...ids]));}catch{$('#announcement').textContent='浏览器无法保存收藏，本次打开期间仍可使用。';}update();}
export function setCurrentPhoto(photo){current=photo;update();}
async function jpeg(photo){
 if(cache.has(photo.id))return cache.get(photo.id);
 const response=await fetch(photo.image);if(!response.ok)throw new Error('照片读取失败');
 const url=URL.createObjectURL(await response.blob()),decoded=new Image(),canvas=document.createElement('canvas');
 try{decoded.src=url;await decoded.decode();canvas.width=decoded.naturalWidth;canvas.height=decoded.naturalHeight;canvas.getContext('2d').drawImage(decoded,0,0);}finally{URL.revokeObjectURL(url);}
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.94));if(!blob)throw new Error('转换失败');
 const file=new File([blob],photoPath(photo).split('/').pop(),{type:'image/jpeg'});cache.set(photo.id,file);return file;
}
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function render(){
 $('#library-grid').replaceChildren();
 items.forEach(photo=>{const box=document.createElement('figure'),img=new Image();img.src=photo.image;img.alt=photo.title;img.loading='lazy';
 const caption=document.createElement('figcaption');caption.textContent=photo.title;
 const save=document.createElement('button');save.textContent='保存单张';save.onclick=async()=>{try{download(await jpeg(photo),`${safeName(photo.title)}.jpg`);}catch{$('#library-message').textContent='保存失败，请重试。';}};
 box.append(img,caption,save);
 if(mode==='favorites'){const remove=document.createElement('button');remove.textContent='取消收藏';remove.onclick=()=>{toggle(photo);show('favorites');};box.append(remove);}
 $('#library-grid').append(box);});
}
async function show(nextMode,photos){
 const version=++generation;mode=nextMode;items=photos|| (mode==='favorites'?artworks.filter(p=>ids.has(p.id)):artworks);prepared=[];
 $('#library-title').textContent=mode==='favorites'?`收藏夹 · ${items.length}`:`保存照片 · ${items.length}`;
 $('#library-message').textContent=items.length?'正在准备照片…':'还没有收藏。打开喜欢的照片，点一下「收藏」。';
 $('#library-save').disabled=true;$('#library-zip').disabled=true;
 $('#library-save').hidden=!mobile();$('#library-zip').hidden=mobile();
 render();if(!$('#library-dialog').open)$('#library-dialog').showModal();if(!items.length)return;
 try{const files=[];for(const photo of items){files.push(await jpeg(photo));if(version!==generation)return;}
 prepared=files;$('#library-save').disabled=false;$('#library-zip').disabled=false;
 const shareable=navigator.canShare?.({files:prepared});
 $('#library-save').textContent=shareable?'保存到相册（系统菜单）':'逐张长按保存';
 $('#library-message').textContent=mobile()?(shareable?'照片已准备好，点击下方按钮，在系统菜单中选择「存储图像」或相册；也可长按下方照片保存。':'当前浏览器不支持批量保存到相册，请长按下方照片，选择保存图片。'): '按分类文件夹打包，包含当前列表中的全部照片。下载的是网站精选版 JPG。';
 }catch{$('#library-message').textContent='照片准备失败，请关闭后重试。';}
}
$('#favorites-open').onclick=()=>show('favorites');
$('#download-all').onclick=()=>mobile()?show('all'):saveZip(artworks);
$('#favorite-toggle').onclick=()=>{if(current)toggle(current);};
$('#download-one').onclick=()=>{if(current){if(mobile())show('single',[current]);else jpeg(current).then(file=>download(file,file.name)).catch(()=>{$('#announcement').textContent='照片下载失败，请重试。';});}};
$('#library-close').onclick=()=>{$('#library-dialog').close();generation++;};
$('#library-save').onclick=async()=>{
 if(!prepared.length)return;
 if(navigator.canShare?.({files:prepared})){
 try{await navigator.share({files:prepared});$('#library-message').textContent='已交给系统处理，请在相册中确认保存结果。';}catch(error){$('#library-message').textContent=error.name==='AbortError'?'已取消。可以重新保存，或长按照片保存。':'系统未能批量接收这些照片，请长按照片逐张保存。';}
 }else $('#library-grid').scrollIntoView({behavior:'smooth',block:'start'});
};
async function saveZip(photos){
 if(busy||!photos.length)return;busy=true;const button=$('#download-all'),label=button.textContent;button.disabled=true;$('#library-zip').disabled=true;
 try{$('#download-status').textContent='正在准备分类照片…';const files={};for(let i=0;i<photos.length;i++){button.textContent=`打包 ${i+1}/${photos.length}`;files[photoPath(photos[i])]=new Uint8Array(await (await jpeg(photos[i])).arrayBuffer());}
 download(new Blob([zipSync(files,{level:0})],{type:'application/zip'}),'旅行记忆-'+(mode==='favorites'&&photos!==artworks?'收藏':'分类照片')+'.zip');$('#announcement').textContent='照片 ZIP 已开始下载';$('#download-status').textContent='照片 ZIP 已开始下载';
 }catch{$('#announcement').textContent='下载失败，请重试。';$('#download-status').textContent='下载失败，请重试。';$('#library-message').textContent='打包失败，请重试。';}
 finally{busy=false;button.disabled=false;button.textContent=label;$('#library-zip').disabled=!prepared.length;}
}
$('#library-zip').onclick=()=>saveZip(items);
window.addEventListener('resize',update);update();

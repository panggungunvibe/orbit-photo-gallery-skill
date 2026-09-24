import { categories } from '../src/categories.js';
const titles=categories.map(c=>c.title?.trim());
if(categories.length<5||categories.some(c=>!c.photos?.length)||titles.some(t=>!t)||new Set(titles).size!==titles.length){
 console.error('网盘素材不足以组成至少 5 个非空且不同的分类，请补充不同场景或类型的照片后再整理。不要重复用图或硬拆分类。');process.exit(1);
}
console.log(`分类检查通过：${categories.length} 类。`);

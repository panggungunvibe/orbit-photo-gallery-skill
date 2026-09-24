import { artworks } from './artworks.js';
export const categories = [...new Set(artworks.map(p=>p.group))].map(id=>{
 const photos=artworks.filter(p=>p.group===id),cover=photos.find(p=>p.cover)||photos[0];
 photos.sort((a,b)=>Number(b===cover)-Number(a===cover));
 return {id,title:cover.category,note:'把喜欢的瞬间，留在这一页。',photos,image:cover.image,alt:cover.alt,category:`${photos.length} 张回忆`};
});

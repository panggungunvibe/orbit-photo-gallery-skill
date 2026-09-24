#!/usr/bin/env python3
"""Validate a curated manifest and export portrait WebP plus gallery data."""
from pathlib import Path
import argparse,json,re,hashlib,tempfile,shutil
from PIL import Image
from photo_io import open_photo

def slug(value):
    if not isinstance(value,str) or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,63}',value):raise ValueError(f'Invalid id: {value!r}')
    return value

def run(manifest,project=None,check_only=False):
    manifest=manifest.resolve();project=project.resolve() if project else None;data=json.loads(manifest.read_text(encoding='utf8'))
    if not check_only and (project is None or not (project/'src/main.js').is_file()):raise ValueError('Project must be an existing scaffolded Orbit template.')
    categories=data['categories'];photos=data['photos']
    if not categories or not photos:raise ValueError('Categories and photos cannot be empty.')
    groups={slug(c['id']):c for c in categories}
    if len(groups)!=len(categories):raise ValueError('Duplicate category id.')
    for c in categories:
        if not isinstance(c.get('title'),str) or not c['title'].strip():raise ValueError('Category title is required.')
    if len(groups)<5:
        raise ValueError('网盘素材不足以自然形成至少 5 类，请补充不同场景或类型的照片后再整理；不要硬拆类别或重复用图凑数。')
    titles=[c['title'].strip() for c in categories]
    if len(set(titles))!=len(titles):raise ValueError('Category titles must be distinct; do not split one category to meet the minimum.')
    for group in groups:
        if not any(photo.get('group')==group for photo in photos):raise ValueError(f'Empty category: {group}')
    seen_ids=set();seen_pixels=set();arts=[]
    with tempfile.TemporaryDirectory() as temp:
        temp=Path(temp)
        for photo in photos:
            ident=slug(photo['id']);group=photo['group']
            if ident in seen_ids:raise ValueError(f'Duplicate photo id: {ident}')
            if group not in groups:raise ValueError(f'Unknown category: {group}')
            seen_ids.add(ident)
            for field in ['title','description']:
                if not isinstance(photo.get(field),str) or not photo[field].strip():raise ValueError(f'{ident}: {field} is required.')
            source=Path(photo['path']).expanduser()
            if not source.is_absolute():source=manifest.parent/source
            im=open_photo(source);digest=hashlib.sha256(f'{im.size}'.encode()+im.tobytes()).hexdigest()
            if digest in seen_pixels:raise ValueError(f'Duplicate image content: {ident}; choose a single category.')
            seen_pixels.add(digest)
            if 'crop' in photo:
                box=photo['crop']
                if len(box)!=4 or not 0<=box[0]<box[2]<=1 or not 0<=box[1]<box[3]<=1:raise ValueError(f'{ident}: crop must be normalized [left,top,right,bottom].')
                im=im.crop((round(box[0]*im.width),round(box[1]*im.height),round(box[2]*im.width),round(box[3]*im.height)))
            if im.height<=im.width:raise ValueError(f'{ident}: landscape/square image; exclude it or supply a reviewed portrait crop.')
            im.thumbnail((1800,1800));clean=Image.new('RGB',im.size);clean.paste(im)
            filename=f'{ident}-{digest[:8]}.webp';clean.save(temp/filename,quality=88,method=6)
            arts.append(dict(id=ident,title=photo['title'],description=photo['description'],group=group,category=groups[group]['title'],year=photo.get('year',''),alt=photo.get('alt',photo['title']),image='/photos/'+filename,width=clean.width,height=clean.height,cover=bool(photo.get('cover',False)),copySource='User supplied photograph'))
        for group in groups:
            subset=[a for a in arts if a['group']==group]
            if not subset:raise ValueError(f'Empty category: {group}')
            if sum(a['cover'] for a in subset)>1:raise ValueError(f'Multiple covers for {group}')
        if check_only:
            print(f'Preflight passed: {len(arts)} unique portrait photos in {len(groups)} nonempty categories. No project files written.')
            return
        # No project writes occur until the complete selection has passed validation.
        target=project/'public/photos';target.mkdir(parents=True,exist_ok=True)
        for file in temp.iterdir():shutil.copy2(file,target/file.name)
        (project/'src/artworks.js').write_text('export const artworks = '+json.dumps(arts,ensure_ascii=False,indent=2)+';\n',encoding='utf8')
        definitions=[{'id':c['id'],'title':c['title'],'note':c.get('note','')} for c in categories]
        code="import { artworks } from './artworks.js';\nconst definitions = "+json.dumps(definitions,ensure_ascii=False)+";\n"+'''export const categories=definitions.map(c=>{
 const photos=artworks.filter(p=>p.group===c.id),cover=photos.find(p=>p.cover)||photos[0];
 photos.sort((a,b)=>Number(b===cover)-Number(a===cover));
 return {...c,photos,image:cover.image,alt:cover.alt,category:`${photos.length} 张回忆`};
});
'''
        (project/'src/categories.js').write_text(code,encoding='utf8')
    print(f'Imported {len(arts)} unique photos into {len(groups)} categories. Originals unchanged.')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('manifest',type=Path);p.add_argument('--project',type=Path);p.add_argument('--check',action='store_true',help='Validate before creating a website; no project files are written.');a=p.parse_args()
    try:run(a.manifest,a.project,check_only=a.check)
    except (ValueError,KeyError,OSError,RuntimeError) as e:p.exit(1,f'Import failed: {e}\n')
if __name__=='__main__':main()

#!/usr/bin/env python3
"""Create indexed contact sheets and an inventory for human/agent visual selection."""
from pathlib import Path
import argparse,json,hashlib
from PIL import Image,ImageDraw
from photo_io import open_photo,EXTENSIONS

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
    source=a.source.expanduser().resolve();output=a.output.expanduser().resolve()
    if not source.is_dir():p.error('Source must be a photo directory.')
    if output==source or source in output.parents:p.error('Keep review output outside the source directory.')
    if output.exists() and any(output.iterdir()):p.error('Review output must be empty.')
    files=sorted(x for x in source.rglob('*') if x.is_file() and x.suffix.lower() in EXTENSIONS)
    output.mkdir(parents=True,exist_ok=True);rows=[];hashes={};sheet=None
    for i,path in enumerate(files):
        if i%12==0:sheet=Image.new('RGB',(1000,900),'#f7f6f2')
        row={'index':i,'source':str(path),'filename':path.name}
        try:
            im=open_photo(path);digest=hashlib.sha256(f'{im.size}'.encode()+im.tobytes()).hexdigest()
            row.update(width=im.width,height=im.height,portrait=im.height>im.width,duplicate_of=hashes.get(digest))
            hashes.setdefault(digest,i);im.thumbnail((235,260));sheet.paste(im,((i%4)*250+(250-im.width)//2,((i%12)//4)*300))
        except Exception as e:row['error']=str(e)
        ImageDraw.Draw(sheet).text(((i%4)*250+8,((i%12)//4)*300+270),f'{i:04} | '+('ERROR' if 'error' in row else f'{row["width"]} x {row["height"]}'),fill='#444')
        rows.append(row)
        if i%12==11 or i==len(files)-1:sheet.save(output/f'contact-{i//12:03}.jpg',quality=90)
    (output/'inventory.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
    print(f'{len(rows)} photos inventoried; {sum("error" in r for r in rows)} errors. Review every sheet, then inspect shortlisted originals.')
if __name__=='__main__':main()

"""Read photographs without changing their source files."""
from pathlib import Path
import subprocess,sys,tempfile
from PIL import Image,ImageOps
EXTENSIONS={'.jpg','.jpeg','.png','.webp','.heic','.heif','.tif','.tiff'}
def open_photo(path):
    path=Path(path)
    if path.suffix.lower() in {'.heic','.heif'}:
        try:
            import pillow_heif
            pillow_heif.register_heif_opener()
        except ImportError:
            if sys.platform!='darwin':raise RuntimeError('HEIC requires pillow-heif: python -m pip install pillow-heif')
            with tempfile.TemporaryDirectory() as tmp:
                converted=Path(tmp)/'converted.png'
                subprocess.run(['sips','-s','format','png',str(path),'--out',str(converted)],check=True,stdout=subprocess.DEVNULL)
                with Image.open(converted) as im:return ImageOps.exif_transpose(im).convert('RGB')
    with Image.open(path) as im:return ImageOps.exif_transpose(im).convert('RGB')

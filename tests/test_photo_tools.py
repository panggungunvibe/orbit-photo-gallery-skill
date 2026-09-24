import unittest,tempfile,json,subprocess,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
class PhotoTools(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.project=self.root/'album'
        self.call('scaffold.py',self.project)
    def tearDown(self):self.tmp.cleanup()
    def call(self,name,*args,ok=True):
        result=subprocess.run([sys.executable,str(ROOT/'scripts'/name),*map(str,args)],capture_output=True,text=True)
        if ok:self.assertEqual(result.returncode,0,result.stderr)
        else:self.assertNotEqual(result.returncode,0)
        return result
    def manifest(self,photos):
        path=self.root/'selection.json';path.write_text(json.dumps({'categories':[{'id':'one','title':'照片'}],'photos':photos}));return path
    def photo(self,filename='one.jpg',color='red',size=(80,120)):
        path=self.root/filename;Image.new('RGB',size,color).save(path);return path
    def item(self,path,ident='one',**extra):return dict(id=ident,path=str(path),group='one',title='一张照片',description='A carefully reviewed photograph.',**extra)
    def test_scaffold_does_not_overwrite(self):
        sentinel=self.project/'keep.txt';sentinel.write_text('keep');self.call('scaffold.py',self.project,ok=False);self.assertEqual(sentinel.read_text(),'keep')
    def test_import_orientation_metadata_and_source_preservation(self):
        path=self.root/'oriented.jpg';im=Image.new('RGB',(120,80),'red');exif=im.getexif();exif[274]=6;exif[315]='Private Photographer';im.save(path,exif=exif)
        original=path.read_bytes();self.call('import_photos.py',self.manifest([self.item(path)]),'--project',self.project)
        image=Image.open(next((self.project/'public/photos').glob('*.webp')));self.assertGreater(image.height,image.width);self.assertFalse(image.getexif());self.assertEqual(path.read_bytes(),original);image.close()
        source=(self.project/'src/artworks.js').read_text();self.assertNotIn(str(self.root),source);self.assertNotIn('Private Photographer',source)
    def test_duplicate_rejected_before_project_writes(self):
        p=self.photo();before=(self.project/'src/artworks.js').read_bytes();self.call('import_photos.py',self.manifest([self.item(p),self.item(p,'two')]),'--project',self.project,ok=False)
        self.assertEqual((self.project/'src/artworks.js').read_bytes(),before);self.assertFalse((self.project/'public/photos').exists())
    def test_horizontal_requires_reviewed_crop(self):
        p=self.photo(size=(160,100));self.call('import_photos.py',self.manifest([self.item(p)]),'--project',self.project,ok=False)
        self.call('import_photos.py',self.manifest([self.item(p,crop=[.3,0,.7,1])]),'--project',self.project)
        image=Image.open(next((self.project/'public/photos').glob('*.webp')));self.assertGreater(image.height,image.width);image.close()
    def test_review_reports_exact_duplicates(self):
        source=self.root/'input';source.mkdir();Image.new('RGB',(80,120),'green').save(source/'a.png');(source/'b.png').write_bytes((source/'a.png').read_bytes())
        output=self.root/'review';self.call('review_photos.py',source,output);rows=json.loads((output/'inventory.json').read_text());self.assertEqual(rows[1]['duplicate_of'],0);self.assertTrue((output/'contact-000.jpg').exists())
if __name__=='__main__':unittest.main()

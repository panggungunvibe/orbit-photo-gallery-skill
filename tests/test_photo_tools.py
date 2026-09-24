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
    def manifest(self,photos,fill=True):
        photos=list(photos);categories=[{'id':'one','title':'照片'}]
        if fill:
            for i,color in enumerate(['blue','green','yellow','purple'],2):
                group=f'group-{i}';categories.append({'id':group,'title':f'Category {i}'})
                item=self.item(self.photo(f'extra-{i}.png',color),f'extra-{i}');item['group']=group;photos.append(item)
        path=self.root/'selection.json';path.write_text(json.dumps({'categories':categories,'photos':photos}));return path
    def photo(self,filename='one.jpg',color='red',size=(80,120)):
        path=self.root/filename;Image.new('RGB',size,color).save(path);return path
    def item(self,path,ident='one',**extra):return dict(id=ident,path=str(path),group='one',title='一张照片',description='A carefully reviewed photograph.',**extra)
    def test_scaffold_does_not_overwrite(self):
        sentinel=self.project/'keep.txt';sentinel.write_text('keep');self.call('scaffold.py',self.project,ok=False);self.assertEqual(sentinel.read_text(),'keep')
    def test_import_orientation_metadata_and_source_preservation(self):
        path=self.root/'oriented.jpg';im=Image.new('RGB',(120,80),'red');exif=im.getexif();exif[274]=6;exif[315]='Private Photographer';im.save(path,exif=exif)
        original=path.read_bytes();self.call('import_photos.py',self.manifest([self.item(path)]),'--project',self.project)
        image=Image.open(next((self.project/'public/photos').glob('one-*.webp')));self.assertGreater(image.height,image.width);self.assertFalse(image.getexif());self.assertEqual(path.read_bytes(),original);image.close()
        source=(self.project/'src/artworks.js').read_text();self.assertNotIn(str(self.root),source);self.assertNotIn('Private Photographer',source)
    def test_duplicate_rejected_before_project_writes(self):
        p=self.photo();before=(self.project/'src/artworks.js').read_bytes();result=self.call('import_photos.py',self.manifest([self.item(p),self.item(p,'two')]),'--project',self.project,ok=False);self.assertIn('Duplicate image content',result.stderr)
        self.assertEqual((self.project/'src/artworks.js').read_bytes(),before);self.assertFalse((self.project/'public/photos').exists())
    def test_horizontal_requires_reviewed_crop(self):
        p=self.photo(size=(160,100));self.call('import_photos.py',self.manifest([self.item(p)]),'--project',self.project,ok=False)
        self.call('import_photos.py',self.manifest([self.item(p,crop=[.3,0,.7,1])]),'--project',self.project)
        image=Image.open(next((self.project/'public/photos').glob('one-*.webp')));self.assertGreater(image.height,image.width);image.close()
    def test_preflight_accepts_five_without_writing_project(self):
        before=(self.project/'src/artworks.js').read_bytes()
        result=self.call('import_photos.py',self.manifest([self.item(self.photo())]),'--check')
        self.assertIn('5 nonempty categories',result.stdout);self.assertFalse((self.project/'public/photos').exists());self.assertEqual(before,(self.project/'src/artworks.js').read_bytes())
    def test_below_five_blocks_preflight_and_import_without_changes(self):
        manifest=self.manifest([self.item(self.photo())],fill=False);before=(self.project/'src/artworks.js').read_bytes()
        for args in [('--check',),('--project',self.project)]:
            result=self.call('import_photos.py',manifest,*args,ok=False);self.assertIn('至少 5 类',result.stderr)
        self.assertFalse((self.project/'public/photos').exists());self.assertEqual(before,(self.project/'src/artworks.js').read_bytes())
    def test_empty_or_duplicate_named_categories_cannot_fill_minimum(self):
        manifest=self.manifest([self.item(self.photo())]);data=json.loads(manifest.read_text());data['photos'].pop();manifest.write_text(json.dumps(data))
        result=self.call('import_photos.py',manifest,'--check',ok=False);self.assertIn('Empty category',result.stderr)
        data['categories'][1]['title']=data['categories'][0]['title'];manifest.write_text(json.dumps(data))
        result=self.call('import_photos.py',manifest,'--check',ok=False);self.assertIn('titles must be distinct',result.stderr)
    def expanded_manifest(self,count):
        path=self.manifest([self.item(self.photo())]);data=json.loads(path.read_text())
        for i in range(6,count+1):
            group=f'group-{i}';data['categories'].append({'id':group,'title':f'Category {i}'})
            item=self.item(self.photo(f'extra-{i}.png',(i*17,30,90)),f'extra-{i}');item['group']=group;data['photos'].append(item)
        path.write_text(json.dumps(data));return path
    def test_ten_categories_accepted_by_preflight_and_import(self):
        manifest=self.expanded_manifest(10)
        self.call('import_photos.py',manifest,'--check');self.call('import_photos.py',manifest,'--project',self.project)
        self.assertEqual(len(list((self.project/'public/photos').glob('*.webp'))),10)
    def test_eleven_categories_rejected_before_any_project_changes(self):
        manifest=self.expanded_manifest(11);before=(self.project/'src/artworks.js').read_bytes()
        for args in [('--check',),('--project',self.project)]:
            result=self.call('import_photos.py',manifest,*args,ok=False);self.assertIn('最多 10 类',result.stderr)
        self.assertFalse((self.project/'public/photos').exists());self.assertEqual(before,(self.project/'src/artworks.js').read_bytes())
    def test_build_guard_category_boundaries(self):
        for count in [4,5,10,11]:
            categories=[dict(title=f'Category {i}',photos=[dict(id=str(i))]) for i in range(count)]
            (self.project/'src/categories.js').write_text('export const categories='+json.dumps(categories)+';')
            result=subprocess.run(['node','scripts/check-categories.mjs'],cwd=self.project,capture_output=True,text=True)
            self.assertEqual(result.returncode==0,5<=count<=10,result.stderr)
    def test_review_reports_exact_duplicates(self):
        source=self.root/'input';source.mkdir();Image.new('RGB',(80,120),'green').save(source/'a.png');(source/'b.png').write_bytes((source/'a.png').read_bytes())
        output=self.root/'review';self.call('review_photos.py',source,output);rows=json.loads((output/'inventory.json').read_text());self.assertEqual(rows[1]['duplicate_of'],0);self.assertTrue((output/'contact-000.jpg').exists())
if __name__=='__main__':unittest.main()

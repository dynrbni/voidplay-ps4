# SPDX-License-Identifier: GPL-3.0-only
"""Bake local, reviewed artwork/font assets. No network access at build time."""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw, ImageFont, ImageOps
from icon_assets import icons

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]


def emit_bytes(output, name, data):
    output.write('static const unsigned char '+name+'[] =\n')
    for at in range(0, len(data), 128):
        output.write('"'+''.join('\\x%02x'%b for b in data[at:at+128])+'"\n')
    output.write(';\n')


def prepare():
    assets=ROOT/'apps/voidplay/assets'
    font_path=assets/'Manrope.ttf'
    font=ImageFont.truetype(str(font_path),64)
    font.set_variation_by_axes([600])
    atlas=Image.new('L',(80*95,96))
    draw=ImageDraw.Draw(atlas)
    advances=[]
    for i in range(95):
        value=chr(32+i)
        draw.text((i*80,48),value,font=font,fill=255,anchor='ls')
        advances.append(round(font.getlength(value)))
    metadata=json.loads((assets/'manifest.json').read_text())
    if len(metadata['covers'])>24:raise ValueError('At most 24 reviewed cover assets can be bundled.')
    images=[('backdrop',REPO/'public/art/orbit-workshop-hero.webp',(1280,720))]
    for item in metadata['covers'].values():
        path=(assets/item['file']).resolve()
        if not path.is_relative_to(assets.resolve()) or not re.fullmatch('[a-z0-9-]{1,80}',item['asset']):raise ValueError('Invalid local image asset.')
        images.append((item['asset'],path,(360,450)))
        hero=(assets/item.get('heroFile',item['file'])).resolve()
        if not hero.is_relative_to(assets.resolve()):raise ValueError('Invalid local hero asset.')
        images.append((item['asset']+'-hero',hero,(1280,720)))
        for index,shot in enumerate(item.get('screenshots',[])):
            if not shot:continue
            shot_path=(assets/shot).resolve()
            if not shot_path.is_relative_to(assets.resolve()) or index>=12:raise ValueError('Invalid screenshot asset.')
            images.append((item['asset']+'-shot-'+str(index),shot_path,(1280,720)))
    build=ROOT/'build';build.mkdir(exist_ok=True)
    if sum(size[0]*size[1]*2 for _,_,size in images)>64*1024*1024:raise ValueError('Native artwork exceeds the 64 MiB baked asset budget.')
    with (build/'media_assets.h').open('w') as output:
        emit_bytes(output,'font_atlas',atlas.tobytes())
        output.write('static const int font_advances[] = {'+','.join(map(str,advances))+'};\n')
        for i,(_,path,size) in enumerate(images):
            image=ImageOps.fit(Image.open(path).convert('RGB'),size)
            if i==0 or images[i][0].endswith('-hero'):
                pixels=image.load()
                for y in range(size[1]):
                    for x in range(size[0]):
                        factor=(0.10+0.90*(x/size[0])**2)*(1-0.98*(y/size[1])**2)
                        pixels[x,y]=tuple(round(c*factor) for c in pixels[x,y])
            packed=bytearray()
            raw=image.tobytes()
            for offset in range(0,len(raw),3):
                r,g,b=raw[offset:offset+3]
                value=((r>>3)<<11)|((g>>2)<<5)|(b>>3)
                packed.extend((value&255,value>>8))
            emit_bytes(output,'image_'+str(i),packed)
        baked_icons=icons()
        for name,icon_image in baked_icons:emit_bytes(output,name.replace('-','_'),icon_image.tobytes())
        output.write('static const BakedImage baked_images[] = {\n')
        for i,(name,_,size) in enumerate(images):
            output.write('{"%s",%d,%d,image_%d,false},\n'%(name,*size,i))
        for name,icon_image in baked_icons:output.write('{"%s",96,96,%s,true},\n'%(name,name.replace('-','_')))
        output.write('};\n')
    icon=Image.new('RGB',(512,512),'#090a0c');draw=ImageDraw.Draw(icon)
    logo=ImageFont.truetype(str(font_path),86);logo.set_variation_by_axes([800])
    label='voidplay.';box=draw.textbbox((0,0),label,font=logo)
    draw.text(((512-box[2])/2,220),label,font=logo,fill='white',anchor='lt')
    icon.save(build/'voidplay-icon.png')
    print('Baked Manrope atlas, original backdrop, catalog cover and voidplay. icon.')


if __name__=='__main__':
    prepare()

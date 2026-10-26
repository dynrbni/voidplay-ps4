# SPDX-License-Identifier: GPL-3.0-only
"""Bake local, reviewed artwork/font assets. No network access at build time."""
from pathlib import Path
import json
import re
from PIL import Image, ImageDraw, ImageFont, ImageOps

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
    build=ROOT/'build';build.mkdir(exist_ok=True)
    with (build/'media_assets.h').open('w') as output:
        emit_bytes(output,'font_atlas',atlas.tobytes())
        output.write('static const int font_advances[] = {'+','.join(map(str,advances))+'};\n')
        for i,(_,path,size) in enumerate(images):
            image=ImageOps.fit(Image.open(path).convert('RGB'),size)
            if i==0:
                pixels=image.load()
                for y in range(size[1]):
                    for x in range(size[0]):
                        factor=(0.12+0.46*x/size[0])*(1-0.9*(y/size[1])**2)
                        pixels[x,y]=tuple(round(c*factor) for c in pixels[x,y])
            packed=bytearray()
            raw=image.tobytes()
            for offset in range(0,len(raw),3):
                r,g,b=raw[offset:offset+3]
                value=((r>>3)<<11)|((g>>2)<<5)|(b>>3)
                packed.extend((value&255,value>>8))
            emit_bytes(output,'image_'+str(i),packed)
        output.write('static const BakedImage baked_images[] = {\n')
        for i,(name,_,size) in enumerate(images):
            output.write('{"%s",%d,%d,image_%d},\n'%(name,*size,i))
        output.write('};\n')
    icon=Image.new('RGB',(512,512),'#090a0c');draw=ImageDraw.Draw(icon)
    logo=ImageFont.truetype(str(font_path),86);logo.set_variation_by_axes([800])
    label='voidplay.';box=draw.textbbox((0,0),label,font=logo)
    draw.text(((512-box[2])/2,220),label,font=logo,fill='white',anchor='lt')
    icon.save(build/'voidplay-icon.png')
    print('Baked Manrope atlas, original backdrop, catalog cover and voidplay. icon.')


if __name__=='__main__':
    prepare()

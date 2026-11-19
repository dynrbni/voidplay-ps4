# SPDX-License-Identifier: GPL-3.0-only
"""Bake display-sized text and full-color local artwork; never fetch at build time."""
from pathlib import Path
import json
import re
import hashlib
from PIL import Image, ImageDraw, ImageFont, ImageOps
from icon_assets import icons

ROOT=Path(__file__).resolve().parents[1]
REPO=ROOT.parents[1]
# The bundled Manrope file is a variable font whose real Weight axis spans 200..800.
# Every size below is baked exactly (the 01.04 display-size rule); requests above the
# ladder fall back to the nearest baked size, which the runtime diagnostics report.
FONT_FAMILY='Manrope'
FONT_WEIGHTS=[400,500,550,600,650,700,750,800]
FONT_CODES=json.loads((ROOT/'packages/core/font-coverage.json').read_text())
FONT_SIZES=[*range(7,49),56,60,64,66,70,72,84,96,112]


def font_plan():
    """Describe the baked typography so a test can check the ladder without PIL."""
    return {'family':FONT_FAMILY,'weights':list(FONT_WEIGHTS),'sizes':list(FONT_SIZES),
            'weightAxis':[200,800],'codepoints':FONT_CODES}


def font_sources(path):
    """Load the bundled font and fail loudly when a baked weight is unavailable."""
    path=Path(path)
    if not path.is_file():raise ValueError('Missing bundled font file: '+str(path))
    probe=ImageFont.truetype(str(path),24)
    axes={bytes(a['name']).decode():a for a in probe.get_variation_axes()}
    if 'Weight' not in axes:raise ValueError('Bundled font has no Weight variation axis: '+str(path))
    low,high=axes['Weight']['minimum'],axes['Weight']['maximum']
    for weight in FONT_WEIGHTS:
        if not low<=weight<=high:raise ValueError('Unsupported font weight %d (axis %d..%d)'%(weight,low,high))
    return low,high


def emit_bytes(output,name,data):
    output.write('alignas(16) static const unsigned char '+name+'[] =\n')
    for at in range(0,len(data),128):output.write('"'+''.join('\\x%02x'%b for b in data[at:at+128])+'"\n')
    output.write(';\n')


def font_metrics(path):
    """Real hhea ascent/descent, in per-mille of the em, for CSS half-leading parity."""
    probe=ImageFont.truetype(str(path),1000).font
    ascent=round(probe.ascent)
    descent=round(abs(probe.descent))
    if ascent<=0 or descent<=0 or ascent+descent>1600:raise ValueError('Unusable font vertical metrics: %d/%d'%(ascent,descent))
    return ascent,descent


def bake_fonts(output,path):
    """Bake one Manrope coverage atlas per (weight,size); never resample from a single cell.

    Glyph offsets are baked relative to the baseline, so the runtime can place a
    line box the way CSS does (half-leading from the real font metrics).
    """
    axis_low,axis_high=font_sources(path)
    ascent,descent=font_metrics(path)
    records=[]
    for weight in FONT_WEIGHTS:
        for size in FONT_SIZES:
            font=ImageFont.truetype(str(path),size);font.set_variation_by_axes([weight])
            pixels=bytearray();glyphs=[]
            for code in FONT_CODES:
                value=chr(code);left,top,right,bottom=font.getbbox(value,anchor='ls')
                w=max(1,right-left);h=max(1,bottom-top)
                image=Image.new('L',(w,h));ImageDraw.Draw(image).text((-left,-top),value,font=font,fill=255,anchor='ls')
                glyphs.append((w,h,left,top,round(font.getlength(value)*64),len(pixels)))
                pixels.extend(image.tobytes())
            prefix='font_%d_%d'%(weight,size)
            emit_bytes(output,prefix,pixels)
            output.write('static const BakedGlyph glyphs_%s[] = {\n'%prefix)
            for glyph in glyphs:output.write('{'+','.join(map(str,glyph))+'},\n')
            output.write('};\n')
            records.append({'weight':weight,'size':size,'glyphs':len(glyphs),'bytes':len(pixels),'prefix':prefix})
    output.write('static const unsigned int baked_codepoints[] = {%s};\n'%','.join(str(c) for c in FONT_CODES))
    output.write('static const BakedFont baked_fonts[] = {\n')
    for record in records:
        output.write('{%d,%d,glyphs_%s,%s},\n'%(record['size'],record['weight'],record['prefix'],record['prefix']))
    output.write('};\n')
    output.write('static const int baked_font_weights[] = {%s};\n'%','.join(str(w) for w in FONT_WEIGHTS))
    output.write('static const int baked_font_sizes[] = {%s};\n'%','.join(str(s) for s in FONT_SIZES))
    output.write('static const char media_font_family_text[] = "%s";\n'%FONT_FAMILY)
    output.write('static const int media_font_ascent_pm = %d;\n'%ascent)
    output.write('static const int media_font_descent_pm = %d;\n'%descent)
    return records,axis_low,axis_high,(ascent,descent)


def shade(image):
    width,height=image.size
    horizontal=Image.new('L',(width,1));horizontal.putdata([round(255*(.08+.92*(x/width)**2)) for x in range(width)])
    vertical=Image.new('L',(1,height));vertical.putdata([round(255*(1-.98*(y/height)**2)) for y in range(height)])
    from PIL import ImageChops
    mask=ImageChops.multiply(horizontal.resize(image.size),vertical.resize(image.size))
    return Image.composite(image,Image.new('RGB',image.size,'#050505'),mask)


def render_hero(cover,source):
    landscape=source.width>=1280 and source.height>=720 and source.width/source.height>=1.45
    canvas=Image.new('RGB',(1920,1080),'#12151B')
    if landscape:
        artwork=source.copy();artwork.thumbnail((1920,1080),Image.Resampling.LANCZOS)
        region=(1920-artwork.width,0,artwork.width,artwork.height)
        canvas.paste(artwork,region[:2]);canvas=shade(canvas)
    else:
        canvas=shade(canvas);artwork=cover.copy();artwork.thumbnail((420,480),Image.Resampling.LANCZOS)
        region=(1420-artwork.width//2,360-artwork.height//2,artwork.width,artwork.height)
        canvas.paste(artwork,region[:2])
    return canvas,{'landscape':landscape,'sourceSize':list(source.size),'region':list(region),'enlarged':False}


def prepare():
    assets=ROOT/'apps/voidplay/assets';font_path=assets/'Manrope.ttf'
    metadata=json.loads((assets/'manifest.json').read_text());quality=[]
    if len(metadata['covers'])>24:raise ValueError('At most 24 reviewed artwork sets can be bundled.')
    def local(name):
        path=(assets/name).resolve()
        if not path.is_relative_to(assets.resolve()) or not path.is_file():raise ValueError('Invalid local artwork asset: '+name)
        return path
    backdrop=shade(Image.new('RGB',(1920,1080),'#12151B'))
    images=[('backdrop',backdrop,False)]
    for entry_id,item in metadata['covers'].items():
        asset=item['asset']
        if not re.fullmatch('[a-z0-9-]{1,80}',asset):raise ValueError('Invalid baked asset identifier.')
        with Image.open(local(item['file'])) as original:
            cover=ImageOps.exif_transpose(original).convert('RGB');source_size=cover.size
        cover.thumbnail((640,800),Image.Resampling.LANCZOS)
        images.append((asset,cover,False))
        with Image.open(local(item.get('heroFile',item['file']))) as original:hero=ImageOps.exif_transpose(original).convert('RGB')
        hero,report=render_hero(cover,hero)
        images.append((asset+'-hero',hero,False))
        quality.append({'id':entry_id,'coverSource':source_size,'hero':report,'heroOutput':[1920,1080],'pixelFormat':'ARGB8888','fallback':'none' if report['landscape'] else 'contained source-sized cover; no fullscreen poster enlargement'})
        for index,shot in enumerate(item.get('screenshots',[])):
            if not shot:continue
            if index>=12:raise ValueError('Too many screenshots.')
            with Image.open(local(shot)) as original:image=ImageOps.exif_transpose(original).convert('RGB')
            image.thumbnail((1920,1080),Image.Resampling.LANCZOS);images.append((asset+'-shot-'+str(index),image,False))
    images.extend((name,image,True) for name,image in icons())
    wordmark=Image.new('RGBA',(184,48));logo_font=ImageFont.truetype(str(font_path),39);logo_font.set_variation_by_axes([800])
    ImageDraw.Draw(wordmark).text((0,4),'voidplay.',font=logo_font,fill='white',anchor='lt');images.append(('wordmark',wordmark,True))
    if sum(image.width*image.height*4 for _,image,_ in images)>96*1024*1024:raise ValueError('Native artwork exceeds the 96 MiB ARGB asset budget.')
    build=ROOT/'build';build.mkdir(exist_ok=True)
    with (build/'media_assets.h').open('w') as output:
        records,axis_low,axis_high,metrics=bake_fonts(output,font_path)
        for i,(_,image,_) in enumerate(images):emit_bytes(output,'image_'+str(i),image.convert('RGBA').tobytes('raw','BGRA'))
        output.write('static const BakedImage baked_images[] = {\n')
        for i,(name,image,alpha) in enumerate(images):output.write('{"%s",%d,%d,image_%d,%s},\n'%(name,image.width,image.height,i,'true' if alpha else 'false'))
        output.write('};\n')
    (build/'artwork-quality.json').write_text(json.dumps(quality,indent=2)+'\n')
    (build/'font-report.json').write_text(json.dumps({'family':FONT_FAMILY,'weightAxis':[axis_low,axis_high],
        'weights':list(FONT_WEIGHTS),'sizes':list(FONT_SIZES),'atlases':records,
        'ascentPerMille':metrics[0],'descentPerMille':metrics[1],
        'glyphCoverage':FONT_CODES,'fontSha256':hashlib.sha256(font_path.read_bytes()).hexdigest(),'format':'Manrope variable TTF rasterized at build time; WOFF2 is not loaded on console','italic':'unsupported; not used by the store','unavailable':[]},indent=2)+'\n')
    icon=Image.new('RGB',(512,512),'#090a0c');draw=ImageDraw.Draw(icon)
    logo=ImageFont.truetype(str(font_path),86);logo.set_variation_by_axes([800]);label='voidplay.';box=draw.textbbox((0,0),label,font=logo)
    draw.text(((512-box[2])/2,220),label,font=logo,fill='white',anchor='lt');icon.save(build/'voidplay-icon.png')
    print('Baked Manrope at %d weights x %d display sizes (%d atlases) plus full-color ARGB artwork and the voidplay. icon.'%(len(FONT_WEIGHTS),len(FONT_SIZES),len(records)))
    print('Reports: build/font-report.json, build/artwork-quality.json')


if __name__=='__main__':prepare()

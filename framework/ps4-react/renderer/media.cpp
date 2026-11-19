// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "scene.hpp"
#include <cstdio>
#include <cstring>
#include <cstdlib>
namespace ps4react {
namespace {
struct BakedImage {const char* name;int w,h;const unsigned char* pixels;bool alpha;};
struct BakedGlyph {int w,h,x,y,advance,offset;};
struct BakedFont {int size;int weight;const BakedGlyph* glyphs;const unsigned char* pixels;};
#include "media_assets.h"
constexpr int bakedWeightCount=sizeof(baked_font_weights)/sizeof(int);
constexpr int bakedSizeCount=sizeof(baked_font_sizes)/sizeof(int);
constexpr int advanceScale=64;
int scale_int(int value,int numerator,int denominator){
 return value>=0?(value*numerator+denominator/2)/denominator:-((-value*numerator+denominator/2)/denominator);
}
std::uint32_t blend(std::uint32_t old,std::uint32_t color,unsigned alpha){
 if(alpha==255)return color|0xff000000;if(!alpha)return old;
 unsigned weight=alpha+1,inverse=256-weight;
 return 0xff000000|((((old&0xff00ff)*inverse+(color&0xff00ff)*weight)>>8)&0xff00ff)|((((old&0x00ff00)*inverse+(color&0x00ff00)*weight)>>8)&0x00ff00);
}
const BakedImage* find_image(const char* name){if(!name)return nullptr;for(const auto& image:baked_images)if(!std::strcmp(image.name,name))return &image;return nullptr;}
/* Nearest baked atlas: a requested weight is never silently replaced by another
   family, and a distance tie prefers the heavier weight the caller asked for. */
int nearest_weight(int weight){
 int best=baked_font_weights[0],distance=-1;
 for(int i=0;i<bakedWeightCount;++i){int d=baked_font_weights[i]-weight;if(d<0)d=-d;
  if(distance<0||d<distance||(d==distance&&baked_font_weights[i]>best)){best=baked_font_weights[i];distance=d;}}
 return best;
}
int nearest_size(int size){
 int best=baked_font_sizes[0],distance=-1;
 for(int i=0;i<bakedSizeCount;++i){int d=baked_font_sizes[i]-size;if(d<0)d=-d;
  if(distance<0||d<distance){best=baked_font_sizes[i];distance=d;}}
 return best;
}
const BakedFont* find_font(int size,int weight){
 int wanted=nearest_size(size),target=nearest_weight(weight);
 const BakedFont* fallback=&baked_fonts[0];
 for(const auto& font:baked_fonts){if(font.size==wanted&&font.weight==target)return &font;if(font.size==wanted)fallback=&font;}
 return fallback;
}
int line_height_for(const TextStyle& style){return style.lineHeight>0?style.lineHeight:style.size+8;}
/* CSS half-leading from the font's real hhea metrics: the visual band is centred
   inside the line box instead of being pinned to the box top. */
int line_baseline(int lineTop,int size,int lineHeight){
 return lineTop+lineHeight/2+((media_font_ascent_pm-media_font_descent_pm)*size+1000)/2000;
}
int glyph_index(unsigned code){
 int low=0,high=static_cast<int>(sizeof(baked_codepoints)/sizeof(unsigned))-1;
 while(low<=high){int mid=(low+high)/2;if(baked_codepoints[mid]==code)return mid;if(baked_codepoints[mid]<code)low=mid+1;else high=mid-1;}
 return '?' - 32;
}
struct AdvanceEngine {
 const BakedFont* font;int size,letterSpacing;
 int of(unsigned value) const {
  const BakedGlyph& glyph=font->glyphs[glyph_index(value)];
  return glyph.advance*size/font->size+letterSpacing*advanceScale;
 }
};
inline int pen_pixels(int pen){return (pen+advanceScale/2)/advanceScale;}
unsigned next_codepoint(const char*& at){
 const auto* p=reinterpret_cast<const unsigned char*>(at);unsigned first=*p++;if(first<128){at=reinterpret_cast<const char*>(p);return first;}
 int tail=first>=0xc2&&first<=0xdf?1:first>=0xe0&&first<=0xef?2:first>=0xf0&&first<=0xf4?3:0;
 if(!tail){at=reinterpret_cast<const char*>(p);return '?';}
 unsigned value=first&((1u<<(6-tail))-1);
 for(int i=0;i<tail;++i){if((p[i]&0xc0)!=0x80){at=reinterpret_cast<const char*>(p);return '?';}value=(value<<6)|(p[i]&63);}
 at=reinterpret_cast<const char*>(p+tail);return value;
}
int run_width(const char* text,int length,const AdvanceEngine& engine){
 int pen=0;const char* at=text;while(at<text+length)pen+=engine.of(next_codepoint(at));return pen_pixels(pen);
}
/* Measurement and rasterization use the same UTF-8 word wrapper. Oversized words
   break at a glyph boundary; trailing spaces do not change the painted width. */
template<class Emit>
void each_line(const char* value,const TextStyle& style,const AdvanceEngine& engine,Emit emit){
 const int limit=style.wrap;
 for(const char* paragraph=value;*paragraph;){
  if(*paragraph=='\n'){emit(paragraph,0,0);++paragraph;continue;}
  const char* end=paragraph;while(*end&&*end!='\n')++end;
  const char* cursor=paragraph;
  while(cursor<end){
   const char* at=cursor;const char* lastSpace=nullptr;int pen=0;
   while(at<end){const char* before=at;unsigned code=next_codepoint(at);int advance=engine.of(code);
    if(limit>0&&before>cursor&&pen_pixels(pen+advance)>limit){at=before;break;}
    if(code==' ')lastSpace=before;pen+=advance;
   }
   if(at<end&&lastSpace&&lastSpace>cursor)at=lastSpace;
   if(at==cursor)next_codepoint(at);
   const char* visible=at;while(visible>cursor&&visible[-1]==' ')--visible;
   emit(cursor,static_cast<int>(visible-cursor),run_width(cursor,static_cast<int>(visible-cursor),engine));
   cursor=at;while(cursor<end&&*cursor==' ')++cursor;
  }
  if(!*end)return;paragraph=end+1;
  if(!*paragraph)emit(paragraph,0,0);
 }
}
void measure_lines(const char* value,const TextStyle& style,const AdvanceEngine& engine,int& width,int& height){
 width=0;height=0;
 each_line(value,style,engine,[&](const char*,int,int lineWidth){
  if(lineWidth>width)width=lineWidth;
  height+=line_height_for(style);
 });
 if(height==0)height=line_height_for(style);
}
struct CachedImage {const BakedImage* source=nullptr;int w=0,h=0,fit=0;std::uint32_t* pixels=nullptr;std::size_t bytes=0;unsigned used=0;};
CachedImage cache[32];std::size_t cachedBytes=0;unsigned clock=0;
constexpr std::size_t cacheBudget=32*1024*1024;
std::uint32_t sample(const BakedImage& source,int x,int y,int w,int h,int fit){
 double scale=static_cast<double>(source.w)/w;if(fit==1?static_cast<double>(source.h)/h>scale:static_cast<double>(source.h)/h<scale)scale=static_cast<double>(source.h)/h;
 double fx=(source.w-w*scale)/2+(x+.5)*scale-.5,fy=(source.h-h*scale)/2+(y+.5)*scale-.5;
 if(fit==2){fx=(x+.5)*source.w/w-.5;fy=(y+.5)*source.h/h-.5;}
 if(fit==1&&(fx<-.5||fy<-.5||fx>source.w-.5||fy>source.h-.5))return 0;
 if(fx<0)fx=0;if(fy<0)fy=0;if(fx>source.w-1)fx=source.w-1;if(fy>source.h-1)fy=source.h-1;
 int sx=static_cast<int>(fx),sy=static_cast<int>(fy),nx=sx+1<source.w?sx+1:sx,ny=sy+1<source.h?sy+1:sy;
 unsigned ax=static_cast<unsigned>((fx-sx)*256),ay=static_cast<unsigned>((fy-sy)*256);
 const auto* pixels=reinterpret_cast<const std::uint32_t*>(source.pixels);
 std::uint32_t result=0;
 for(unsigned shift=0;shift<32;shift+=8){unsigned a=(pixels[sy*source.w+sx]>>shift)&255,b=(pixels[sy*source.w+nx]>>shift)&255,c=(pixels[ny*source.w+sx]>>shift)&255,d=(pixels[ny*source.w+nx]>>shift)&255;unsigned top=a*(256-ax)+b*ax,bottom=c*(256-ax)+d*ax;result|=((top*(256-ay)+bottom*ay)>>16)<<shift;}
 return result;
}
const std::uint32_t* resized(const BakedImage& source,int w,int h,int fit){
 if(w==source.w&&h==source.h)return reinterpret_cast<const std::uint32_t*>(source.pixels);
 for(auto& item:cache)if(item.source==&source&&item.w==w&&item.h==h&&item.fit==fit){item.used=++clock;return item.pixels;}
 std::size_t bytes=static_cast<std::size_t>(w)*h*4;if(bytes>cacheBudget/2)return nullptr;
 auto evict=[](){CachedImage* oldest=nullptr;for(auto& item:cache)if(item.pixels&&(!oldest||item.used<oldest->used))oldest=&item;if(oldest){cachedBytes-=oldest->bytes;std::free(oldest->pixels);*oldest=CachedImage{};}return oldest;};
 while(cachedBytes+bytes>cacheBudget)if(!evict())return nullptr;
 CachedImage* target=nullptr;for(auto& item:cache)if(!item.pixels){target=&item;break;}if(!target)target=evict();if(!target)return nullptr;
 target->pixels=static_cast<std::uint32_t*>(std::malloc(bytes));if(!target->pixels)return nullptr;
 target->fit=fit;target->source=&source;target->w=w;target->h=h;target->bytes=bytes;target->used=++clock;cachedBytes+=bytes;
 for(int y=0;y<h;++y)for(int x=0;x<w;++x)target->pixels[y*w+x]=sample(source,x,y,w,h,fit);
 return target->pixels;
}
}
bool has_image(const char* name){return find_image(name)!=nullptr;}
int media_image_count(){return static_cast<int>(sizeof(baked_images)/sizeof(BakedImage));}
const char* media_font_family(){return media_font_family_text;}
int media_font_report(char* output,std::size_t capacity){
 if(!output||capacity<2)return 0;
 int written=std::snprintf(output,capacity,"%s: %d baked weights x %d baked display sizes (%d atlases), ascent %d/descent %d per mille, %d baked images; Latin-1/store punctuation; unsupported glyphs report a fallback",
  media_font_family_text,bakedWeightCount,bakedSizeCount,bakedWeightCount*bakedSizeCount,media_font_ascent_pm,media_font_descent_pm,media_image_count());
 if(written<0)return 0;
 return written<static_cast<int>(capacity)?written:static_cast<int>(capacity)-1;
}
void rounded_box(Canvas frame,int x,int y,int w,int h,std::uint32_t color,int radius,Clip clip){
 if(!frame.valid()||w<=0||h<=0||w>8192||h>8192||x<-16384||x>16384||y<-16384||y>16384||!(color>>24))return;
 if(radius<0)radius=0;if(radius>w/2)radius=w/2;if(radius>h/2)radius=h/2;
 int top=y<0?0:y,bottom=y+h>frame.h?frame.h:y+h;
 if(clipped(clip)){if(top<clip.y)top=clip.y;if(bottom>clip.y+clip.h)bottom=clip.y+clip.h;}
 for(int py=top;py<bottom;++py){
  int inset=0,local=py-y,dy=local<radius?radius-local-1:local>=h-radius?local-(h-radius):0;
  if(dy)while(inset<radius&&(radius-inset-1)*(radius-inset-1)+dy*dy>radius*radius)++inset;
  int left=x+inset,right=x+w-inset;
  if(left<0)left=0;if(right>frame.w)right=frame.w;
  if(clipped(clip)){if(left<clip.x)left=clip.x;if(right>clip.x+clip.w)right=clip.x+clip.w;}
  auto* row=frame.pixels+py*frame.stride;
  if((color>>24)==255){for(int px=left;px<right;++px)row[px]=color;}
  else for(int px=left;px<right;++px)row[px]=blend(row[px],color,color>>24);
 }
}
/* One row's horizontal inset inside a rounded rectangle: the outermost column
   that still lies within the corner arc. Shared by fill and stroke so both use
   exactly the same shape. */
static int row_inset(int local,int length,int radius){
 if(radius<=0)return 0;
 int dy=local<radius?radius-local-1:local>=length-radius?local-(length-radius):0;
 if(!dy)return 0;
 int inset=0;
 while(inset<radius&&(radius-inset-1)*(radius-inset-1)+dy*dy>radius*radius)++inset;
 return inset;
}
/* Drawn as a real ring: the band between the outer rounded rectangle and the
   inset one, so a focus or card border never fills its own interior. */
void rounded_stroke(Canvas frame,int x,int y,int w,int h,int stroke,std::uint32_t color,int radius,Clip clip){
 if(!frame.valid()||w<=0||h<=0||stroke<=0||stroke*2>=w||stroke*2>=h||w>8192||h>8192||x<-16384||x>16384||y<-16384||y>16384||!(color>>24))return;
 if(radius<0)radius=0;if(radius>w/2)radius=w/2;if(radius>h/2)radius=h/2;
 int innerRadius=radius-stroke;if(innerRadius<0)innerRadius=0;
 int innerHeight=h-stroke*2;
 int top=y<0?0:y,bottom=y+h>frame.h?frame.h:y+h;
 if(clipped(clip)){if(top<clip.y)top=clip.y;if(bottom>clip.y+clip.h)bottom=clip.y+clip.h;}
 for(int py=top;py<bottom;++py){
  int local=py-y,inset=row_inset(local,h,radius);
  int spans[2][2]={{x+inset,x+w-inset},{0,0}};int spanCount=1;
  int innerLocal=local-stroke;
  if(innerLocal>=0&&innerLocal<innerHeight){
   int innerInset=stroke+row_inset(innerLocal,innerHeight,innerRadius);
   spans[0][1]=x+innerInset;spans[1][0]=x+w-innerInset;spans[1][1]=x+w-inset;spanCount=2;
  }
  auto* row=frame.pixels+py*frame.stride;
  for(int span=0;span<spanCount;++span){
   int left=spans[span][0],right=spans[span][1];
   if(left<0)left=0;if(right>frame.w)right=frame.w;
   if(clipped(clip)){if(left<clip.x)left=clip.x;if(right>clip.x+clip.w)right=clip.x+clip.w;}
   for(int px=left;px<right;++px)row[px]=blend(row[px],color,color>>24);
  }
 }
}
bool image(Canvas frame,int x,int y,int w,int h,const char* name,Clip clip,int fit){
 if(!frame.valid()||w<=0||h<=0||w>8192||h>8192||x<-16384||x>16384||y<-16384||y>16384)return false;
 const BakedImage* source=find_image(name);if(!source)return false;
 int left=x<0?0:x,top=y<0?0:y,right=x+w>frame.w?frame.w:x+w,bottom=y+h>frame.h?frame.h:y+h;
 if(clipped(clip)){if(left<clip.x)left=clip.x;if(top<clip.y)top=clip.y;if(right>clip.x+clip.w)right=clip.x+clip.w;if(bottom>clip.y+clip.h)bottom=clip.y+clip.h;}
 if(left>=right||top>=bottom)return true;
 const auto* pixels=resized(*source,w,h,fit);
 for(int py=top;py<bottom;++py){auto* row=frame.pixels+py*frame.stride;
  if(pixels&&!source->alpha&&fit!=1){std::memcpy(row+left,pixels+(py-y)*w+left-x,(right-left)*4);continue;}
  for(int px=left;px<right;++px){auto value=pixels?pixels[(py-y)*w+px-x]:sample(*source,px-x,py-y,w,h,fit);row[px]=(source->alpha||fit==1)?blend(row[px],value,value>>24):value;}
 }return true;
}
void text_extent(const char* value,const TextStyle& style,int& w,int& h){
 if(!value||style.size<7||style.size>112){w=0;h=0;return;}
 const BakedFont* font=find_font(style.size,style.weight);
 AdvanceEngine engine{font,style.size,style.letterSpacing};
 measure_lines(value,style,engine,w,h);
}
bool font_text(Canvas frame,int x,int y,const char* value,const TextStyle& style,std::uint32_t color,Clip clip){
 if(!frame.valid()||!value||style.size<7||style.size>112)return false;
 const BakedFont* font=find_font(style.size,style.weight);
 AdvanceEngine engine{font,style.size,style.letterSpacing};
 const int size=style.size,lineHeight=line_height_for(style);
 int lineIndex=0;
 each_line(value,style,engine,[&](const char* line,int length,int){
  const int baseline=line_baseline(y+lineIndex*lineHeight,size,lineHeight);
  int pen=0;
  const char* cursor=line;while(cursor<line+length){
   unsigned character=next_codepoint(cursor);
   const BakedGlyph& glyph=font->glyphs[glyph_index(character)];
   const int origin=x+pen_pixels(pen);
   int gx=origin+scale_int(glyph.x,size,font->size),gy=baseline+scale_int(glyph.y,size,font->size);
   int width=scale_int(glyph.w,size,font->size),height=scale_int(glyph.h,size,font->size);
   int top=gy,left=gx,bottom=gy+height,right=gx+width;
   if(top<0)top=0;if(left<0)left=0;if(bottom>frame.h)bottom=frame.h;if(right>frame.w)right=frame.w;
   if(clipped(clip)){if(top<clip.y)top=clip.y;if(left<clip.x)left=clip.x;if(bottom>clip.y+clip.h)bottom=clip.y+clip.h;if(right>clip.x+clip.w)right=clip.x+clip.w;}
   for(int py=top;py<bottom;++py){auto* row=frame.pixels+py*frame.stride;const auto* mask=font->pixels+glyph.offset+(py-gy)*font->size/size*glyph.w;
    if(size==font->size)for(int px=left;px<right;++px){unsigned alpha=(mask[px-gx]*(color>>24)+127)/255;if(alpha)row[px]=blend(row[px],color,alpha);}
    else for(int px=left;px<right;++px){unsigned alpha=(mask[(px-gx)*font->size/size]*(color>>24)+127)/255;if(alpha)row[px]=blend(row[px],color,alpha);}
   }
   pen+=glyph.advance*size/font->size+style.letterSpacing*advanceScale;
  }
  ++lineIndex;
 });
 return true;
}
}

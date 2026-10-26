// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "scene.hpp"
#include <cstring>
#include <cstdlib>
namespace ps4react {
namespace {
struct BakedImage {const char* name;int w,h;const unsigned char* pixels;bool alpha;};
struct BakedGlyph {int w,h,x,y,advance,offset;};
struct BakedFont {int size;const BakedGlyph* glyphs;const unsigned char* pixels;};
#include "media_assets.h"
std::uint32_t blend(std::uint32_t old,std::uint32_t color,unsigned alpha){
 if(alpha==255)return color|0xff000000;if(!alpha)return old;
 unsigned weight=alpha+1,inverse=256-weight;
 return 0xff000000|((((old&0xff00ff)*inverse+(color&0xff00ff)*weight)>>8)&0xff00ff)|((((old&0x00ff00)*inverse+(color&0x00ff00)*weight)>>8)&0x00ff00);
}
const BakedImage* find_image(const char* name){if(!name)return nullptr;for(const auto& image:baked_images)if(!std::strcmp(image.name,name))return &image;return nullptr;}
const BakedFont& find_font(int size){const BakedFont* best=&baked_fonts[0];int distance=1000;for(const auto& font:baked_fonts){int d=font.size-size;if(d<0)d=-d;if(d<distance){best=&font;distance=d;}}return *best;}
struct CachedImage {const BakedImage* source=nullptr;int w=0,h=0;std::uint32_t* pixels=nullptr;std::size_t bytes=0;unsigned used=0;};
CachedImage cache[32];std::size_t cachedBytes=0;unsigned clock=0;
constexpr std::size_t cacheBudget=32*1024*1024;
std::uint32_t sample(const BakedImage& source,int x,int y,int w,int h){
 double scale=static_cast<double>(source.w)/w;if(static_cast<double>(source.h)/h<scale)scale=static_cast<double>(source.h)/h;
 double fx=(source.w-w*scale)/2+(x+.5)*scale-.5,fy=(source.h-h*scale)/2+(y+.5)*scale-.5;
 if(fx<0)fx=0;if(fy<0)fy=0;if(fx>source.w-1)fx=source.w-1;if(fy>source.h-1)fy=source.h-1;
 int sx=static_cast<int>(fx),sy=static_cast<int>(fy),nx=sx+1<source.w?sx+1:sx,ny=sy+1<source.h?sy+1:sy;
 unsigned ax=static_cast<unsigned>((fx-sx)*256),ay=static_cast<unsigned>((fy-sy)*256);
 const auto* pixels=reinterpret_cast<const std::uint32_t*>(source.pixels);
 std::uint32_t result=0;
 for(unsigned shift=0;shift<32;shift+=8){unsigned a=(pixels[sy*source.w+sx]>>shift)&255,b=(pixels[sy*source.w+nx]>>shift)&255,c=(pixels[ny*source.w+sx]>>shift)&255,d=(pixels[ny*source.w+nx]>>shift)&255;unsigned top=a*(256-ax)+b*ax,bottom=c*(256-ax)+d*ax;result|=((top*(256-ay)+bottom*ay)>>16)<<shift;}
 return result;
}
const std::uint32_t* resized(const BakedImage& source,int w,int h){
 if(w==source.w&&h==source.h)return reinterpret_cast<const std::uint32_t*>(source.pixels);
 for(auto& item:cache)if(item.source==&source&&item.w==w&&item.h==h){item.used=++clock;return item.pixels;}
 std::size_t bytes=static_cast<std::size_t>(w)*h*4;if(bytes>cacheBudget/2)return nullptr;
 auto evict=[](){CachedImage* oldest=nullptr;for(auto& item:cache)if(item.pixels&&(!oldest||item.used<oldest->used))oldest=&item;if(oldest){cachedBytes-=oldest->bytes;std::free(oldest->pixels);*oldest=CachedImage{};}return oldest;};
 while(cachedBytes+bytes>cacheBudget)if(!evict())return nullptr;
 CachedImage* target=nullptr;for(auto& item:cache)if(!item.pixels){target=&item;break;}if(!target)target=evict();if(!target)return nullptr;
 target->pixels=static_cast<std::uint32_t*>(std::malloc(bytes));if(!target->pixels)return nullptr;
 target->source=&source;target->w=w;target->h=h;target->bytes=bytes;target->used=++clock;cachedBytes+=bytes;
 for(int y=0;y<h;++y)for(int x=0;x<w;++x)target->pixels[y*w+x]=sample(source,x,y,w,h);
 return target->pixels;
}
}
bool has_image(const char* name){return find_image(name)!=nullptr;}
void rounded_box(Canvas frame,int x,int y,int w,int h,std::uint32_t color,int radius){
 if(!frame.valid()||w<=0||h<=0||w>8192||h>8192||x<-16384||x>16384||y<-16384||y>16384||!(color>>24))return;
 if(radius<0)radius=0;if(radius>w/2)radius=w/2;if(radius>h/2)radius=h/2;
 int top=y<0?0:y,bottom=y+h>frame.h?frame.h:y+h;
 for(int py=top;py<bottom;++py){
  int inset=0,local=py-y,dy=local<radius?radius-local-1:local>=h-radius?local-(h-radius):0;
  if(dy)while(inset<radius&&(radius-inset-1)*(radius-inset-1)+dy*dy>radius*radius)++inset;
  int left=x+inset<0?0:x+inset,right=x+w-inset>frame.w?frame.w:x+w-inset;
  auto* row=frame.pixels+py*frame.stride;
  if((color>>24)==255){for(int px=left;px<right;++px)row[px]=color;}
  else for(int px=left;px<right;++px)row[px]=blend(row[px],color,color>>24);
 }
}
bool image(Canvas frame,int x,int y,int w,int h,const char* name){
 if(!frame.valid()||w<=0||h<=0||w>8192||h>8192||x<-16384||x>16384||y<-16384||y>16384)return false;
 const BakedImage* source=find_image(name);if(!source)return false;
 int left=x<0?0:x,top=y<0?0:y,right=x+w>frame.w?frame.w:x+w,bottom=y+h>frame.h?frame.h:y+h;
 if(left>=right||top>=bottom)return true;
 const auto* pixels=resized(*source,w,h);
 for(int py=top;py<bottom;++py){auto* row=frame.pixels+py*frame.stride;
  if(pixels&&!source->alpha){std::memcpy(row+left,pixels+(py-y)*w+left-x,(right-left)*4);continue;}
  for(int px=left;px<right;++px){auto value=pixels?pixels[(py-y)*w+px-x]:sample(*source,px-x,py-y,w,h);row[px]=source->alpha?blend(row[px],value,value>>24):value;}
 }return true;
}
void text_extent(const char* value,int size,int& w,int& h){
 int line=0,max=0,rows=1;const auto& font=find_font(size);
 for(int i=0;value[i]&&i<2048;++i){unsigned c=static_cast<unsigned char>(value[i]);if(c=='\n'){if(line>max)max=line;line=0;++rows;continue;}if(c<32||c>126)c='?';line+=size<14?6*(size/7)*64:font.glyphs[c-32].advance*size/font.size;}
 if(line>max)max=line;w=(max+63)/64+4;h=(rows-1)*(size+8)+size+12;
}
bool font_text(Canvas frame,int x,int y,const char* value,int size,std::uint32_t color){
 if(!frame.valid()||!value||size<14||size>112)return false;
 const auto& font=find_font(size);int pen=0,origin=x;
 for(int i=0;value[i]&&i<2048;++i){unsigned c=static_cast<unsigned char>(value[i]);if(c=='\n'){pen=0;x=origin;y+=size+8;continue;}if(c<32||c>126)c='?';
  const auto& glyph=font.glyphs[c-32];x=origin+(pen+32)/64;
  int gx=x+glyph.x*size/font.size,gy=y+glyph.y*size/font.size,w=glyph.w*size/font.size,h=glyph.h*size/font.size;
  int top=gy<0?0:gy,left=gx<0?0:gx,bottom=gy+h>frame.h?frame.h:gy+h,right=gx+w>frame.w?frame.w:gx+w;
  for(int py=top;py<bottom;++py){auto* row=frame.pixels+py*frame.stride;const auto* mask=font.pixels+glyph.offset+(py-gy)*font.size/size*glyph.w;
   if(size==font.size)for(int px=left;px<right;++px){unsigned alpha=mask[px-gx];if(alpha)row[px]=blend(row[px],color,alpha);}
   else for(int px=left;px<right;++px){unsigned alpha=mask[(px-gx)*font.size/size];if(alpha)row[px]=blend(row[px],color,alpha);}
  }pen+=glyph.advance*size/font.size;
 }return true;
}
}

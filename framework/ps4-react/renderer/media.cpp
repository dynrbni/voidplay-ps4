// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <cstring>
namespace ps4react {
namespace {
struct BakedImage {const char* name;int w,h;const unsigned char* pixels;bool rgba;};
#include "media_assets.h"
std::uint32_t blend(std::uint32_t previous,std::uint32_t color,unsigned alpha){
    unsigned out=0xff000000;
    for(unsigned shift=0;shift<24;shift+=8)out|=((((color>>shift)&255)*alpha+((previous>>shift)&255)*(255-alpha))/255)<<shift;
    return out;
}
}
void rounded_box(Canvas frame,int x,int y,int w,int h,std::uint32_t color,int radius){
    if(!frame.valid()||w<=0||h<=0||w>8192||h>8192)return;
    if(radius<0)radius=0;if(radius>w/2)radius=w/2;if(radius>h/2)radius=h/2;
    int left=x<0?0:x,top=y<0?0:y,right=x+w>frame.w?frame.w:x+w,bottom=y+h>frame.h?frame.h:y+h;
    for(int py=top;py<bottom;++py)for(int px=left;px<right;++px){
        int dx=px-x<radius?radius-(px-x)-1:px-x>=w-radius?px-x-(w-radius):0;
        int dy=py-y<radius?radius-(py-y)-1:py-y>=h-radius?py-y-(h-radius):0;
        if(dx*dx+dy*dy<=radius*radius)frame.pixels[py*frame.stride+px]=blend(frame.pixels[py*frame.stride+px],color,color>>24);
    }
}
bool image(Canvas frame,int x,int y,int w,int h,const char* name){
    if(!frame.valid()||!name||w<=0||h<=0||w>8192||h>8192)return false;
    const BakedImage* asset=nullptr;
    for(const auto& item:baked_images)if(!std::strcmp(item.name,name)){asset=&item;break;}
    if(!asset)return false;
    for(int row=0;row<h;++row){int py=y+row;if(py<0||py>=frame.h)continue;
        for(int col=0;col<w;++col){int px=x+col;if(px<0||px>=frame.w)continue;
            auto pixel=(row*asset->h/h)*asset->w+col*asset->w/w;
            if(asset->rgba){auto* p=asset->pixels+pixel*4;auto color=(p[0]<<16)|(p[1]<<8)|p[2];frame.pixels[py*frame.stride+px]=blend(frame.pixels[py*frame.stride+px],color,p[3]);continue;}
            auto offset=pixel*2;
            unsigned value=asset->pixels[offset]|(asset->pixels[offset+1]<<8);
            frame.pixels[py*frame.stride+px]=0xff000000|(((value>>11)*255/31)<<16)|((((value>>5)&63)*255/63)<<8)|((value&31)*255/31);
        }
    }return true;
}
bool font_text(Canvas frame,int x,int y,const char* value,int size,std::uint32_t color){
    if(!frame.valid()||!value||size<14||size>112)return false;
    const int origin=x;
    for(int i=0;value[i]&&i<2048;++i){unsigned c=static_cast<unsigned char>(value[i]);
        if(c=='\n'){x=origin;y+=size+8;continue;}
        if(c<32||c>126)c='?';
        const int glyph=c-32,advance=font_advances[glyph]*size/64;
        for(int row=0;row<size*96/64;++row){int py=y+row;if(py<0||py>=frame.h)continue;
            for(int col=0;col<size*80/64;++col){int px=x+col;if(px<0||px>=frame.w)continue;
                unsigned alpha=0,count=0;
                int sx=col*64/size,sy=row*64/size,ex=(col+1)*64/size,ey=(row+1)*64/size;
                if(ex<=sx)ex=sx+1;if(ey<=sy)ey=sy+1;if(ex>80)ex=80;if(ey>96)ey=96;
                for(int ay=sy;ay<ey;++ay)for(int ax=sx;ax<ex;++ax){alpha+=font_atlas[ay*(80*95)+glyph*80+ax];++count;}
                if(count)alpha/=count;
                if(alpha)frame.pixels[py*frame.stride+px]=blend(frame.pixels[py*frame.stride+px],color,alpha);
            }
        }x+=advance;
    }return true;
}
}

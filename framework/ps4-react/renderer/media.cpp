// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <cstring>
namespace ps4react {
namespace {
struct BakedImage {const char* name;int w,h;const unsigned char* pixels;};
#include "media_assets.h"
std::uint32_t blend(std::uint32_t previous,std::uint32_t color,unsigned alpha){
    unsigned out=0xff000000;
    for(unsigned shift=0;shift<24;shift+=8)out|=((((color>>shift)&255)*alpha+((previous>>shift)&255)*(255-alpha))/255)<<shift;
    return out;
}
}
bool image(Canvas frame,int x,int y,int w,int h,const char* name){
    if(!frame.valid()||!name||w<=0||h<=0||w>8192||h>8192)return false;
    const BakedImage* asset=nullptr;
    for(const auto& item:baked_images)if(!std::strcmp(item.name,name)){asset=&item;break;}
    if(!asset)return false;
    for(int row=0;row<h;++row){int py=y+row;if(py<0||py>=frame.h)continue;
        for(int col=0;col<w;++col){int px=x+col;if(px<0||px>=frame.w)continue;
            auto offset=((row*asset->h/h)*asset->w+col*asset->w/w)*2;
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
                unsigned alpha=font_atlas[(row*64/size)*(80*95)+glyph*80+col*64/size];
                if(alpha)frame.pixels[py*frame.stride+px]=blend(frame.pixels[py*frame.stride+px],color,alpha);
            }
        }x+=advance;
    }return true;
}
}

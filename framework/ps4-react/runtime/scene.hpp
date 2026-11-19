// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include "host.hpp"
namespace ps4react {
struct DrawCommand {
 int kind,x,y,w,h,size,weight,wrap,lineHeight,letterSpacing,radius;
 int clipX,clipY,clipW,clipH,fit;
 std::uint32_t color;
 char value[2049];
};
inline TextStyle command_style(const DrawCommand& command){
 TextStyle style;style.size=command.size;style.weight=command.weight;style.wrap=command.wrap;
 style.lineHeight=command.lineHeight;style.letterSpacing=command.letterSpacing;return style;
}
inline Clip command_clip(const DrawCommand& command){
 Clip clip;clip.x=command.clipX;clip.y=command.clipY;clip.w=command.clipW;clip.h=command.clipH;return clip;
}
class Scene {
 DrawCommand* previous=nullptr;DrawCommand* pending=nullptr;
 int previousCount=0,count=0;
 Canvas canvas{};std::uint32_t background=0,oldBackground=0;
 std::uint32_t* before=nullptr;std::uint32_t* target=nullptr;
 bool valid=false,motion=true,animating=false,tween=false;
 int left=0,top=0,right=0,bottom=0;
 double started=0;
public:
 Scene();~Scene();
 void begin(Canvas,std::uint32_t);
 bool add(int kind,int x,int y,int w,int h,int size,int radius,std::uint32_t,const char* value="",const TextStyle& style=TextStyle{},const Clip& clip=Clip{},int fit=0);
 bool finish(double now);
 bool animate(double now);
 bool set_motion(bool enabled);
};
}

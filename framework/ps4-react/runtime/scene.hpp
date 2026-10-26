// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include "host.hpp"
namespace ps4react {
struct DrawCommand {
 int kind,x,y,w,h,size,radius;
 std::uint32_t color;
 char value[2049];
};
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
 bool add(int kind,int x,int y,int w,int h,int size,int radius,std::uint32_t,const char* value="");
 bool finish(double now);
 bool animate(double now);
 bool set_motion(bool enabled);
};
void text_extent(const char*,int size,int& w,int& h);
}

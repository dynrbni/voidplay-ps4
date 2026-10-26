// SPDX-License-Identifier: GPL-3.0-only
#include "scene.hpp"
#include <cstdlib>
#include <cstring>
namespace ps4react {
namespace {
constexpr int limit=2048;
bool same(const DrawCommand& a,const DrawCommand& b){return a.kind==b.kind&&a.x==b.x&&a.y==b.y&&a.w==b.w&&a.h==b.h&&a.size==b.size&&a.radius==b.radius&&a.color==b.color&&!std::strcmp(a.value,b.value);}
std::uint32_t interpolate(std::uint32_t a,std::uint32_t b,unsigned weight){
 unsigned inverse=256-weight;
 return 0xff000000|((((a&0xff00ff)*inverse+(b&0xff00ff)*weight)>>8)&0xff00ff)|((((a&0x00ff00)*inverse+(b&0x00ff00)*weight)>>8)&0x00ff00);
}
void paint(Canvas canvas,int l,int t,int r,int b,std::uint32_t background,const DrawCommand* commands,int count,const DrawCommand* from=nullptr,unsigned weight=256){
 std::size_t offset=static_cast<std::size_t>(t)*canvas.stride+l;
 Canvas damage{canvas.pixels+offset,r-l,b-t,canvas.stride,canvas.capacity-offset};rect(damage,0,0,damage.w,damage.h,background);
 for(int i=0;i<count;++i){DrawCommand command=commands[i];
  if(from){const auto& old=from[i];auto mix=[&](int a,int value){return a+static_cast<int>((value-a)*static_cast<int>(weight)/256);};command.x=mix(old.x,command.x);command.y=mix(old.y,command.y);command.w=mix(old.w,command.w);command.h=mix(old.h,command.h);command.radius=mix(old.radius,command.radius);
   std::uint32_t color=0;for(unsigned shift=0;shift<32;shift+=8)color|=static_cast<unsigned>(mix((old.color>>shift)&255,(command.color>>shift)&255))<<shift;command.color=color;
  }
  int bleed=command.kind==1?2:0;if(command.x-bleed>=r||command.y-bleed>=b||command.x+command.w<=l||command.y+command.h<=t)continue;
  int x=command.x-l,y=command.y-t;
  if(command.kind==0)rect(damage,x,y,command.w,command.h,command.color);
  else if(command.kind==1)text(damage,x,y,command.value,command.size,command.color);
  else if(command.kind==2)image(damage,x,y,command.w,command.h,command.value);
  else rounded_box(damage,x,y,command.w,command.h,command.color,command.radius);
 }
}
}
Scene::Scene(){previous=static_cast<DrawCommand*>(std::calloc(limit,sizeof(DrawCommand)));pending=static_cast<DrawCommand*>(std::calloc(limit,sizeof(DrawCommand)));}
Scene::~Scene(){std::free(previous);std::free(pending);std::free(before);std::free(target);}
void Scene::begin(Canvas frame,std::uint32_t color){canvas=frame;background=color;count=0;}
bool Scene::add(int kind,int x,int y,int w,int h,int size,int radius,std::uint32_t color,const char* value){
 if(!pending||count>=limit||!value||std::strlen(value)>2048)return false;
 auto& command=pending[count++];command.kind=kind;command.x=x;command.y=y;command.w=w;command.h=h;command.size=size;command.radius=radius;command.color=color;std::strcpy(command.value,value);return true;
}
bool Scene::finish(double now){
 if(!previous||!pending||!canvas.valid())return false;
 int l=canvas.w,t=canvas.h,r=0,b=0;
 auto include=[&](const DrawCommand& command){if(command.w<=0||command.h<=0)return;int bleed=command.kind==1?2:0;if(command.x-bleed<l)l=command.x-bleed;if(command.y-bleed<t)t=command.y-bleed;if(command.x+command.w>r)r=command.x+command.w;if(command.y+command.h>b)b=command.y+command.h;};
 if(!valid||background!=oldBackground){l=0;t=0;r=canvas.w;b=canvas.h;}
 else for(int i=0;i<count||i<previousCount;++i)if(i>=count||i>=previousCount||!same(previous[i],pending[i])){if(i<count)include(pending[i]);if(i<previousCount)include(previous[i]);}
 if(animating){if(left<l)l=left;if(top<t)t=top;if(right>r)r=right;if(bottom>b)b=bottom;}
 if(l<0)l=0;if(t<0)t=0;if(r>canvas.w)r=canvas.w;if(b>canvas.h)b=canvas.h;
 if(l<r&&t<b){
  bool transition=motion&&valid;
  tween=transition&&!animating&&previousCount==count&&background==oldBackground;
  if(tween)for(int i=0;i<count;++i)if(previous[i].kind!=pending[i].kind||previous[i].size!=pending[i].size||std::strcmp(previous[i].value,pending[i].value)){tween=false;break;}
  if(transition&&!tween&&!before){before=static_cast<std::uint32_t*>(std::malloc(canvas.capacity*4));target=static_cast<std::uint32_t*>(std::malloc(canvas.capacity*4));}
  transition=transition&&(tween||(before&&target));
  if(transition&&!tween)for(int y=t;y<b;++y)std::memcpy(before+y*canvas.stride+l,canvas.pixels+y*canvas.stride+l,(r-l)*4);
  if(!tween)paint(canvas,l,t,r,b,background,pending,count);
  animating=transition;left=l;top=t;right=r;bottom=b;started=now;
  if(transition&&!tween)for(int y=t;y<b;++y)std::memcpy(target+y*canvas.stride+l,canvas.pixels+y*canvas.stride+l,(r-l)*4);
 }
 DrawCommand* swap=previous;previous=pending;pending=swap;previousCount=count;oldBackground=background;valid=true;
 if(animating)animate(now);
 return l<r&&t<b;
}
bool Scene::animate(double now){
 if(!animating)return false;
 double progress=(now-started)/120.0;if(progress<0)progress=0;if(progress>=1){progress=1;animating=false;}
 double eased=1-(1-progress)*(1-progress)*(1-progress);unsigned weight=static_cast<unsigned>(eased*256);
 if(tween){paint(canvas,left,top,right,bottom,background,previous,previousCount,pending,weight);return true;}
 for(int y=top;y<bottom;++y){auto* out=canvas.pixels+y*canvas.stride;const auto* a=before+y*canvas.stride;const auto* b=target+y*canvas.stride;
  if(weight==256)std::memcpy(out+left,b+left,(right-left)*4);
  else for(int x=left;x<right;++x)out[x]=interpolate(a[x],b[x],weight);
 }return true;
}
bool Scene::set_motion(bool enabled){motion=enabled;if(!enabled&&animating)return animate(started+120);return false;}
}

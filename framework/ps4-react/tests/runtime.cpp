// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "input.hpp"
#include "scene.hpp"
#include "app_bundle.h"
#include "overflow_bundle.h"
#include "counter_bundle.h"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <climits>
#include <cstring>
#include <unistd.h>
namespace ps4react {
double testClockOffset=0;
void platform_log(const char* stage,const char* message){std::fprintf(stderr,"[test][%s] %s\n",stage,message);}
double platform_now(){return std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count()+testClockOffset;}
}
static std::uint64_t hash(ps4react::Canvas f){std::uint64_t n=1469598103934665603ULL;for(int i=0;i<f.w*f.h;i++){n^=f.pixels[i];n*=1099511628211ULL;}return n;}
int main(){
 using namespace ps4react;
 std::uint32_t guard[20];for(auto& n:guard)n=0x12345678;
 Canvas small{guard+2,4,4,4,16};rect(small,-10,-10,INT_MAX,INT_MAX,0xffffffff);
 assert(guard[0]==0x12345678&&guard[1]==0x12345678&&guard[18]==0x12345678&&guard[19]==0x12345678);
 assert(!Canvas({guard,5,5,5,20}).valid());
 DirectionRepeat directions;
 assert(!directions.update(false,false,false,false,25,-25,0));
 assert(!std::strcmp(directions.update(false,false,false,false,-100,0,10),"left"));
 assert(!directions.update(false,false,false,false,-100,0,100));
 assert(!std::strcmp(directions.update(false,false,false,false,-100,0,360),"left"));
 assert(!directions.update(false,false,false,false,-100,0,400));
 assert(!std::strcmp(directions.update(false,false,true,false,-100,0,410),"up"));
 directions.reset();assert(!std::strcmp(directions.update(false,true,false,false,0,0,420),"right"));
 assert(image(small,-3,-3,8,8,"backdrop"));
 assert(!image(small,0,0,4,4,"unknown"));
 assert(guard[0]==0x12345678&&guard[19]==0x12345678);
 {
  std::uint32_t pixels[64];for(auto& pixel:pixels)pixel=0xffaa0000;
  Canvas letterbox{pixels,8,8,8,64};assert(image(letterbox,0,0,8,8,"backdrop",Clip{},1));
  assert(pixels[0]==0xffaa0000u&&pixels[4*8+4]!=0xffaa0000u);
  int a=0,ah=0,b=0,bh=0;text_extent("é",TextStyle{20,400,0,28},a,ah);text_extent("e",TextStyle{20,400,0,28},b,bh);assert(a==b&&ah==bh);
 }
 rect(small,0,0,4,4,0xff000000);rounded_box(small,-2,-2,8,8,0x80ffffff,3);
 assert(guard[0]==0x12345678&&guard[19]==0x12345678);assert((small.pixels[5]&255)==128);
 assert(image(small,-2,-2,8,8,"icon-heart"));
 assert(Canvas({guard+2,2,4,4,14}).valid());
 {
  std::uint32_t scenePixels[64]{},expected[64]{};Canvas surface{scenePixels,8,8,8,64},reference{expected,8,8,8,64};Scene scene;scene.set_motion(false);
  auto draw=[&](int x){scene.begin(surface,0xff000000);assert(scene.add(0,0,0,8,8,0,0,0xff112233));assert(scene.add(0,x,2,2,2,0,0,0xffeeeeee));return scene.finish(0);};
  assert(draw(2));assert(!draw(2));assert(draw(5));rect(reference,0,0,8,8,0xff112233);rect(reference,5,2,2,2,0xffeeeeee);assert(!std::memcmp(scenePixels,expected,sizeof expected));
  scene.set_motion(true);assert(draw(2));assert(!std::memcmp(scenePixels,expected,sizeof expected));assert(scene.animate(60));assert(std::memcmp(scenePixels,expected,sizeof expected));assert(scene.animate(120));rect(reference,0,0,8,8,0xff112233);rect(reference,2,2,2,2,0xffeeeeee);assert(!std::memcmp(scenePixels,expected,sizeof expected));assert(!scene.animate(140));
  assert(draw(5));assert(scene.set_motion(false));rect(reference,0,0,8,8,0xff112233);rect(reference,5,2,2,2,0xffeeeeee);assert(!std::memcmp(scenePixels,expected,sizeof expected));
 }
 char directory[]="/tmp/voidplay-preferences-XXXXXX";assert(mkdtemp(directory));assert(setenv("VOIDPLAY_STATE_DIR",directory,1)==0);
 char saved[65537];assert(preferences_read(saved,sizeof saved)==0);
 const char* preferences="{\"version\":1,\"favorites\":[],\"library\":[],\"reduceMotion\":true}";
 assert(preferences_write(preferences,std::strlen(preferences)));assert(preferences_read(saved,sizeof saved)==static_cast<int>(std::strlen(preferences)));assert(!std::strcmp(saved,preferences));
 assert(!preferences_write(preferences,65537));assert(!preferences_write(nullptr,0));
 {
  /* Typography: baked weights must actually change the glyphs, and wrap width
     must change the measured block, so a semibold request cannot fall back silently. */
  auto coverage=[&](int weight,int size,const char* text_value,int wrap){
   std::uint32_t pixels[320*64]{},covered=0;Canvas frame{pixels,320,64,320,320*64};
   rect(frame,0,0,320,64,0xff000000);text(frame,3,8,text_value,TextStyle{size,weight,wrap,size+8},0xffffffff);
   for(auto pixel:pixels)if(pixel!=0xff000000)++covered;return covered;};
  assert(coverage(400,11,"Caption",0)>0&&coverage(800,11,"Caption",0)>coverage(400,11,"Caption",0));
  int regular=coverage(400,48,"Manrope",0),semibold=coverage(600,48,"Manrope",0),extrabold=coverage(800,48,"Manrope",0),bold=coverage(700,48,"Manrope",0);
  assert(regular>0&&semibold>0&&extrabold>0);
  assert(regular!=semibold&&semibold!=extrabold&&regular!=extrabold);
  assert(bold!=regular&&bold!=semibold&&bold!=extrabold);
  int wide=0,wideHeight=0,narrow=0,narrowHeight=0;
  text_extent("Manrope",TextStyle{48,400,0,56},wide,wideHeight);
  text_extent("Manrope",TextStyle{48,800,0,56},narrow,narrowHeight);
  assert(wide>0&&narrow>=wide&&wideHeight==narrowHeight&&wideHeight==56);
  int single=0,singleHeight=0,wrapped=0,wrappedHeight=0;
  text_extent("alpha beta gamma delta",TextStyle{16,400,0,20},single,singleHeight);
  text_extent("alpha beta gamma delta",TextStyle{16,400,70,20},wrapped,wrappedHeight);
  assert(singleHeight==20&&wrappedHeight>singleHeight&&wrappedHeight%20==0&&wrapped<=70);
  int defaultHeight=0,defaultWidth=0;
  text_extent("line one\nline two",TextStyle{20,400,0,0},defaultWidth,defaultHeight);
  assert(defaultHeight==56);
 }
 {
  /* Clipping: a scrolled viewport must never paint outside its own bounds. */
  std::uint32_t pixels[64]{};Canvas frame{pixels,8,8,8,64};
  rect(frame,0,0,8,8,0xff112233);
  rect(frame,0,0,8,8,0xffeeeeee,Clip{2,2,3,3});
  rounded_box(frame,0,0,8,8,0xffffffff,2,Clip{6,6,2,2});
  for(int y=0;y<8;++y)for(int x=0;x<8;++x){
   std::uint32_t expected=(x>=2&&x<5&&y>=2&&y<5)?0xffeeeeeeu:0xff112233u;
   if(x>=6&&y>=6)expected=0xffffffffu;
   assert(pixels[y*8+x]==expected);
  }
  std::uint32_t snapshot[64];std::memcpy(snapshot,pixels,sizeof snapshot);
  text(frame,0,0,"Manrope",TextStyle{14,400,0,18},0xffff00ff,Clip{64,64,8,8});
  image(frame,0,0,8,8,"icon-heart",Clip{64,64,8,8});
  rounded_box(frame,0,0,8,8,0xffffffff,2,Clip{64,64,8,8});
  assert(!std::memcmp(snapshot,pixels,sizeof snapshot));
  std::uint32_t partially_clipped[64]{};Canvas clipped_frame{partially_clipped,8,8,8,64};
  rect(clipped_frame,0,0,8,8,0xff000000);
  font_text(clipped_frame,0,0,"MM",TextStyle{14,400,0,18},0xffffffff,Clip{0,0,3,8});
  for(int y=0;y<8;++y)for(int x=0;x<8;++x)assert(x<3||partially_clipped[y*8+x]==0xff000000u);
 }
 {
  /* Borders are rings, not filled boxes: the interior keeps its own pixels, the
     corner arc is respected and a translucent border blends over the fill. */
  std::uint32_t ring[49]{};Canvas frame{ring,7,7,7,49};
  rect(frame,0,0,7,7,0xff000000);rounded_stroke(frame,0,0,7,7,2,0xffffffff,0);
  assert(ring[0]==0xffffffffu&&ring[7+1]==0xffffffffu&&ring[3*7+3]==0xff000000u&&ring[6*7+6]==0xffffffffu);
  assert(ring[3*7+6]==0xffffffffu&&ring[3*7+2]==0xff000000u);
  std::uint32_t rounded[144]{};Canvas arc{rounded,12,12,12,144};
  rect(arc,0,0,12,12,0xff000000);rounded_stroke(arc,0,0,12,12,1,0xffffffff,4);
  assert(rounded[0]==0xff000000u&&rounded[6*12+6]==0xff000000u&&rounded[12]==0xffffffffu&&rounded[6*12+11]==0xffffffffu);
  std::uint32_t faded[49]{};Canvas blendFrame{faded,7,7,7,49};
  rect(blendFrame,0,0,7,7,0xff000000);rounded_stroke(blendFrame,0,0,7,7,2,0x80ffffff,0);
  assert((faded[0]&255)==128&&(faded[7+1]&255)==128);
  std::uint32_t snapshot[49];std::memcpy(snapshot,faded,sizeof snapshot);
  rounded_stroke(blendFrame,0,0,7,7,2,0xffffffff,0,Clip{64,64,8,8});
  rounded_stroke(blendFrame,0,0,7,7,0,0xffffffff,0);
  assert(!std::memcmp(snapshot,faded,sizeof snapshot));
 }
 Canvas f{static_cast<std::uint32_t*>(std::calloc(width*height,4)),width,height,width,static_cast<std::size_t>(width)*height};assert(f.valid());
 Runtime runtime;
 assert(runtime.start(f,reinterpret_cast<const char*>(app_bundle),app_bundle_length));
 auto initial=hash(f);assert(runtime.tick("confirm"));auto updated=hash(f);assert(initial!=updated);
 assert(runtime.tick("back"));assert(hash(f)==initial);runtime.stop();assert(!runtime.state);
 for(int i=0;i<3;i++){assert(runtime.start(f,reinterpret_cast<const char*>(app_bundle),app_bundle_length));runtime.stop();}
 {
  char snapshot[8192];
  auto scroll=[&](const char* key){assert(runtime.inspect(snapshot,sizeof snapshot));const char* at=std::strstr(snapshot,key);assert(at);at=std::strchr(at,'"');assert(at);at=std::strchr(at,':');assert(at);return std::strtod(at+1,nullptr);};
  assert(runtime.start(f,reinterpret_cast<const char*>(app_bundle),app_bundle_length));
  assert(scroll("page:discover")==0);
  assert(runtime.tick("down"));assert(runtime.tick("down"));double realOffset=scroll("page:discover");
  assert(realOffset>0);assert(runtime.tick("up"));assert(runtime.tick("favorite"));assert(scroll("page:discover")==realOffset);
  assert(runtime.tick("confirm"));assert(scroll("page:details:orbit-workshop")>=0);
  assert(runtime.tick("back"));assert(scroll("page:discover")==realOffset);
  runtime.stop();
  assert(runtime.start(f,reinterpret_cast<const char*>(overflow_bundle),overflow_bundle_length));
  assert(runtime.tick("down"));double firstPage=scroll("page:discover");
  for(int i=0;i<59;++i)assert(runtime.tick("right"));
  auto visibleAnchor=[&](){assert(runtime.inspect(snapshot,sizeof snapshot));const char* at=std::strstr(snapshot,"\"anchors\":[");assert(at);int tested=0;
   while((at=std::strchr(at,'{'))){int x=0,y=0,w=0,h=0;assert(std::sscanf(at,"{\"x\":%d,\"y\":%d,\"w\":%d,\"h\":%d}",&x,&y,&w,&h)==4);assert(x>=0&&x+w<=1920&&y>=92&&y+h<=1036);++tested;++at;}assert(tested>0);};
  visibleAnchor();double horizontal=scroll("shelf:0");assert(horizontal>14000);assert(scroll("page:discover")==firstPage);
  assert(runtime.tick("down"));double secondPage=scroll("page:discover");assert(secondPage>firstPage);
  assert(runtime.tick("down"));double bottomPage=scroll("page:discover");assert(bottomPage>secondPage);visibleAnchor();
  std::printf("Scroll PASS: real catalog footer %.0f px; fixture shelf %.0f px, page %.0f -> %.0f -> %.0f px; focused bounds visible.\n",realOffset,horizontal,firstPage,secondPage,bottomPage);
  assert(runtime.tick("favorite"));assert(scroll("page:discover")==bottomPage);
  for(int i=0;i<6;++i)assert(runtime.tick("up"));assert(scroll("page:discover")<bottomPage);
  runtime.stop();
  assert(runtime.start(f,reinterpret_cast<const char*>(counter_bundle),counter_bundle_length));
  auto zero=hash(f);assert(runtime.tick("confirm"));assert(runtime.tick("confirm"));testClockOffset+=150;assert(runtime.tick());assert(hash(f)!=zero);assert(runtime.tick("back"));testClockOffset+=150;assert(runtime.tick());assert(hash(f)==zero);runtime.stop();
 }
 const char* syntax="function broken(";assert(!runtime.start(f,syntax,std::strlen(syntax)));runtime.stop();
 const char* loop="while(true){}";assert(!runtime.start(f,loop,std::strlen(loop)));runtime.stop();
 const char* bad="__ps4Native.text(0,0,'text',999,0)";assert(!runtime.start(f,bad,std::strlen(bad)));runtime.stop();
 char file[256];std::snprintf(file,sizeof file,"%s/preferences.json",directory);assert(unlink(file)==0);assert(rmdir(directory)==0);
 std::free(f.pixels);std::puts("Runtime PASS: React navigation/lifecycle/errors, direction repeat, rounded alpha/image bounds, border rings and atomic preferences round trip.");
}

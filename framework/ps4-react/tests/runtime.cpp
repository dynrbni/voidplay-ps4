// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "input.hpp"
#include "scene.hpp"
#include "app_bundle.h"
#include <cassert>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <climits>
#include <cstring>
#include <unistd.h>
namespace ps4react {
void platform_log(const char* stage,const char* message){std::fprintf(stderr,"[test][%s] %s\n",stage,message);}
double platform_now(){return std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count();}
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
 std::uint32_t glyph_pixels[7*7]{};Canvas glyph_frame{glyph_pixels,7,7,7,49};
 for(int c=33;c<=126;++c){
  rect(glyph_frame,0,0,7,7,0);char value[]={static_cast<char>(c),0};text(glyph_frame,0,0,value,7,0xffffffff);
  bool visible=false;for(auto pixel:glyph_pixels)visible=visible||pixel!=0;assert(visible);
 }
 Canvas f{static_cast<std::uint32_t*>(std::calloc(width*height,4)),width,height,width,static_cast<std::size_t>(width)*height};assert(f.valid());
 Runtime runtime;
 assert(runtime.start(f,reinterpret_cast<const char*>(app_bundle),app_bundle_length));
 auto initial=hash(f);assert(runtime.tick("confirm"));auto updated=hash(f);assert(initial!=updated);
 assert(runtime.tick("back"));assert(hash(f)==initial);runtime.stop();assert(!runtime.state);
 for(int i=0;i<3;i++){assert(runtime.start(f,reinterpret_cast<const char*>(app_bundle),app_bundle_length));runtime.stop();}
 const char* syntax="function broken(";assert(!runtime.start(f,syntax,std::strlen(syntax)));runtime.stop();
 const char* loop="while(true){}";assert(!runtime.start(f,loop,std::strlen(loop)));runtime.stop();
 const char* bad="__ps4Native.text(0,0,'text',999,0)";assert(!runtime.start(f,bad,std::strlen(bad)));runtime.stop();
 char file[256];std::snprintf(file,sizeof file,"%s/preferences.json",directory);assert(unlink(file)==0);assert(rmdir(directory)==0);
 std::free(f.pixels);std::puts("Runtime PASS: React navigation/lifecycle/errors, direction repeat, rounded alpha/image bounds and atomic preferences round trip.");
}

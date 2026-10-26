// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "scene.hpp"
#include "app_bundle.h"
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <unistd.h>
namespace ps4react {
double platform_now(){return std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now().time_since_epoch()).count();}
void platform_log(const char*,const char*){}
}
int main(){
 using namespace ps4react;
 char directory[]="/tmp/voidplay-benchmark-XXXXXX";if(!mkdtemp(directory))return 1;
 setenv("VOIDPLAY_STATE_DIR",directory,1);
 const char* preferences="{\"version\":1,\"favorites\":[],\"library\":[],\"reduceMotion\":true}";
 if(!preferences_write(preferences,std::strlen(preferences)))return 2;
 Canvas frame{static_cast<std::uint32_t*>(std::calloc(width*height,4)),width,height,width,static_cast<std::size_t>(width)*height};
 Runtime runtime;double begin=platform_now();if(!runtime.start(frame,reinterpret_cast<const char*>(app_bundle),app_bundle_length))return 3;
 double startup=platform_now()-begin,times[128]{};int count=0;
 const char* actions[]={"confirm","back","up","right","confirm","down","left","right","back","right","confirm","back","left","left","confirm"};
 for(int cycle=0;cycle<8;++cycle)for(const char* action:actions){begin=platform_now();if(!runtime.tick(action))return 4;times[count++]=platform_now()-begin;}
 double sum=0;for(int i=0;i<count;++i){sum+=times[i];for(int j=i;j>0&&times[j]<times[j-1];--j){double temporary=times[j];times[j]=times[j-1];times[j-1]=temporary;}}
 runtime.stop();double animationP95[2]{};
 for(int variant=0;variant<2;++variant){
  Scene scene;scene.begin(frame,0xff050505);scene.add(0,0,0,width,height,0,0,0xff050505);scene.finish(0);
  double samples[160]{};int sampleCount=0;
  for(int cycle=0;cycle<20;++cycle){double at=cycle*150.0;
   scene.begin(frame,0xff050505);scene.add(0,0,0,width,height,0,0,0xff050505);
   scene.add(0,0,0,variant?width:300,variant?height:300,0,0,cycle%2?0xffeeeeee:0xff171717);scene.finish(at);
   for(int tick=1;tick<=8;++tick){begin=platform_now();scene.animate(at+tick*16.667);samples[sampleCount++]=platform_now()-begin;}
  }
  for(int i=1;i<sampleCount;++i)for(int j=i;j>0&&samples[j]<samples[j-1];--j){double value=samples[j];samples[j]=samples[j-1];samples[j-1]=value;}
  animationP95[variant]=samples[sampleCount*95/100];
 }
 std::printf("{\"host\":\"Mac CPU render only; not PS4 FPS\",\"samples\":%d,\"startup_ms\":%.3f,\"mean_ms\":%.3f,\"median_ms\":%.3f,\"p95_ms\":%.3f,\"max_ms\":%.3f,\"focus_blend_p95_ms\":%.3f,\"full_hd_blend_p95_ms\":%.3f}\n",count,startup,sum/count,times[count/2],times[count*95/100],times[count-1],animationP95[0],animationP95[1]);
 std::free(frame.pixels);char path[256];std::snprintf(path,sizeof path,"%s/preferences.json",directory);unlink(path);rmdir(directory);
}

// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <cstdlib>
#include <cstdio>
#include <cstring>
#ifndef PS4_REACT_NATIVE_ONLY
#include "app_bundle.h"
#endif
namespace {
void save_frame(ps4react::Canvas f,const char* path){FILE* out=std::fopen(path,"wb");if(!out)return;std::fprintf(out,"P6\n%d %d\n255\n",f.w,f.h);for(int y=0;y<f.h;y++)for(int x=0;x<f.w;x++){auto v=f.pixels[y*f.stride+x];unsigned char c[]={static_cast<unsigned char>(v>>16),static_cast<unsigned char>(v>>8),static_cast<unsigned char>(v)};std::fwrite(c,1,3,out);}std::fclose(out);}
}
int main(int argc,char** argv){
    using namespace ps4react;
    int frames=0;const char* capture=nullptr;
#ifndef __PS4__
    for(int i=1;i<argc;i++){if(!std::strcmp(argv[i],"--frames")&&i+1<argc)frames=std::atoi(argv[++i]);else if(!std::strcmp(argv[i],"--capture")&&i+1<argc)capture=argv[++i];}
#else
    (void)argc;(void)argv;
#endif
    platform_log("startup","main reached");
    Canvas canvas{static_cast<std::uint32_t*>(std::calloc(width*height,4)),width,height,width,static_cast<std::size_t>(width)*height};
    if(!canvas.valid()||!platform_open()){
        platform_log("startup","native initialization failed");platform_close();std::free(canvas.pixels);
#ifdef __PS4__
        for(;;)platform_sleep();
#else
        return 1;
#endif
    }
    native_frame(canvas);
    if(!platform_present(canvas)){platform_log("display","first frame failed");platform_close();std::free(canvas.pixels);
#ifdef __PS4__
        for(;;)platform_sleep();
#else
        return 1;
#endif
    }
    platform_log("display","native visible frame submitted");
    bool ok=true;

#ifndef PS4_REACT_NATIVE_ONLY
    Runtime runtime;ok=runtime.start(canvas,reinterpret_cast<const char*>(app_bundle),app_bundle_length);
#endif
    int frame=0;bool running=true;
#if defined(__PS4__) && !defined(PS4_REACT_NATIVE_ONLY)
    int samples=0;double cpuTotal=0,cpuMax=0,presentTotal=0;
#endif
    while(running){
        double frameStart=platform_now();
        const char* action=platform_input();
#ifdef PS4_REACT_NATIVE_ONLY
        (void)action;
#endif
#ifndef __PS4__
        if(action&&!std::strcmp(action,"exit"))running=false;
#endif
#ifndef PS4_REACT_NATIVE_ONLY
        if(ok)ok=runtime.tick(action);
        if(!ok){native_frame(canvas);text(canvas,128,440,"JavaScript error - see host log",28,0xffff9090);}
        if(runtime.dirty||!ok){
#ifdef __PS4__
            double cpu=platform_now()-frameStart,presentStart=platform_now();
#endif
            if(!platform_present(canvas))ok=false;runtime.dirty=false;
#ifdef __PS4__
            cpuTotal+=cpu;if(cpu>cpuMax)cpuMax=cpu;presentTotal+=platform_now()-presentStart;
            if(++samples==30){char report[180];std::snprintf(report,sizeof report,"30 changed frames: CPU mean %.2f ms max %.2f ms; present mean %.2f ms (not idle FPS)",cpuTotal/samples,cpuMax,presentTotal/samples);platform_log("performance",report);samples=0;cpuTotal=cpuMax=presentTotal=0;}
#endif
        }
#endif
        ++frame;if(frames&&frame>=frames)running=false;platform_sleep(16.667-(platform_now()-frameStart));
    }
    if(capture)save_frame(canvas,capture);
#ifndef PS4_REACT_NATIVE_ONLY
    runtime.stop();
#endif
    platform_close();std::free(canvas.pixels);platform_log("shutdown",ok?"clean":"error");return ok?0:1;
}

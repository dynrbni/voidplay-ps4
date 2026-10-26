// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "input.hpp"
#include <orbis/libkernel.h>
#include <orbis/VideoOut.h>
#include <orbis/Pad.h>
#include <orbis/UserService.h>
#include <cstring>
#include <cstdio>
namespace ps4react {
namespace {
int video=-1,pad=-1,index=0; void* memory=nullptr; off_t offset=0; bool allocated=false,registered=false;
constexpr std::size_t slot=(static_cast<std::size_t>(width)*height*4+0x3fff)&~std::size_t(0x3fff);
constexpr std::size_t bytes=(slot*2+0x1fffff)&~std::size_t(0x1fffff);
void* buffers[2]; std::int64_t submitted=0; std::uint32_t buttons=0;
DirectionRepeat directions;
}
void platform_log(const char* stage,const char* message){char line[512];int n=std::snprintf(line,sizeof line,"[ps4-react][%s] %s\n",stage,message);if(n>0)sceKernelWrite(2,line,static_cast<std::size_t>(n)<sizeof line?static_cast<std::size_t>(n):sizeof line-1);}
double platform_now(){return static_cast<double>(sceKernelGetProcessTime())/1000.0;}
void platform_sleep(){sceKernelUsleep(16000);}
bool platform_open(){
    video=sceVideoOutOpen(ORBIS_VIDEO_USER_MAIN,ORBIS_VIDEO_OUT_BUS_MAIN,0,nullptr);
    if(video<0){platform_log("video","open failed");return false;}
    if(sceKernelAllocateDirectMemory(0,sceKernelGetDirectMemorySize(),bytes,0x200000,3,&offset)<0){platform_log("video","allocation failed");return false;}
    allocated=true;
    if(sceKernelMapDirectMemory(&memory,bytes,0x33,0,offset,0x200000)<0){memory=nullptr;platform_log("video","map failed");return false;}
    buffers[0]=memory;buffers[1]=static_cast<unsigned char*>(memory)+slot;
    OrbisVideoOutBufferAttribute attr{};
    // OpenOrbis graphics sample: 0x80000000 is the BGRA little-endian scanout format.
    sceVideoOutSetBufferAttribute(&attr,0x80000000,ORBIS_VIDEO_OUT_TILING_MODE_LINEAR,0,width,height,width);
    if(sceVideoOutRegisterBuffers(video,0,buffers,2,&attr)<0){platform_log("video","register failed");return false;}
    registered=true;if(sceVideoOutSetFlipRate(video,0)<0)return false;
    sceUserServiceInitialize(nullptr);
    int user=-1;
    if(sceUserServiceGetInitialUser(&user)==0 && scePadInit()==0)pad=scePadOpen(user,ORBIS_PAD_PORT_TYPE_STANDARD,0,nullptr);
    if(pad<0)platform_log("input","controller unavailable; PS menu remains available");
    return true;
}
bool platform_present(Canvas frame){
    if(!frame.valid()||!registered)return false;
    if(submitted){
        double end=platform_now()+2000;
        for(;;){OrbisVideoOutFlipStatus status{};if(sceVideoOutGetFlipStatus(video,&status)<0)return false;if(status.flipArg==submitted)break;if(platform_now()>end){platform_log("flip","timeout");return false;}sceKernelUsleep(1000);}
    }
    auto* target=static_cast<std::uint32_t*>(buffers[index]);
    for(int row=0;row<height;++row)std::memcpy(target+row*width,frame.pixels+row*frame.stride,width*4);
    if(sceVideoOutSubmitFlip(video,index,ORBIS_VIDEO_OUT_FLIP_VSYNC,++submitted)<0)return false;
    index=1-index;return true;
}
const char* platform_input(){
    if(pad<0)return nullptr;OrbisPadData data{};
    if(scePadReadState(pad,&data)<0||!data.connected){buttons=0;directions.reset();return nullptr;}
    auto pressed=data.buttons&~buttons;buttons=data.buttons;
    const char* move=directions.update(buttons&ORBIS_PAD_BUTTON_LEFT,buttons&ORBIS_PAD_BUTTON_RIGHT,
        buttons&ORBIS_PAD_BUTTON_UP,buttons&ORBIS_PAD_BUTTON_DOWN,
        static_cast<int>(data.leftStick.x)-128,static_cast<int>(data.leftStick.y)-128,platform_now());
    if(pressed&ORBIS_PAD_BUTTON_CROSS)return "confirm";
    if(pressed&ORBIS_PAD_BUTTON_CIRCLE)return "back";
    if(pressed&ORBIS_PAD_BUTTON_TRIANGLE)return "favorite";
    return move;
}
void platform_close(){
    if(pad>=0)scePadClose(pad);
    // Close scanout before unmapping its memory; process termination remains OS-owned.
    if(video>=0)sceVideoOutClose(video);
    if(memory)sceKernelMunmap(memory,bytes);
    if(allocated)sceKernelReleaseDirectMemory(offset,bytes);
}
}

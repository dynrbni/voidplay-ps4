// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <quickjs.h>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <new>
namespace ps4react {
namespace {
struct State { JSRuntime* rt=nullptr;JSContext* ctx=nullptr;Canvas canvas{};Runtime* owner=nullptr;double deadline=0;unsigned commands=0;bool failed=false; };
int interrupt(JSRuntime*,void* opaque){return platform_now()>static_cast<State*>(opaque)->deadline;}
void report(State* state){
    JSValue error=JS_GetException(state->ctx);
    const char* message=JS_ToCString(state->ctx,error);platform_log("javascript",message?message:"exception without message");if(message)JS_FreeCString(state->ctx,message);
    JSValue stack=JS_GetPropertyStr(state->ctx,error,"stack");const char* trace=JS_ToCString(state->ctx,stack);if(trace){platform_log("stack",trace);JS_FreeCString(state->ctx,trace);}JS_FreeValue(state->ctx,stack);JS_FreeValue(state->ctx,error);state->failed=true;
}
JSValue native(JSContext* ctx,JSValueConst,int argc,JSValueConst* argv,int magic){
    auto* state=static_cast<State*>(JS_GetContextOpaque(ctx));
    if(magic==5)return JS_NewFloat64(ctx,platform_now());
    if(magic==4){if(argc!=1)return JS_ThrowTypeError(ctx,"log needs one argument");const char* message=JS_ToCString(ctx,argv[0]);if(!message)return JS_EXCEPTION;platform_log("app",message);JS_FreeCString(ctx,message);return JS_UNDEFINED;}
    if(magic==3){state->owner->dirty=true;return JS_UNDEFINED;}
    if(++state->commands>2048)return JS_ThrowRangeError(ctx,"Frame command budget exceeded");
    if(magic==2){std::uint32_t color;if(argc!=1||JS_ToUint32(ctx,&color,argv[0])<0)return JS_ThrowTypeError(ctx,"clear needs a color");rect(state->canvas,0,0,state->canvas.w,state->canvas.h,color);state->commands=0;return JS_UNDEFINED;}
    if(argc!=5)return JS_ThrowTypeError(ctx,"Drawing command needs five arguments");
    int a[4]={};std::uint32_t color=0;
    for(int i=0;i<(magic==0?4:2);++i)if(JS_ToInt32(ctx,&a[i],argv[i])<0||a[i]<-16384||a[i]>16384)return JS_ThrowRangeError(ctx,"Coordinate out of range");
    if(JS_ToUint32(ctx,&color,argv[4])<0)return JS_EXCEPTION;
    if(magic==0)rect(state->canvas,a[0],a[1],a[2],a[3],color);
    else {
        std::size_t length=0;const char* value=JS_ToCStringLen(ctx,&length,argv[2]);if(!value)return JS_EXCEPTION;
        int size=0;bool valid=length<=2048&&JS_ToInt32(ctx,&size,argv[3])==0&&size>=7&&size<=112;
        if(valid)text(state->canvas,a[0],a[1],value,size,color);JS_FreeCString(ctx,value);
        if(!valid)return JS_ThrowRangeError(ctx,"Text length/font size out of range");
    }
    return JS_UNDEFINED;
}
bool call(State* state,const char* name,const char* action=nullptr){
    if(state->failed)return false;state->deadline=platform_now()+500;JS_UpdateStackTop(state->rt);
    JSValue global=JS_GetGlobalObject(state->ctx),fn=JS_GetPropertyStr(state->ctx,global,name);
    JSValue arg=action?JS_NewString(state->ctx,action):JS_NewFloat64(state->ctx,platform_now());
    JSValue result=JS_Call(state->ctx,fn,global,1,&arg);JS_FreeValue(state->ctx,arg);JS_FreeValue(state->ctx,fn);JS_FreeValue(state->ctx,global);
    if(JS_IsException(result)){report(state);return false;}JS_FreeValue(state->ctx,result);
    JSContext* job_ctx=nullptr;int status=0,jobs=0;
    while((status=JS_ExecutePendingJob(state->rt,&job_ctx))>0){if(++jobs>256||platform_now()>state->deadline){platform_log("javascript","Job budget exceeded");state->failed=true;return false;}}
    if(status<0){report(state);return false;}return true;
}
}
bool Runtime::start(Canvas canvas,const char* source,std::size_t length){
    stop();if(!canvas.valid()||!source||length>2000000)return false;
    void* memory=std::malloc(sizeof(State));if(!memory)return false;
    auto* s=new(memory) State{};state=s;s->canvas=canvas;s->owner=this;
    s->rt=JS_NewRuntime();if(!s->rt){stop();return false;}
    JS_SetMemoryLimit(s->rt,32*1024*1024);JS_SetMaxStackSize(s->rt,512*1024);JS_SetInterruptHandler(s->rt,interrupt,s);
    s->ctx=JS_NewContext(s->rt);if(!s->ctx){stop();return false;}JS_SetContextOpaque(s->ctx,s);
    JSValue global=JS_GetGlobalObject(s->ctx),api=JS_NewObject(s->ctx);
    const char* names[]={"rect","text","clear","commit","log","now"};
    for(int i=0;i<6;i++)JS_SetPropertyStr(s->ctx,api,names[i],JS_NewCFunctionMagic(s->ctx,native,names[i],5,JS_CFUNC_generic_magic,i));
    JS_SetPropertyStr(s->ctx,global,"__ps4Native",api);JS_FreeValue(s->ctx,global);
    s->deadline=platform_now()+2000;JS_UpdateStackTop(s->rt);
    JSValue result=JS_Eval(s->ctx,source,length,"hello-world.bundle.js",JS_EVAL_TYPE_GLOBAL);
    bool ok=!JS_IsException(result);if(!ok)report(s);JS_FreeValue(s->ctx,result);
    if(ok)platform_log("runtime","React bundle evaluated");return ok;
}
bool Runtime::tick(const char* action){auto* s=static_cast<State*>(state);if(!s)return false;if(action&&!call(s,"__ps4Input",action))return false;return call(s,"__ps4Tick");}
void Runtime::stop(){auto* s=static_cast<State*>(state);if(!s)return;if(s->ctx){if(!s->failed)call(s,"__ps4Dispose");JS_FreeContext(s->ctx);}if(s->rt){JS_RunGC(s->rt);JS_FreeRuntime(s->rt);}s->~State();std::free(s);state=nullptr;}
}

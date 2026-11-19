// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include "scene.hpp"
#include <quickjs.h>
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <new>
namespace ps4react {
namespace {
struct State { JSRuntime* rt=nullptr;JSContext* ctx=nullptr;Canvas canvas{};Runtime* owner=nullptr;Scene scene;double deadline=0;unsigned commands=0;bool failed=false;Clip clip{}; };
int interrupt(JSRuntime*,void* opaque){return platform_now()>static_cast<State*>(opaque)->deadline;}
void report(State* state){
    JSValue error=JS_GetException(state->ctx);
    const char* message=JS_ToCString(state->ctx,error);platform_log("javascript",message?message:"exception without message");if(message)JS_FreeCString(state->ctx,message);
    JSValue stack=JS_GetPropertyStr(state->ctx,error,"stack");const char* trace=JS_ToCString(state->ctx,stack);if(trace){platform_log("stack",trace);JS_FreeCString(state->ctx,trace);}JS_FreeValue(state->ctx,stack);JS_FreeValue(state->ctx,error);state->failed=true;
}
/* Text metrics are explicit arguments, so the rasterizer never has to guess a
   weight or a line box. Returns JS_EXCEPTION (with ok false) on a bad argument. */
JSValue read_text_style(JSContext* ctx,int argc,JSValueConst* argv,int base,TextStyle& style,bool& ok){
    ok=false;
    if(argc<base+5)return JS_ThrowTypeError(ctx,"text metrics need size, weight, wrap width, line height and tracking");
    int size=0,weight=0,wrap=0,lineHeight=0,letterSpacing=0;
    if(JS_ToInt32(ctx,&size,argv[base])<0||JS_ToInt32(ctx,&weight,argv[base+1])<0||JS_ToInt32(ctx,&wrap,argv[base+2])<0||JS_ToInt32(ctx,&lineHeight,argv[base+3])<0)return JS_EXCEPTION;
    if(JS_ToInt32(ctx,&letterSpacing,argv[base+4])<0)return JS_EXCEPTION;
    if(size<7||size>112)return JS_ThrowRangeError(ctx,"Text size must be 7..112");
    if(weight<100||weight>900)return JS_ThrowRangeError(ctx,"Text weight must be 100..900");
    if(wrap<0||wrap>8192||lineHeight<0||lineHeight>1024||letterSpacing<-64||letterSpacing>256)return JS_ThrowRangeError(ctx,"Text metrics out of range");
    style.size=size;style.weight=weight;style.wrap=wrap;style.lineHeight=lineHeight;style.letterSpacing=letterSpacing;ok=true;
    return JS_UNDEFINED;
}
int read_span(JSContext* ctx,int argc,JSValueConst* argv,int first,int count,int* values,int low,int high){
    if(argc<first+count)return -1;
    for(int i=0;i<count;++i)if(JS_ToInt32(ctx,&values[i],argv[first+i])<0)return -1;
    for(int i=0;i<count;++i)if(values[i]<low||values[i]>high)return -2;
    return 0;
}
JSValue native(JSContext* ctx,JSValueConst,int argc,JSValueConst* argv,int magic){
    auto* state=static_cast<State*>(JS_GetContextOpaque(ctx));
    if(magic==5)return JS_NewFloat64(ctx,platform_now());
    if(magic==4){if(argc!=1)return JS_ThrowTypeError(ctx,"log needs one argument");const char* message=JS_ToCString(ctx,argv[0]);if(!message)return JS_EXCEPTION;platform_log("app",message);JS_FreeCString(ctx,message);return JS_UNDEFINED;}
    if(magic==3){if(state->scene.finish(platform_now()))state->owner->dirty=true;return JS_UNDEFINED;}
    if(magic==10){if(state->scene.set_motion(JS_ToBool(ctx,argv[0])>0))state->owner->dirty=true;return JS_UNDEFINED;}
    if(magic==8){char buffer[65537];int count=preferences_read(buffer,sizeof buffer);if(count<0)return JS_ThrowInternalError(ctx,"Cannot read Voidplay preferences");return JS_NewStringLen(ctx,buffer,count);}
    if(magic==9){std::size_t length=0;if(argc!=1)return JS_ThrowTypeError(ctx,"save needs one JSON string");const char* value=JS_ToCStringLen(ctx,&length,argv[0]);if(!value)return JS_EXCEPTION;bool ok=preferences_write(value,length);JS_FreeCString(ctx,value);if(!ok)return JS_ThrowInternalError(ctx,"Cannot save Voidplay preferences; session changes remain usable");return JS_UNDEFINED;}
    if(magic==13){char report[512];int written=media_font_report(report,sizeof report);return JS_NewStringLen(ctx,report,written>0?static_cast<std::size_t>(written):0);}
    if(magic==11){ /* Clip state, not a draw command: it never consumes the frame budget. */
        if(argc==0){state->clip=Clip{};return JS_UNDEFINED;}
        int values[4]{};
        if(argc!=4)return JS_ThrowTypeError(ctx,"clip needs four numbers or none");
        int status=read_span(ctx,argc,argv,0,4,values,-16384,16384);
        if(status<0)return status==-1?JS_EXCEPTION:JS_ThrowRangeError(ctx,"Clip bounds out of range");
        state->clip=Clip{values[0],values[1],values[2],values[3]};return JS_UNDEFINED;
    }
    if(magic==12){ /* Measurement, not a draw command: layout asks before it paints. */
        if(argc!=6)return JS_ThrowTypeError(ctx,"measure needs a string and five metrics");
        std::size_t length=0;const char* value=JS_ToCStringLen(ctx,&length,argv[0]);if(!value)return JS_EXCEPTION;
        TextStyle style;bool ok=false;JSValue metrics=read_text_style(ctx,argc,argv,1,style,ok);
        if(!ok){JS_FreeCString(ctx,value);return metrics;}
        JS_FreeValue(ctx,metrics);
        if(length>2048){JS_FreeCString(ctx,value);return JS_ThrowRangeError(ctx,"Text length out of range");}
        int width=0,height=0;text_extent(value,style,width,height);JS_FreeCString(ctx,value);
        JSValue result=JS_NewArray(ctx);JS_SetPropertyUint32(ctx,result,0,JS_NewInt32(ctx,width));JS_SetPropertyUint32(ctx,result,1,JS_NewInt32(ctx,height));return result;
    }
    if(++state->commands>2048)return JS_ThrowRangeError(ctx,"Frame command budget exceeded");
    if(magic==2){std::uint32_t color;if(argc!=1||JS_ToUint32(ctx,&color,argv[0])<0)return JS_ThrowTypeError(ctx,"clear needs a color");state->scene.begin(state->canvas,color);state->commands=0;state->clip=Clip{};return JS_UNDEFINED;}
    if(magic==6){
        if(argc!=5&&argc!=6)return JS_ThrowTypeError(ctx,"image needs bounds, asset ID and optional fit mode");
        int fit=0;if(argc==6&&(JS_ToInt32(ctx,&fit,argv[5])<0||fit<0||fit>2))return JS_ThrowRangeError(ctx,"Unknown image fit mode");
        int values[4]{};if(read_span(ctx,argc,argv,0,4,values,-8192,8192)<0)return JS_ThrowRangeError(ctx,"Image bounds invalid");
        std::size_t length=0;const char* name=JS_ToCStringLen(ctx,&length,argv[4]);if(!name)return JS_EXCEPTION;
        if(length<=80&&!has_image(name)){
          platform_log("missing-image",name);JS_FreeCString(ctx,name);return JS_FALSE;
        }
        bool ok=length<=80&&values[2]>0&&values[3]>0&&state->scene.add(2,values[0],values[1],values[2],values[3],0,0,0,name,TextStyle{},state->clip,fit);
        char message[192];
        std::snprintf(message,sizeof message,"Unknown image \"%.*s\" or invalid bounds (%d,%d,%d,%d)",static_cast<int>(length>80?80:length),name,values[0],values[1],values[2],values[3]);
        JS_FreeCString(ctx,name);
        return ok?JS_UNDEFINED:JS_ThrowTypeError(ctx,"%s",message);
    }
    if(magic==7){
        if(argc!=6)return JS_ThrowTypeError(ctx,"box needs six arguments");int values[4]{},radius=0;std::uint32_t color;
        if(read_span(ctx,argc,argv,0,4,values,-8192,8192)<0)return JS_ThrowRangeError(ctx,"Box bounds invalid");
        if(JS_ToUint32(ctx,&color,argv[4])<0||JS_ToInt32(ctx,&radius,argv[5])<0||radius<0||radius>512)return JS_ThrowRangeError(ctx,"Box radius invalid");
        if(!state->scene.add(3,values[0],values[1],values[2],values[3],0,radius,color,"",TextStyle{},state->clip))return JS_ThrowRangeError(ctx,"Scene command budget exceeded");return JS_UNDEFINED;
    }
    if(magic==14){
        if(argc!=7)return JS_ThrowTypeError(ctx,"stroke needs bounds, width, color and radius");
        int values[4]{},stroke=0,radius=0;std::uint32_t color=0;
        if(read_span(ctx,argc,argv,0,4,values,-8192,8192)<0)return JS_ThrowRangeError(ctx,"Stroke bounds invalid");
        if(JS_ToInt32(ctx,&stroke,argv[4])<0||JS_ToUint32(ctx,&color,argv[5])<0||JS_ToInt32(ctx,&radius,argv[6])<0)return JS_EXCEPTION;
        if(stroke<1||stroke>64||radius<0||radius>512)return JS_ThrowRangeError(ctx,"Stroke width or radius out of range");
        if(!state->scene.add(4,values[0],values[1],values[2],values[3],stroke,radius,color,"",TextStyle{},state->clip))return JS_ThrowRangeError(ctx,"Scene command budget exceeded");
        return JS_UNDEFINED;
    }
    if(magic==0){
        if(argc!=5)return JS_ThrowTypeError(ctx,"Drawing command needs five arguments");
        int values[4]{};std::uint32_t color=0;
        if(read_span(ctx,argc,argv,0,4,values,-16384,16384)<0)return JS_ThrowRangeError(ctx,"Coordinate out of range");
        if(JS_ToUint32(ctx,&color,argv[4])<0)return JS_EXCEPTION;
        if(!state->scene.add(0,values[0],values[1],values[2],values[3],0,0,color,"",TextStyle{},state->clip))return JS_ThrowRangeError(ctx,"Scene command budget exceeded");
        return JS_UNDEFINED;
    }
    if(argc!=9)return JS_ThrowTypeError(ctx,"text needs nine arguments");
    int coordinates[2]{};if(read_span(ctx,argc,argv,0,2,coordinates,-16384,16384)<0)return JS_ThrowRangeError(ctx,"Coordinate out of range");
    std::size_t length=0;const char* value=JS_ToCStringLen(ctx,&length,argv[2]);if(!value)return JS_EXCEPTION;
    TextStyle style;bool ok=false;JSValue metrics=read_text_style(ctx,argc,argv,3,style,ok);
    if(!ok){JS_FreeCString(ctx,value);return metrics;}
    JS_FreeValue(ctx,metrics);
    std::uint32_t color=0;if(ok&&JS_ToUint32(ctx,&color,argv[8])<0)ok=false;
    if(length>2048)ok=false;
    int width=0,height=0;
    if(ok){text_extent(value,style,width,height);ok=state->scene.add(1,coordinates[0],coordinates[1],width,height,style.size,0,color,value,style,state->clip);}
    JS_FreeCString(ctx,value);
    if(!ok)return JS_ThrowRangeError(ctx,"Text length out of range");
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
    const char* names[]={"rect","text","clear","commit","log","now","image","box","loadPreferences","savePreferences","motion","clip","measure","diagnostics","stroke"};
    for(int i=0;i<15;i++)JS_SetPropertyStr(s->ctx,api,names[i],JS_NewCFunctionMagic(s->ctx,native,names[i],9,JS_CFUNC_generic_magic,i));
    JS_SetPropertyStr(s->ctx,global,"__ps4Native",api);JS_FreeValue(s->ctx,global);
    char diagnostics[512];int written=media_font_report(diagnostics,sizeof diagnostics);
    platform_log("assets",diagnostics);if(written<=0)platform_log("assets","asset diagnostics unavailable");
    s->deadline=platform_now()+2000;JS_UpdateStackTop(s->rt);
    JSValue result=JS_Eval(s->ctx,source,length,"hello-world.bundle.js",JS_EVAL_TYPE_GLOBAL);
    bool ok=!JS_IsException(result);if(!ok)report(s);JS_FreeValue(s->ctx,result);
    if(ok)platform_log("runtime","React bundle evaluated");return ok;
}
bool Runtime::tick(const char* action){auto* s=static_cast<State*>(state);if(!s)return false;if(action&&!call(s,"__ps4Input",action))return false;bool ok=call(s,"__ps4Tick");if(s->scene.animate(platform_now()))dirty=true;return ok;}
bool Runtime::inspect(char* output,std::size_t capacity){
 auto* s=static_cast<State*>(state);if(!s||!output||capacity<2||s->failed)return false;
 s->deadline=platform_now()+500;JS_UpdateStackTop(s->rt);
 JSValue global=JS_GetGlobalObject(s->ctx),fn=JS_GetPropertyStr(s->ctx,global,"__ps4Inspect");
 JSValue result=JS_Call(s->ctx,fn,global,0,nullptr);JS_FreeValue(s->ctx,fn);JS_FreeValue(s->ctx,global);
 if(JS_IsException(result)){report(s);return false;}
 std::size_t length=0;const char* value=JS_ToCStringLen(s->ctx,&length,result);
 bool ok=value&&length<capacity;if(ok)std::memcpy(output,value,length+1);
 if(value)JS_FreeCString(s->ctx,value);JS_FreeValue(s->ctx,result);return ok;
}
void Runtime::stop(){auto* s=static_cast<State*>(state);if(!s)return;if(s->ctx){if(!s->failed)call(s,"__ps4Dispose");JS_FreeContext(s->ctx);}if(s->rt){JS_RunGC(s->rt);JS_FreeRuntime(s->rt);}s->~State();std::free(s);state=nullptr;}
}

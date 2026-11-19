// SPDX-License-Identifier: GPL-3.0-only
#define _POSIX_C_SOURCE 200809L
#include "host.hpp"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cerrno>
#include <sys/stat.h>
#include <unistd.h>
namespace ps4react {
namespace {
bool location(char* directory,std::size_t size){
#ifdef __PS4__
    return std::snprintf(directory,size,"/data/voidplay")<static_cast<int>(size);
#else
    const char* configured=std::getenv("VOIDPLAY_STATE_DIR");
    if(configured)return std::snprintf(directory,size,"%s",configured)<static_cast<int>(size);
    const char* home=std::getenv("HOME");
    return home&&std::snprintf(directory,size,"%s/Library/Application Support/Voidplay",home)<static_cast<int>(size);
#endif
}
}
int preferences_read(char* output,std::size_t capacity){
    char directory[1024],path[1100];if(!output||capacity<65537||!location(directory,sizeof directory))return -1;
    std::snprintf(path,sizeof path,"%s/preferences.json",directory);
    FILE* file=std::fopen(path,"rb");if(!file){output[0]=0;return errno==ENOENT?0:-1;}
    std::size_t count=std::fread(output,1,65537,file);bool ok=!std::ferror(file)&&count<=65536;
    std::fclose(file);if(!ok)return -1;output[count]=0;return static_cast<int>(count);
}
bool preferences_write(const char* value,std::size_t length){
    char directory[1024],path[1100],temporary[1100];
    if(!value||length>65536||!location(directory,sizeof directory))return false;
    if(mkdir(directory,0700)!=0&&errno!=EEXIST)return false;
    std::snprintf(path,sizeof path,"%s/preferences.json",directory);
    std::snprintf(temporary,sizeof temporary,"%s/preferences.tmp",directory);
    FILE* file=std::fopen(temporary,"wb");if(!file)return false;
    bool ok=std::fwrite(value,1,length,file)==length;
    if(std::fflush(file)!=0||fsync(fileno(file))!=0)ok=false;
    if(std::fclose(file)!=0)ok=false;
    if(ok&&std::rename(temporary,path)==0)return true;
    std::remove(temporary);return false;
}
}

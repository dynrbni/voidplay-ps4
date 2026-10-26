// SPDX-License-Identifier: GPL-3.0-only
#pragma once
namespace ps4react {
class DirectionRepeat {
    int held=0;
    double next=0;
public:
    const char* update(bool left,bool right,bool up,bool down,int x,int y,double now){
        int direction=0;
        if(left!=right)direction=left?1:2;
        else if(up!=down)direction=up?3:4;
        else {
            int ax=x<0?-x:x,ay=y<0?-y:y;
            if(ax>=50||ay>=50)direction=ax>=ay?(x<0?1:2):(y<0?3:4);
        }
        if(!direction){held=0;next=0;return nullptr;}
        bool changed=direction!=held;
        if(!changed&&now<next)return nullptr;
        held=direction;next=now+(changed?350:140);
        return direction==1?"left":direction==2?"right":direction==3?"up":"down";
    }
    void reset(){held=0;next=0;}
};
}

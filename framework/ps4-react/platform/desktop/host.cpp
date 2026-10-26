// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <SDL.h>
#include <cstdio>
#include <cstdlib>
namespace ps4react {
namespace { SDL_Window* window; SDL_Renderer* renderer; SDL_Texture* texture; SDL_GameController* controller; }
bool platform_open() {
    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMECONTROLLER) != 0) return false;
    window = SDL_CreateWindow("PS4 React - native Mac preview", SDL_WINDOWPOS_CENTERED, SDL_WINDOWPOS_CENTERED, 1280,720, SDL_WINDOW_RESIZABLE);
    if (!window) return false;
    renderer = SDL_CreateRenderer(window,-1,SDL_RENDERER_SOFTWARE);
    if (!renderer) return false;
    SDL_RenderSetLogicalSize(renderer,width,height);
    texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, width,height);
    for (int i=0;i<SDL_NumJoysticks();++i) if (SDL_IsGameController(i)) { controller=SDL_GameControllerOpen(i); break; }
    if(std::getenv("PS4_REACT_SMOKE_INPUT")){SDL_Event event{};event.type=SDL_KEYDOWN;event.key.keysym.sym=SDLK_RETURN;SDL_PushEvent(&event);}
    return texture != nullptr;
}
bool platform_present(Canvas frame) {
    if (!frame.valid() || SDL_UpdateTexture(texture,nullptr,frame.pixels,frame.stride*4) != 0) return false;
    SDL_RenderClear(renderer); if (SDL_RenderCopy(renderer,texture,nullptr,nullptr) != 0) return false;
    SDL_RenderPresent(renderer); return true;
}
const char* platform_input() {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type==SDL_QUIT) return "exit";
        if (event.type==SDL_KEYDOWN && !event.key.repeat) {
            if(event.key.keysym.sym==SDLK_ESCAPE) return "exit";
            if(event.key.keysym.sym==SDLK_RETURN) return "confirm";
            if(event.key.keysym.sym==SDLK_BACKSPACE) return "back";
        }
        if(event.type==SDL_CONTROLLERBUTTONDOWN) {
            if(event.cbutton.button==SDL_CONTROLLER_BUTTON_A) return "confirm";
            if(event.cbutton.button==SDL_CONTROLLER_BUTTON_B) return "back";
        }
        if(event.type==SDL_CONTROLLERDEVICEADDED && !controller && SDL_IsGameController(event.cdevice.which)) controller=SDL_GameControllerOpen(event.cdevice.which);
        if(event.type==SDL_CONTROLLERDEVICEREMOVED && controller && event.cdevice.which==SDL_JoystickInstanceID(SDL_GameControllerGetJoystick(controller))) {SDL_GameControllerClose(controller);controller=nullptr;}
    }
    return nullptr;
}
void platform_close() { if(controller) SDL_GameControllerClose(controller); if(texture)SDL_DestroyTexture(texture);if(renderer)SDL_DestroyRenderer(renderer);if(window)SDL_DestroyWindow(window);SDL_Quit(); }
void platform_log(const char* stage,const char* message){std::fprintf(stderr,"[ps4-react][%s] %s\n",stage,message);}
double platform_now(){return SDL_GetTicks64();}
void platform_sleep(){SDL_Delay(16);}
}

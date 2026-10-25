// SPDX-License-Identifier: GPL-3.0-only
#include "voidplay/host.hpp"
#include <SDL.h>
#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <memory>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
struct Options {
    int width = 1920;
    int height = 1080;
    int frames = 0;
    bool self_test = false;
    std::string capture;
};

int number(const char* value, int low, int high) {
    char* end = nullptr;
    const long n = std::strtol(value, &end, 10);
    if (end == value || *end || n < low || n > high) throw std::runtime_error("Numeric argument outside supported bounds.");
    return static_cast<int>(n);
}

Options options(int argc, char** argv) {
    Options result;
    for (int i = 1; i < argc; ++i) {
        const std::string arg = argv[i];
        if (arg == "--self-test") result.self_test = true;
        else if (i + 1 < argc && arg == "--width") result.width = number(argv[++i], 640, 4096);
        else if (i + 1 < argc && arg == "--height") result.height = number(argv[++i], 360, 2160);
        else if (i + 1 < argc && arg == "--frames") result.frames = number(argv[++i], 1, 36000);
        else if (i + 1 < argc && arg == "--capture") result.capture = argv[++i];
        else throw std::runtime_error("Usage: preview [--width 1920 --height 1080] [--frames N] [--capture frame.bmp] [--self-test]");
    }
    if (result.self_test) result.frames = 6;
    return result;
}

struct SDLSession {
    SDLSession() {
        if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_GAMECONTROLLER | SDL_INIT_EVENTS) < 0)
            throw std::runtime_error(SDL_GetError());
    }
    ~SDLSession() { SDL_Quit(); }
};

class DesktopInput final : public voidplay::Input {
    using Controller = std::unique_ptr<SDL_GameController, decltype(&SDL_GameControllerClose)>;
    Controller controller_{nullptr, SDL_GameControllerClose};
    void connect(int index) {
        if (!controller_ && SDL_IsGameController(index)) controller_.reset(SDL_GameControllerOpen(index));
        if (controller_) std::fprintf(stderr, "[mac] Controller opened; this is not PS4 host validation.\n");
    }
public:
    DesktopInput() {
        for (int i = 0; i < SDL_NumJoysticks() && !controller_; ++i) connect(i);
    }
    voidplay::Action poll() override {
        using A = voidplay::Action;
        SDL_Event event{};
        SDL_PumpEvents();
        while (SDL_PeepEvents(&event, 1, SDL_GETEVENT, SDL_FIRSTEVENT, SDL_LASTEVENT) > 0) {
            if (event.type == SDL_QUIT) return A::exit;
            if (event.type == SDL_CONTROLLERDEVICEADDED) connect(event.cdevice.which);
            if (event.type == SDL_CONTROLLERDEVICEREMOVED && controller_
                && SDL_JoystickInstanceID(SDL_GameControllerGetJoystick(controller_.get())) == event.cdevice.which) controller_.reset();
            if (event.type == SDL_KEYDOWN) {
                switch (event.key.keysym.sym) {
                    case SDLK_LEFT: return A::left;
                    case SDLK_RIGHT: return A::right;
                    case SDLK_RETURN: if (!event.key.repeat) return A::confirm; break;
                    case SDLK_BACKSPACE: return A::back;
                    case SDLK_ESCAPE: return A::exit;
                    default: break;
                }
            }
            if (event.type == SDL_CONTROLLERBUTTONDOWN) {
                switch (event.cbutton.button) {
                    case SDL_CONTROLLER_BUTTON_DPAD_LEFT: return A::left;
                    case SDL_CONTROLLER_BUTTON_DPAD_RIGHT: return A::right;
                    case SDL_CONTROLLER_BUTTON_A: return A::confirm;
                    case SDL_CONTROLLER_BUTTON_B: return A::back;
                    case SDL_CONTROLLER_BUTTON_START: return A::exit;
                    default: break;
                }
            }
        }
        return A::none;
    }
};

class DesktopPresenter final : public voidplay::Presenter {
    int width_;
    int height_;
    std::unique_ptr<SDL_Window, decltype(&SDL_DestroyWindow)> window_{nullptr, SDL_DestroyWindow};
    std::unique_ptr<SDL_Renderer, decltype(&SDL_DestroyRenderer)> renderer_{nullptr, SDL_DestroyRenderer};
    std::unique_ptr<SDL_Texture, decltype(&SDL_DestroyTexture)> texture_{nullptr, SDL_DestroyTexture};
public:
    DesktopPresenter(int width, int height) : width_(width), height_(height) {
        window_.reset(SDL_CreateWindow("Voidplay Native - Mac display test - PS4 unverified", SDL_WINDOWPOS_CENTERED,
            SDL_WINDOWPOS_CENTERED, 1280, 720, SDL_WINDOW_RESIZABLE | SDL_WINDOW_ALLOW_HIGHDPI));
        if (!window_) throw std::runtime_error(SDL_GetError());
        renderer_.reset(SDL_CreateRenderer(window_.get(), -1, SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC));
        if (!renderer_) renderer_.reset(SDL_CreateRenderer(window_.get(), -1, SDL_RENDERER_SOFTWARE));
        if (!renderer_ || SDL_RenderSetLogicalSize(renderer_.get(), width, height) < 0) throw std::runtime_error(SDL_GetError());
        texture_.reset(SDL_CreateTexture(renderer_.get(), SDL_PIXELFORMAT_ARGB8888, SDL_TEXTUREACCESS_STREAMING, width, height));
        if (!texture_) throw std::runtime_error(SDL_GetError());
    }
    bool present(voidplay::Surface f) override {
        if (!f.valid() || f.width != width_ || f.height != height_
            || SDL_UpdateTexture(texture_.get(), nullptr, f.pixels, f.stride * 4) < 0
            || SDL_RenderClear(renderer_.get()) < 0 || SDL_RenderCopy(renderer_.get(), texture_.get(), nullptr, nullptr) < 0) return false;
        SDL_RenderPresent(renderer_.get());
        return true;
    }
};

void capture(voidplay::Surface f, const std::string& path) {
    if (path.empty()) return;
    std::unique_ptr<SDL_Surface, decltype(&SDL_FreeSurface)> image(
        SDL_CreateRGBSurfaceWithFormatFrom(f.pixels, f.width, f.height, 32, f.stride * 4, SDL_PIXELFORMAT_ARGB8888), SDL_FreeSurface);
    if (!image || SDL_SaveBMP(image.get(), path.c_str()) < 0) throw std::runtime_error(SDL_GetError());
}

void inject_test_event(int frame) {
    SDL_Event event{};
    if (frame == 1) {
        event.type = SDL_CONTROLLERBUTTONDOWN;
        event.cbutton.button = SDL_CONTROLLER_BUTTON_A;
    } else {
        event.type = SDL_KEYDOWN;
        const SDL_Keycode keys[] = {SDLK_RIGHT, SDLK_RETURN, SDLK_BACKSPACE, SDLK_RIGHT, SDLK_RETURN, SDLK_ESCAPE};
        event.key.keysym.sym = keys[frame];
    }
    if (SDL_PushEvent(&event) != 1) throw std::runtime_error(SDL_GetError());
}
}

int main(int argc, char** argv) {
    try {
        const auto config = options(argc, argv);
        SDLSession session;
        DesktopPresenter presenter(config.width, config.height);
        DesktopInput input;
        std::vector<std::uint32_t> pixels(static_cast<std::size_t>(config.width) * config.height);
        voidplay::Surface surface{pixels.data(), config.width, config.height, config.width, pixels.size()};
        voidplay::Scene scene;
        std::fprintf(stderr, "[mac] native window, ARGB8888 %dx%d; all console services unavailable.\n", config.width, config.height);
        unsigned frames = 0;
        double raster_ms = 0;
        while (scene.running && (!config.frames || frames < static_cast<unsigned>(config.frames))) {
            if (config.self_test) inject_test_event(static_cast<int>(frames));
            for (auto action = input.poll(); action != voidplay::Action::none; action = input.poll()) scene.dispatch(action);
            const auto start = std::chrono::steady_clock::now();
            if (!voidplay::render_scene(surface, scene)) throw std::runtime_error("Invalid framebuffer.");
            raster_ms += std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
            if (!presenter.present(surface)) throw std::runtime_error(SDL_GetError());
            ++frames;
            SDL_Delay(1);
        }
        if (config.self_test && (scene.running || scene.focus != 1 || scene.activations != 1 || frames != 6)) {
            std::fprintf(stderr, "[mac] self-test state: running=%d focus=%d confirm=%u frames=%u\n", scene.running, scene.focus, scene.activations, frames);
            throw std::runtime_error("SDL event-loop self-test failed.");
        }
        capture(surface, config.capture);
        std::fprintf(stderr, "[mac] presented=%u mean_raster_ms=%.3f focus=%d confirm=%u; orderly shutdown.\n",
            frames, frames ? raster_ms / frames : 0, scene.focus, scene.activations);
        if (config.self_test) std::fprintf(stderr, "[mac] SDL keyboard/synthetic controller/reset/exit test passed; physical controller not tested.\n");
        return 0;
    } catch (const std::exception& error) {
        std::fprintf(stderr, "Voidplay native preview: %s\n", error.what());
        return 1;
    }
}

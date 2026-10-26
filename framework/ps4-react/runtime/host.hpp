// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <cstddef>
#include <cstdint>
namespace ps4react {
constexpr int width = 1920, height = 1080;
struct Canvas { std::uint32_t* pixels; int w, h, stride; std::size_t capacity; bool valid() const; };
void rect(Canvas, int x, int y, int w, int h, std::uint32_t color);
void text(Canvas, int x, int y, const char*, int size, std::uint32_t color);
bool image(Canvas, int x, int y, int w, int h, const char* asset);
bool font_text(Canvas, int x, int y, const char*, int size, std::uint32_t color);
void rounded_box(Canvas, int x, int y, int w, int h, std::uint32_t color, int radius);
int preferences_read(char*, std::size_t capacity);
bool preferences_write(const char*, std::size_t length);
void native_frame(Canvas);
bool platform_open();
bool platform_present(Canvas);
const char* platform_input();
void platform_close();
void platform_log(const char* stage, const char* message);
double platform_now();
void platform_sleep();
class Runtime {
public:
    bool start(Canvas, const char* source, std::size_t length);
    bool tick(const char* action = nullptr);
    void stop();
    bool dirty = true;
    void* state = nullptr;
};
}

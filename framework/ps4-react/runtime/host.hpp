// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <cstddef>
#include <cstdint>
namespace ps4react {
constexpr int width = 1920, height = 1080;
struct Canvas { std::uint32_t* pixels; int w, h, stride; std::size_t capacity; bool valid() const; };
/* A clip rectangle in canvas coordinates. A non-positive width or height means
   "clip only to the surface", so unscrolled callers need no clip argument. */
struct Clip {
    int x = 0, y = 0, w = 0, h = 0;
};
inline bool clipped(const Clip& clip) { return clip.w > 0 && clip.h > 0; }
/* Explicit text style: a weight is always carried, so a semibold request can
   never silently render as regular. `wrap` of 0 means no automatic wrapping. */
struct TextStyle {
    int size = 28;
    int weight = 400;
    int wrap = 0;
    int lineHeight = 0;
    int letterSpacing = 0;
};
void rect(Canvas, int x, int y, int w, int h, std::uint32_t color, Clip clip = {});
void text(Canvas, int x, int y, const char* value, const TextStyle& style, std::uint32_t color, Clip clip = {});
bool image(Canvas, int x, int y, int w, int h, const char* asset, Clip clip = {}, int fit = 0);
bool has_image(const char* asset);
bool font_text(Canvas, int x, int y, const char* value, const TextStyle& style, std::uint32_t color, Clip clip = {});
void text_extent(const char* value, const TextStyle& style, int& w, int& h);
void rounded_box(Canvas, int x, int y, int w, int h, std::uint32_t color, int radius, Clip clip = {});
void rounded_stroke(Canvas, int x, int y, int w, int h, int stroke, std::uint32_t color, int radius, Clip clip = {});
const char* media_font_family();
int media_font_report(char* output, std::size_t capacity);
int media_image_count();
int preferences_read(char*, std::size_t capacity);
bool preferences_write(const char*, std::size_t length);
void native_frame(Canvas);
bool platform_open();
bool platform_present(Canvas);
const char* platform_input();
void platform_close();
void platform_log(const char* stage, const char* message);
double platform_now();
void platform_sleep(double milliseconds=16.667);
class Runtime {
public:
    bool start(Canvas, const char* source, std::size_t length);
    bool tick(const char* action = nullptr);
    bool inspect(char* output, std::size_t capacity);
    void stop();
    bool dirty = true;
    void* state = nullptr;
};
}

// SPDX-License-Identifier: GPL-3.0-only
#include "voidplay/host.hpp"
#include <algorithm>
#include <cstdio>
#include <cstdint>

namespace voidplay {
bool Surface::valid() const {
    return pixels && width > 0 && width <= 4096 && height > 0 && height <= 2160
        && stride >= width && stride <= 8192
        && static_cast<std::size_t>(stride) * static_cast<std::size_t>(height) <= capacity;
}

void fill_rect(Surface f, int x, int y, int width, int height, std::uint32_t color) {
    if (!f.valid() || width <= 0 || height <= 0) return;
    const int left = std::clamp(x, 0, f.width);
    const int top = std::clamp(y, 0, f.height);
    const auto right = std::clamp<std::int64_t>(static_cast<std::int64_t>(x) + width, 0, f.width);
    const auto bottom = std::clamp<std::int64_t>(static_cast<std::int64_t>(y) + height, 0, f.height);
    for (int row = top; row < bottom; ++row) {
        if (right > left) std::fill(f.pixels + row * f.stride + left, f.pixels + row * f.stride + right, color);
    }
}

void Scene::dispatch(Action action) {
    switch (action) {
        case Action::left: focus = (focus + 2) % 3; break;
        case Action::right: focus = (focus + 1) % 3; break;
        case Action::confirm: ++activations; break;
        case Action::back: focus = 0; activations = 0; break;
        case Action::exit: running = false; break;
        case Action::none: break;
    }
}

namespace {
// A small ASCII diagnostic font keeps the first frame independent of asset decoders.
constexpr std::uint8_t glyphs[][7] = {
    {14,17,17,31,17,17,17}, {30,17,17,30,17,17,30}, {14,17,16,16,16,17,14},
    {30,17,17,17,17,17,30}, {31,16,16,30,16,16,31}, {31,16,16,30,16,16,16},
    {14,17,16,23,17,17,15}, {17,17,17,31,17,17,17}, {31,4,4,4,4,4,31},
    {7,2,2,2,18,18,12}, {17,18,20,24,20,18,17}, {16,16,16,16,16,16,31},
    {17,27,21,21,17,17,17}, {17,25,21,19,17,17,17}, {14,17,17,17,17,17,14},
    {30,17,17,30,16,16,16}, {14,17,17,17,21,18,13}, {30,17,17,30,20,18,17},
    {15,16,16,14,1,1,30}, {31,4,4,4,4,4,4}, {17,17,17,17,17,17,14},
    {17,17,17,17,17,10,4}, {17,17,17,21,21,21,10}, {17,17,10,4,10,17,17},
    {17,17,10,4,4,4,4}, {31,1,2,4,8,16,31},
    {14,17,19,21,25,17,14}, {4,12,4,4,4,4,14}, {14,17,1,2,4,8,31},
    {30,1,1,14,1,1,30}, {2,6,10,18,31,2,2}, {31,16,16,30,1,1,30},
    {14,16,16,30,17,17,14}, {31,1,2,4,8,8,8}, {14,17,17,14,17,17,14},
    {14,17,17,15,1,1,14}, {0,0,0,0,0,6,6}, {0,0,0,31,0,0,0},
    {0,4,4,0,4,4,0}, {1,2,2,4,8,8,16}, {0,4,4,31,4,4,0}
};

void text(Surface f, int x, int y, const char* value, int scale, std::uint32_t color) {
    for (const char* p = value; *p && x < f.width; ++p, x += 6 * scale) {
        int index = -1;
        if (*p >= 'A' && *p <= 'Z') index = *p - 'A';
        else if (*p >= '0' && *p <= '9') index = 26 + *p - '0';
        else if (*p == '.') index = 36;
        else if (*p == '-') index = 37;
        else if (*p == ':') index = 38;
        else if (*p == '/') index = 39;
        else if (*p == '+') index = 40;
        if (index < 0) continue;
        for (int row = 0; row < 7; ++row)
            for (int column = 0; column < 5; ++column)
                if (glyphs[index][row] & (1 << (4 - column)))
                    fill_rect(f, x + column * scale, y + row * scale, scale, scale, color);
    }
}
}

bool render_scene(Surface f, const Scene& scene) {
    if (!f.valid()) return false;
    constexpr auto white = 0xfff4f4f4U;
    constexpr auto muted = 0xffb6b6b6U;
    const int unit = std::max(1, std::min(f.width / 640, f.height / 360));
    const int margin = 24 * unit;
    fill_rect(f, 0, 0, f.width, f.height, 0xff090909U);
    text(f, margin, 24 * unit, "VOIDPLAY.", unit * 2, white);
    text(f, margin, 57 * unit, "C++ NATIVE DISPLAY TEST / MAC PREVIEW", unit, muted);
    text(f, margin, 99 * unit, "ONE SHARED PIXEL SURFACE.", unit * 2, white);
    text(f, margin, 122 * unit, "PS4 EXECUTION REMAINS UNVERIFIED.", unit, muted);
    const char* labels[] = {"INPUT", "FRAMEBUFFER", "SERVICES"};
    const int gap = 8 * unit;
    const int width = (f.width - margin * 2 - gap * 2) / 3;
    for (int i = 0; i < 3; ++i) {
        const int x = margin + i * (width + gap);
        fill_rect(f, x, 166 * unit, width, 64 * unit, i == scene.focus ? white : 0xff242424U);
        text(f, x + 10 * unit, 187 * unit, labels[i], unit, i == scene.focus ? 0xff090909U : white);
    }
    char count[64];
    std::snprintf(count, sizeof count, "CONFIRM COUNT: %u", scene.activations);
    text(f, margin, 251 * unit, count, unit, white);
    text(f, margin, 272 * unit, "STORAGE / HTTPS / DOWNLOAD / INSTALL: UNAVAILABLE", unit, muted);
    text(f, margin, f.height - 35 * unit, "LEFT / RIGHT: FOCUS   ENTER: CONFIRM   BACKSPACE: RESET   ESC: EXIT", unit, muted);
    return true;
}
}

// SPDX-License-Identifier: GPL-3.0-only
#include "host.hpp"
#include <cstdint>
namespace ps4react {
template<class T> static T bounded(T value,T lower,T upper){return value<lower?lower:value>upper?upper:value;}
bool Canvas::valid() const { return pixels && w > 0 && h > 0 && w <= 4096 && h <= 2160 && stride >= w && stride <= 8192 && static_cast<std::size_t>(stride) * h <= capacity; }
void rect(Canvas f, int x, int y, int w, int h, std::uint32_t color) {
    if (!f.valid() || w <= 0 || h <= 0) return;
    int left = bounded(x, 0, f.w), top = bounded(y, 0, f.h);
    auto right = bounded<std::int64_t>(static_cast<std::int64_t>(x) + w, 0, f.w);
    auto bottom = bounded<std::int64_t>(static_cast<std::int64_t>(y) + h, 0, f.h);
    for (int row = top; row < bottom; ++row) if (right > left) for(int col=left;col<right;++col)f.pixels[row*f.stride+col]=color;
}
namespace {
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
constexpr std::uint8_t lower[][7] = {
{0,0,14,1,15,17,15},{16,16,30,17,17,17,30},{0,0,14,16,16,17,14},{1,1,15,17,17,17,15},
{0,0,14,17,31,16,14},{6,8,8,30,8,8,8},{0,15,17,17,15,1,14},{16,16,30,17,17,17,17},
{4,0,12,4,4,4,14},{2,0,6,2,2,18,12},{16,16,18,20,24,20,18},{12,4,4,4,4,4,14},
{0,0,26,21,21,21,21},{0,0,30,17,17,17,17},{0,0,14,17,17,17,14},{0,30,17,17,30,16,16},
{0,15,17,17,15,1,1},{0,0,22,25,16,16,16},{0,0,15,16,14,1,30},{8,8,30,8,8,9,6},
{0,0,17,17,17,19,13},{0,0,17,17,17,10,4},{0,0,17,17,21,21,10},{0,0,17,10,4,10,17},
{0,17,17,17,15,1,14},{0,0,31,2,4,8,31}};
constexpr char symbols[] = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
constexpr std::uint8_t punctuation[][7] = {
{4,4,4,4,4,0,4},{10,10,10,0,0,0,0},{10,31,10,10,31,10,0},{4,15,20,14,5,30,4},
{24,25,2,4,8,19,3},{12,18,20,8,21,18,13},{4,4,8,0,0,0,0},{2,4,8,8,8,4,2},
{8,4,2,2,2,4,8},{0,21,14,31,14,21,0},{0,4,4,31,4,4,0},{0,0,0,0,6,4,8},
{0,0,0,31,0,0,0},{0,0,0,0,0,6,6},{1,2,2,4,8,8,16},{0,4,4,0,4,4,0},
{0,4,4,0,4,4,8},{2,4,8,16,8,4,2},{0,0,31,0,31,0,0},{8,4,2,1,2,4,8},
{14,17,1,2,4,0,4},{14,17,23,21,23,16,14},{14,8,8,8,8,8,14},{16,8,8,4,2,2,1},
{14,2,2,2,2,2,14},{4,10,17,0,0,0,0},{0,0,0,0,0,0,31},{8,4,2,0,0,0,0},
{2,4,4,8,4,4,2},{4,4,4,4,4,4,4},{8,4,4,2,4,4,8},{0,0,9,22,0,0,0}};
static_assert(sizeof(punctuation)/sizeof(punctuation[0]) == sizeof(symbols)-1);
}
void text(Canvas f, int x, int y, const char* value, int size, std::uint32_t color) {
    if (!value || !f.valid() || size < 7 || size > 112) return;
    if(font_text(f,x,y,value,size,color))return;
    const int scale = size / 7, start = x;
    for (int i = 0; value[i] && i < 2048; ++i) {
        unsigned char c = value[i]; const std::uint8_t* glyph = nullptr;
        if (c == '\n') { x = start; y += size + 8; continue; }
        if (c >= 'a' && c <= 'z') glyph = lower[c-'a'];
        else if (c >= 'A' && c <= 'Z') glyph = glyphs[c-'A'];
        else if (c >= '0' && c <= '9') glyph = glyphs[26+c-'0'];
        else for (std::size_t symbol=0;symbol<sizeof(symbols)-1;++symbol)
            if(c==static_cast<unsigned char>(symbols[symbol])){glyph=punctuation[symbol];break;}
        if (glyph) for (int r = 0; r < 7; ++r) for (int col = 0; col < 5; ++col)
            if (glyph[r] & (1 << (4-col))) rect(f, x+col*scale, y+r*scale, scale, scale, color);
        x += 6*scale;
    }
}
void native_frame(Canvas f) {
    rect(f,0,0,f.w,f.h,0xff101216); rect(f,80,80,12,120,0xfff4f4f4);
    text(f,128,92,"voidplay.",70,0xfff4f4f4); text(f,128,220,"Starting Voidplay [BETA]",42,0xfff4f4f4);
    text(f,128,330,"Native console interface",28,0xffb9bec6);
}
}

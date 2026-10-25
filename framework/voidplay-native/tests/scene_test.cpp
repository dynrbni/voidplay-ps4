// SPDX-License-Identifier: GPL-3.0-only
#include "voidplay/host.hpp"
#include <cassert>
#include <climits>
#include <cstdio>
#include <vector>

int main() {
    using namespace voidplay;
    constexpr std::uint32_t guard = 0x12345678;
    std::vector<std::uint32_t> pixels(82, guard);
    Surface frame{pixels.data() + 1, 8, 8, 10, 80};
    fill_rect(frame, -2, -3, 8, 8, 0xffabcdef);
    assert(pixels.front() == guard && pixels.back() == guard);
    assert(pixels[1] == 0xffabcdef && pixels[7] == guard && pixels[9] == guard);
    fill_rect(frame, INT_MAX, INT_MAX, INT_MAX, INT_MAX, 0);
    fill_rect(frame, INT_MIN, INT_MIN, INT_MAX, INT_MAX, 0);
    for (int row = 0; row < 8; ++row) assert(pixels[1 + row * 10 + 8] == guard);
    Surface short_buffer{pixels.data() + 1, 8, 8, 10, 79};
    assert(!render_scene(short_buffer, {}));
    assert(!render_scene({nullptr, 8, 8, 8, 64}, {}));
    assert(!render_scene({pixels.data(), INT_MAX, 8, INT_MAX, 82}, {}));
    assert(render_scene(frame, {}));
    assert(pixels.front() == guard && pixels.back() == guard);
    for (int row = 0; row < 8; ++row) assert(pixels[1 + row * 10 + 8] == guard);
    Scene scene;
    scene.dispatch(Action::left); assert(scene.focus == 2);
    scene.dispatch(Action::right); assert(scene.focus == 0);
    scene.dispatch(Action::confirm); assert(scene.activations == 1);
    scene.dispatch(Action::back); assert(scene.focus == 0 && scene.activations == 0);
    scene.dispatch(Action::exit); assert(!scene.running);
    std::vector<std::uint32_t> display(1920 * 1080);
    Surface full{display.data(), 1920, 1080, 1920, display.size()};
    scene = {};
    assert(render_scene(full, scene));
    const auto original = display;
    assert(display[520 * 1920 + 100] == 0xfff4f4f4);
    assert(display[520 * 1920 + 750] == 0xff242424);
    scene.dispatch(Action::right);
    assert(render_scene(full, scene));
    assert(display[520 * 1920 + 100] == 0xff242424);
    assert(display[520 * 1920 + 750] == 0xfff4f4f4);
    scene.dispatch(Action::back);
    assert(render_scene(full, scene) && display == original);
    Capabilities capabilities;
    assert(capabilities.storage.state == ServiceState::unavailable);
    assert(!capabilities.filesystem && !capabilities.https && !capabilities.downloads && !capabilities.installation);
    std::puts("Portable scene: clipping, overflow, stride, input lifecycle and unsupported services passed.");
}

// SPDX-License-Identifier: GPL-3.0-only
#pragma once
#include <cstddef>
#include <cstdint>

namespace voidplay {
enum class Action { none, left, right, confirm, back, exit };
enum class ServiceState { unavailable, mock, verified };

struct StorageReport {
    ServiceState state = ServiceState::unavailable;
    std::uint64_t total_bytes = 0;
    std::uint64_t available_bytes = 0;
    const char* target = "unavailable";
    const char* error = "No console storage adapter has been validated.";
};

struct Capabilities {
    StorageReport storage;
    bool filesystem = false;
    bool https = false;
    bool downloads = false;
    bool installation = false;
};

struct Surface {
    std::uint32_t* pixels;
    int width;
    int height;
    int stride;
    std::size_t capacity;
    bool valid() const;
};

class Presenter {
public:
    virtual ~Presenter() = default;
    virtual bool present(Surface frame) = 0;
};

class Input {
public:
    virtual ~Input() = default;
    virtual Action poll() = 0;
};

class Logger {
public:
    virtual ~Logger() = default;
    virtual void write(const char* message) = 0;
};

struct Scene {
    int focus = 0;
    unsigned activations = 0;
    bool running = true;
    void dispatch(Action action);
};

bool render_scene(Surface frame, const Scene& scene);
void fill_rect(Surface frame, int x, int y, int width, int height, std::uint32_t color);
}

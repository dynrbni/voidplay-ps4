#include "common.h"
#include <assert.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>
int main(void) {
    uint64_t total = 0, available = 0;
    assert(vp_capacity(4096, 100, 25, &total, &available) == 0);
    assert(total == 409600 && available == 102400);
    assert(vp_capacity(0, 100, 25, &total, &available) < 0);
    assert(vp_capacity(4096, 100, -1, &total, &available) < 0);
    assert(vp_capacity(4096, 100, 101, &total, &available) < 0);
    assert(vp_capacity(UINT64_MAX, 2, 1, &total, &available) < 0);
    char directory[] = "/tmp/voidplay-native-XXXXXX";
    assert(mkdtemp(directory));
    assert(vp_file_roundtrip(directory, "probe.txt", stdout) == 0);
    assert(vp_file_roundtrip(directory, "probe.txt", stdout) < 0);
    assert(vp_file_roundtrip(directory, "../escape.txt", stdout) < 0);
    char path[256]; snprintf(path, sizeof path, "%s/probe.txt", directory);
    assert(unlink(path) == 0); assert(rmdir(directory) == 0);
    puts("Host checks passed. This is not a PS4 runtime or storage test.");
    return 0;
}

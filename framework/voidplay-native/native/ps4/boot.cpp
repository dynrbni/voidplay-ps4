// SPDX-License-Identifier: GPL-3.0-only
#include <orbis/libkernel.h>
#include "build_id.h"

int main() {
    sceKernelDebugOutText(0, "[voidplay-boot] main reached build=" VP_BUILD_ID "\n");
    for (int second = 0; second < 8; ++second) {
        sceKernelDebugOutText(0, "[voidplay-boot] heartbeat %d/8\n", second + 1);
        sceKernelUsleep(1000000);
    }
    sceKernelDebugOutText(0, "[voidplay-boot] normal return build=" VP_BUILD_ID "\n");
    return 0;
}

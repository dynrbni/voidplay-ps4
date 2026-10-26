// SPDX-License-Identifier: GPL-3.0-only
#include <orbis/libkernel.h>
#include "build_id.h"

int main() {
    sceKernelDebugOutText(0, "[voidplay-boot] main reached build=" VP_BUILD_ID "\n");
    // Returning through the bundled musl exit path is not qualified for this console.
    // Keep the startup probe alive; close it explicitly from the PS button menu.
    for (;;) {
        sceKernelDebugOutText(0, "[voidplay-boot] alive build=" VP_BUILD_ID "\n");
        sceKernelUsleep(1000000);
    }
}

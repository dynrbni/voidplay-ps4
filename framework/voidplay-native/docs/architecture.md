# Native C++ architecture and rendering audit

Audit date: 2026-10-26. This is a migration foundation, not a completed C++
Voidplay store or a PS4 compatibility claim. The owner selected C++ directly;
the attached React runtime brief informs the audit and hardware gates.

## Repository baseline

`origin/main` is `722faee`. PRs #1–#4 are open and form this chain:
`main` ← `feature/store-foundation` ← `feature/homepage-cinematic-redesign` ←
`codex/fluid-store-redesign` ← `codex/catalog-admin-storage-poc`.
The worktree was clean at `db6e545` before creating
`codex/cpp-runtime-foundation`. Its PR must target the catalog branch; no
existing branch is merged, reset or force-pushed. The web client/admin remain
available while the native path is qualified.

## Reference audit and provenance

Both references were read from source, including their architecture,
hardware evidence, native hosts, bundler, dependency lock and legal notices:

- [Overdrive's framework](https://github.com/Ex-Communicad0/ps5overdrive/tree/264f78e6b92e5eed1415490b003944eb97ed4f8b/ps5-react), commit `264f78e6b92e5eed1415490b003944eb97ed4f8b`.
- [Public continuation](https://github.com/JVK3R/ps5-react/tree/65691ac70c814edd01b6f7174ad208748b503a17), commit `65691ac70c814edd01b6f7174ad208748b503a17`.

The two trees share lineage; similar hardware records are not independent
PS4 tests. Their documented baseline is PS5 firmware 13.60 with its recorded
loader setup and exact executable hashes. Their later changes have separate
qualification limits. None establishes PS4 firmware 12.00 support.

No PS5 framework source, assets, binaries, patches or dependency stack was
imported. This subtree is newly written C++, Python and shell; ELF checks
follow this repository's existing native diagnostic. The analysis credits
half144 and PS5 React contributors, with the continuation maintained by JVK3R.
The full provenance and license scope are in [NOTICE](../NOTICE).

### Actual reference data flow

| Stage | Source in the continuation | Role and PS4 disposition |
| --- | --- | --- |
| App | `apps/*/index.jsx` | React state/components; DOM/CSS/Vite code from Voidplay cannot run unchanged here. Direct C++ migration omits this layer. |
| Bundle/assets | `tools/bundle.mjs`, `tools/tailwind/`, `tools/common.py` | esbuild IIFE, static style objects, generated asset C units; not a browser runtime. Omitted for native C++. |
| Runtime | `runtime/js/`, Embedded React QuickJS bridge | Reconciler creates/updates native nodes; pinned QuickJS runs JS. Technically portable candidates, unnecessary for the selected C++ path. |
| Layout/raster | Pinned Embedded React engine | Tree, text/layout and CPU rasterization produce ARGB8888 pixels. Reuse would need its Apache-2.0 notices and separate cross-build/runtime proof. Not imported. |
| Presentation | `native/shared/gl_presenter.hpp` | Damage uploads, texture/layer composition and GL presentation; portable algorithm ideas, GL feature/driver requirements must be replaced or qualified on PS4. |
| Hosts | `native/desktop/host.cpp`, `native/ps5/native_host.cpp` | Window/EGL, timing, input, runtime ownership and shutdown; desktop SDL boundary is useful as a pattern, PS5 host/CRT/heap/shims are not PS4 implementations. |
| Services | `native/shared/host_api.*`, platform/network implementations | JS wrappers register native functions; bounded network/disk tasks and worker shutdown are separate from rendering. PS5-specific exports/helpers cannot be renamed into PS4 support. |

Reference input travels from SDL or platform pad reads to named actions,
`__ps5ReactDispatch`, JS focus rectangles, state updates, reconciler commits and
raster damage. Each host calls the JS frame hook for motion. Filesystem APIs
use the host bridge; HTTP/download tasks submit, cancel and poll worker work.
Workers do not call QuickJS. Shutdown cancels/joins network, image and render
workers before destroying the runtime/backend and window/platform resources.
These separations inform the new design; their implementations are not copied.

## Selected C++ structure

```text
shared C++ scene + normalized actions
             ↓
bounded ARGB8888 Surface
             ↓ Presenter interface
Mac: SDL2 texture → native window
PS4: presenter not selected; startup experiment is separate
```

`include/voidplay/host.hpp` defines pixel-surface bounds, actions, presentation,
input, logging and unavailable service capabilities. `native/shared/scene.cpp`
contains the small portable display/input test, with a deliberately limited
diagnostic ASCII font. This font is not the store's typography solution.
`native/desktop/main.cpp` owns SDL resources and the event loop; keyboard and
controller buttons enter the same scene state. It uploads the software frame
to an SDL texture and presents it. Normal exit destroys controller, texture,
renderer and window before SDL shutdown. Watch mode rebuilds/restarts this
native process; it resets application state.

`native/ps4/boot.cpp` is a separate, renderer-free C++ experiment. It uses the
OpenOrbis CRT, libc and kernel import stubs, logs entry/heartbeat/normal return,
and waits eight seconds. It has no C++ standard-library objects, global
constructors, exceptions or RTTI. It imports no dialog, networking, pad or
storage subsystem. It does not yet implement `Presenter` or console input.
Kernel logging itself must be tested; an empty log is not proof of execution.

The native capability report exposes no verified storage, filesystem, HTTPS,
download or installation service. There is no native network/download/install
implementation hidden behind the preview. Future services must have typed
results, cancellation/error handling and platform adapters before the store
can call them. Existing TypeScript contracts remain available as requirements.
Mock data must remain explicitly labeled and can never authorize installation.

## PS4 rendering feasibility

Source baseline: [OpenOrbis v0.5.4](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/tree/b458dfd9d2f5c40aa249b127c9b9b4488afdc686).
The complete LLVM-18 release, not an empty source-checkout sysroot, is required.

| Candidate | Source/build evidence | Remaining risk |
| --- | --- | --- |
| CPU raster + direct VideoOut buffers | `samples/_common/graphics.cpp`, `samples/graphics`, `include/orbis/VideoOut.h`. A local LLVM-18 link probe resolves `sceVideoOutOpen` against `libSceVideoOut.so`; it was never packaged or run. | Direct-memory allocation/map, linear pitch, alignment, flip lifecycle, teardown and firmware ABI require hardware proof. This is the smallest candidate for a first color frame, not a selected production renderer. |
| OpenOrbis SDL2 port | `samples/SDL2`, `libSDL2.a`, `libSDL2main.a` exist in the release. Sample links VideoOut, Pad, audio, FreeType and system modules. | The Mac SDL2 host working does not qualify the console SDL port or its backend. A separate small console SDL experiment follows startup qualification. |
| Piglet EGL/GLES2 | `samples/piglet` and import stubs for Piglet/PrecompiledShaders exist. Source configures EGL/GLES and loads system modules. | Link stubs do not prove those modules/contexts work in this title on firmware 12.00. Requires a standalone context/triangle/texture test and a module/ABI review. Not used in the boot package. |
| PS5 presenter/ps5-opengl | Reference depends on its PS5 SDK, host and GL paths. | No PS4 compatibility evidence; not a deployable PS4 option. |

A 1920×1080×4 surface requires 8,294,400 bytes (7.91 MiB); two need
16,588,800 bytes (15.82 MiB), before allocator rounding, textures, images or
text caches. One full-frame copy at 60 Hz is about 498 MB/s. These are size
calculations, not measured PS4 throughput. The Mac uses numeric `0xAARRGGBB`;
the SDK sample uses `0x80000000` while its public video header names another
format `A8B8G8R8_SRGB` (`0x80002200`). A red/green/blue/alpha test must resolve
channel order, sRGB and opacity before reusing the shared surface on console.
Do not silently assume the Mac texture and VideoOut formats match.

Text shaping/rasterization and artwork decoding remain open production choices.
The store needs its licensed font, UTF-8, wrapping, clipping, fallbacks and image
cache budgets; the diagnostic bitmap font is not suitable for arbitrary catalog
metadata. Benchmark dirty rectangles and text/image uploads on PS4 before
adding animation. No 4K or 60 FPS console promise is made.

## Migration stages and acceptance gates

1. **Startup:** build/verify the new boot package. On the owner's PS4, capture
   its exact hash/title/version, firmware and GoldHEN version, launch via the
   selected installer, and collect entry/heartbeat/return or a crash trace.
   A transport success or eight seconds of black screen alone is insufficient.
2. **Display:** after startup evidence, test one color frame, geometry/text,
   channel order, buffer lifetime and bounded exit; then add pad input/reconnect
   and measure frame timing/memory. Select the presenter from these results.
3. **C++ client:** migrate routing, focus scopes, favorites/library and each
   store view to shared C++ state/view code. Keep the published JSON catalog as
   the data source; do not put catalog entries in C++ view components. Add a
   native parser/schema compatibility test against the existing validated data.
4. **Services:** implement app-owned config/files, validated HTTPS/catalog and
   assets, then real downloads/resume/checksums and verified storage adapters.
   Unsupported operations stay explicit. Installation/cleanup remain gated on
   authorization, compatibility, integrity, real space and confirmed success.
5. **Parity:** compare Discover, Browse/search, detail/gallery, Favorites,
   Library, Downloads and Settings with the existing approved web UI on Mac
   and console. Retire the browser client only after that migration is tested.
   The owner admin remains a separate React dashboard.

The attached brief's QuickJS/JSX stage is intentionally omitted because the
direct request selects C++. Reintroducing JSX would be a different product
choice, not an automatic consequence of studying the reference.

## Current blocker

The supplied screenshot proves a reported CE-34878-0 failure for the previous
diagnostic title. The owner reports no initial dialog. Its installed artifact
hash, crash address and entry trace are unavailable, so neither a pre-main
failure nor a specific API bug has been established. The prior diagnostic was
already native C; converting UI language cannot explain or fix that crash by
itself. The owner deferred enabling FTP/Klog. No replacement build has been
launched. Therefore the PS4 display/full-client stages remain gated.

See [evidence](hardware-evidence.md) for actual local results and [commands](../README.md).

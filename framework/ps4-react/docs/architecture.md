# Implemented architecture and compatibility

Recorded 2026-10-26. Target: OpenOrbis v0.5.4 / LLVM 18, macOS ARM64 host.
The PS4 executable is cross-built. Physical PS4 display/input/launch remain a
separate acceptance gate; a valid package alone does not establish them.

## Audited references

- [PS5 React](https://github.com/JVK3R/ps5-react/tree/65691ac70c814edd01b6f7174ad208748b503a17): package/dependency locks, architecture, hardware records, desktop/PS5 hosts, bridge, bundler, NOTICE and attribution term.
- [Overdrive](https://github.com/Ex-Communicad0/ps5overdrive/tree/264f78e6b92e5eed1415490b003944eb97ed4f8b/ps5-react): original framework lineage and notices. It is not an independent PS4 result.
- [Embedded React](https://github.com/TheMasterCoder007/embedded-react/tree/cf5dfe4fae966fe21a265acc3dd3b054d245f981): Apache-2.0 engine/QuickJS bridge evaluated through upstream source and the reference integration. Its larger compositor, font/GL dependencies and patch stack are unnecessary for this two-component milestone; none was copied.
- [OpenOrbis](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/tree/b458dfd9d2f5c40aa249b127c9b9b4488afdc686): release inputs, `samples/_common/graphics.cpp`, VideoOut/Pad/UserService headers/imports and actual packaging tools were checked locally.

| Component | Decision | Evidence / limits |
| --- | --- | --- |
| React 18.3.1 / reconciler 0.29.2 | Reuse MIT packages, pinned npm integrity | Real components/state execute in QuickJS; no React DOM. |
| QuickJS-ng 0.15.0 | Reuse MIT interpreter, source/archive pinned | Same engine compiled for Mac and PS4. No qjs shell, filesystem/OS modules, worker runtime, SharedArrayBuffer/Atomics or JIT. |
| PS5 React architectural flow | Reference only | No PS5 platform, payload, CRT, EGL, heap, service or renderer source imported. Required reference credit retained in NOTICE. |
| Embedded React | Evaluated, not imported | A smaller newly written mutation renderer handles only View/Text for now. No compatibility claim with its API. |
| JSX bundler | New esbuild script | Bundles JSX/React/reconciler into an IIFE and embeds source bytes in the executable. This is runtime interpretation, not JS-to-C++ compilation. |
| Layout/raster/font | New portable implementation | Deterministic row/column layout and clipped CPU primitives; original bundled 5x7 ASCII glyphs. |
| Mac presentation | New SDL2 adapter | Real window, streaming ARGB texture, native keyboard/controller events and close/cleanup. Smoke injects an SDL key event. |
| PS4 presentation | New VideoOut adapter | Direct memory, two scanout buffers, explicit flip completion before reuse, bounded waits. Actual SDK headers/stubs and link output verified; hardware not yet verified. |
| PS4 controller | New Pad/UserService adapter | Polls button edges and disconnected state. Initial device absence is logged and does not block display. Physical/reconnect qualification remains outstanding. |
| HTTP/storage/download/install | Not exposed | No invented services or permissions; no automatic install/cleanup. Existing web/admin remain separate. |

## Data and ownership

`apps/hello-world/index.jsx` → esbuild IIFE → QuickJS → React reconciler →
mutable host nodes → deterministic JS layout → bounded native text/rectangle
commands → CPU framebuffer → SDL texture or PS4 VideoOut double buffer.

The host first submits a C++ qualification frame, then evaluates React. A JS
failure keeps a visible native error frame and logs the exception/stack rather
than silently leaving a framebuffer that is never submitted. Startup failures
before VideoOut are logged; a display cannot be promised if VideoOut itself fails.

The renderer uses actual React commits. State updates repaint from the updated
host tree. No HTML, CSS parser, browser, DOM, WebView, remote catalog fixture or
server is needed. The script is interpreted at runtime by QuickJS. C/C++ owns the
engine and the pixel buffers; JS receives no addresses, file descriptors or
arbitrary native-call primitive.

The engine is limited to 32 MiB, a 512 KiB JS stack, 2 seconds for initial script
execution and 500 ms per host tick. At most 256 pending jobs, 256 timers, 512
layout nodes, depth 32, 2048 draw commands and 2048 text characters are accepted.
These bounds reduce avoidable runaway behavior; they are not firmware validation
or a security certification. Drawing is clipped to the validated surface.

Mac Escape/window-close unmounts React, flushes effects, clears timers/listeners,
frees context/runtime, closes controllers/texture/renderer/window and releases
pixels. PS4 stays running until closed using the PS menu; returning through the
unqualified musl exit path is avoided. Circle resets the example counter. An OS
forced termination does not promise execution of user-space cleanup callbacks.

## Public subset

Import `AppRegistry`, `View`, `Text`, `Controller` from `@ps4-react/core`.
Register one root component. Function components, ordinary React state/effects
and native event listeners are exercised; this is not a complete React Native API.

Style fields: `backgroundColor`, `color` (#RRGGBB), fixed numeric `width`/`height`,
`padding`, `gap`, `flexDirection` (row/column) and `fontSize` (7..112). Empty
containers, nested text and newline are supported. Text uses printable ASCII;
no Unicode shaping, wrapping, images, animations, flex growth, absolute layout,
CSS/className, portals, Suspense/hydration, concurrent roots, browser APIs,
networking or file access are promised. Unsupported types/styles fail visibly.
Text is clipped at the framebuffer boundary; per-view overflow clipping is not
implemented. Use content that fits fixed dimensions in this first milestone.

New components belong in the core/layout/renderer layers. The host/platform layer
does not need duplication. The controller service only dispatches named actions
and knows nothing about React elements.

## Packaging and provenance

`tools/build.py` compiles shared/native source against the selected target,
converts ELF using OpenOrbis create-fself, creates SFO/icon/GP4 and runs PkgTool.
Generated GP4 directories are derived from real file paths (the SDK generator's
fixed template omitted the notices directory). The package contains the app's
own executable/icon and license notices. No proprietary PRX/SPRX file is copied.
Static OpenOrbis musl and system import stubs remain separately licensed inputs.

The owner's first 01.00 console run failed before `main` with the loader's
`PRX_SCE_MODULE_LOAD_ERROR` and explicit missing `/app0/sce_module` diagnostic.
Static musl in the executable does not remove the system bootstrap's requirement
for application module files. From 01.01, the build compiles the small GPL
[OpenOrbis libc shim](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/b458dfd9d2f5c40aa249b127c9b9b4488afdc686/src/modules/libc/libc/lib.c)
and corresponding FIOS shim using the pinned OpenOrbis `crtlib.o` and import
stubs, then converts each with the SDK's `--lib` workflow. No prebuilt sample
PRX or proprietary Sony module is copied. Their complete GPL source/build inputs
and hashes are retained. These are bootstrap compatibility modules; they expose
no application FIOS service. The required module paths, SELF structure and PS4
dynamic-module type are checked before packaging and during extracted verification.
The old module-free 01.00 package is now rejected by this guard. Console launch
for the corrected package is a new, still-pending hardware acceptance test.

The QuickJS FreeBSD include expects `malloc_np.h`; OpenOrbis musl declares the
same `malloc_usable_size` in `malloc.h`. A small target-only compatibility header
selects that actual declaration; no invented allocator implementation is used.
PS4 C++ includes use the SDK rather than the Mac libc++ headers. The rasterizer
avoids an unrelated STL algorithm/thread dependency requiring missing nanosleep.

Package validation checks reported PFS/body/header/signature results, verifies
ELF/SELF structure, extracts and compares every executable/notice byte, compares
icon and every SFO field while allowing PkgTool's two publication metadata fields,
and records build input/output hashes. This is local structural verification,
not a Sony signature, installation test or assurance of firmware 12.00 support.
Package timestamps can change the final hash across rebuilds. Identify a hardware
run by the report's exact SHA-256, title ID and version.

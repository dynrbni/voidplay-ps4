# C++ native runtime foundation implementation plan

**Goal:** Establish a testable native C++ migration path without disguising the existing PS4 crash.

**Architecture:** Shared C++ pixel scene, independent SDL2 Mac host, and a minimal OpenOrbis startup target. The admin/catalog pipeline stays independent. Console rendering and store integration follow hardware validation.

**Tech stack:** C++17, SDL2, Python 3 standard library, Apple Clang for Mac, LLVM/LLD 18 and OpenOrbis v0.5.4 for PS4.

**Spec:** `framework/voidplay-native/docs/spec.md`.

## Task 1: Audit and architecture

- [x] Fetch origin; inspect clean worktree, main and PR dependencies; branch from current milestone.
- [x] Read supplied references, licenses, architecture and hardware evidence at recorded commits.
- [x] Write `framework/voidplay-native/docs/architecture.md`: actual source paths, lifecycle trace, portable/replaced modules, renderer alternatives, provenance and hardware gates.

## Task 2: Native hosts and build commands

- [x] Add `include/voidplay/host.hpp` and `native/shared/scene.cpp` for a bounded ARGB8888 scene and normalized input.
- [x] Add `native/desktop/main.cpp`: real SDL2 window, keyboard/controller, 1080p surface, bounded smoke test, deterministic capture, clean teardown.
- [x] Add `native/ps4/boot.cpp`: kernel log entry/heartbeat/exit, no optional subsystem imports.
- [x] Add Python CLI doctor, Mac build/run/watch/test, PS4 build/package/verify, verified FTP transfer and read-only diagnostic collection; fail clearly on missing dependencies.
- [x] Require matching source, tools, SDK/link-input and artifact hashes; never reuse a failed build's receipt.

## Task 3: Verification and handoff

- [x] Run portable bounds/input tests under ASan/UBSan; exercise actual SDL event loop/presentation and inspect capture.
- [x] Run build/receipt tamper tests; doctor, PS4 build, ELF/SELF/PKG checks; record exact hashes and limitations.
- [x] Run existing checks as appropriate to ensure catalog/admin work is preserved.
- [x] Document separate Mac/cross-build/structural/hardware evidence, console test procedure and next gates.
- [ ] Commit coherent Conventional Commits, push, create/attach stacked PR against catalog milestone; verify remote head.

Hardware dependency: no actual startup evidence is available for the replacement C++ boot package. Do not proceed to a PS4 renderer/full store until that gate passes. Mac tests do not satisfy it.

# Recorded local verification

Recorded on 2026-10-26 on the owner's macOS ARM64 development machine.
This report covers the small PS4 React Hello World framework. It does not qualify
the existing Voidplay store as a native PS4 application.

## Implementation delivered

Real JSX is bundled with React and its reconciler, interpreted by QuickJS-ng,
and rendered through newly written View/Text host nodes, layout and a CPU pixel
renderer. The same bundle/engine/renderer runs in the native SDL Mac preview and
is linked into the OpenOrbis PS4 executable. The PS4 platform layer contains a
complete VideoOut buffer registration/flip path and Pad/UserService polling.
It is cross-built, not hardware-qualified. See [architecture](architecture.md)
for reference revisions, compatibility decisions, API and resource bounds.

Source is under `apps/`, `packages/core/`, `runtime/`, `renderer/`, `platform/`,
`tools/` and `tests/`. The root repository only adds command aliases, lint/CI
coverage and documentation. The owner backend, private catalog and live Pages
publication are preserved. Dependencies/build outputs are ignored.

## Environment and commands

| Check | Actual result |
| --- | --- |
| Node 26.7.0 / Python 3.13 / Apple Clang 21 | Available on this Mac. |
| SDL2 2.32.10 / LLVM and LLD 18.1.8 | Desktop and PS4 compilation exercised. |
| OpenOrbis v0.5.4 release | Release input hashes, actual headers/stubs and packaging tools inspected. |
| React 18.3.1 / reconciler 0.29.2 / esbuild 0.25.12 | Isolated lockfile; JSX bundle executes in the interpreter. |
| QuickJS-ng 0.15.0 | Source archive hash verified; source revision recorded in dependency lock. |
| `npm run doctor` in framework | PASS: pinned inputs, tools, npm dependencies, display/input imports and Pillow. |
| `npm test` in framework | PASS: 3 layout tests, 5 build tests, native ASan/UBSan integration executable. |
| `npm run smoke` in framework | PASS after repeated rebuild: real SDL window/texture, injected SDL key event, 8 frames, framebuffer capture and clean shutdown. |
| Root `npm run check` | PASS: lint, types, 32 existing tests, catalog validation, store and admin production builds. |
| Root `npm run verify:public` | PASS: valid public catalog; no private workspace/admin/package/credential markers. |
| Native-only PS4 graphics target | Cross-build and package structural checks passed before JS integration; physical display not tested. |
| React PS4 target | Cross-build and package/extracted-byte checks exercised. Final artifact identity is recorded by `dist/receipt.json` and its `.pkg.sha256` sibling. |
| Physical PS4 firmware 12.00 / GoldHEN | **UNVERIFIED** for this package. No install, launch, display, controller, storage or network success claimed. |

The sanitizer integration executes the actual bundled React app, verifies a
pixel change from state update and exact reset, repeats runtime startup/shutdown,
and tests syntax errors, execution timeout, invalid bridge arguments, clipped
rectangles and visible glyphs for every printable non-space ASCII character.
The error/stack output from those negative tests is expected; assertions pass.
Build tests reject malformed manifests, missing tools/assets and broken JSX,
and invalidate stale success receipts after build failure.

During repeated preview builds, one smoke run was killed with SIGKILL before
startup. macOS kernel logs reported a code-signature load failure. The build now
atomically replaces the executable inode and ad-hoc signs/verifies the app bundle
after replacement. Subsequent repeated smoke runs passed. This Mac issue is not
evidence identifying the earlier PS4 CE-34878-0 cause.

## Visible desktop evidence

The native OS window was inspected directly: Enter changed Count 0 to 1,
Backspace restored 0 and Escape exited with `[shutdown] clean`. This is a native
Mac preview screenshot, not a PS4 capture or browser mockup:

![Native Mac preview with React state updated](images/mac-native-preview.png)

Design is intentionally a static qualification screen: dark neutral background
keeps scanout/text defects visible, white bitmap text avoids a font/GL dependency,
large headings remain readable from a TV and one counter strip exposes React
updates. ENERGY 1 / RHYTHM 1 / MOTION 1. No decorative assets or simulated store
features are used as evidence of native compatibility.

## Artifacts and acceptance

From `framework/ps4-react/`, `npm run build:ps4` produces:

- `build/ps4/app.elf`, `app.oelf`, `eboot.bin`, SFO/icon/GP4 and packaged SFO.
- `dist/PS4React-HelloWorld.pkg`, `.pkg.sha256` and `dist/receipt.json`.
- `build/commands.log` with exact commands/outputs for diagnosis.

The receipt records input/output hashes, source commit, whether framework source
was dirty, title/version, package hash/size and `console_launch: unverified`.
The local verifier checks ELF/SELF structure, SFO fields, package digests, header
and debug signatures, then extracts and compares executable, icon and notices.
Only the packager-generated 96-byte keystone and publication SFO fields are allowed
as additions. No proprietary Sony runtime PRX/SPRX is included. A local signature
check does not establish installation or compatibility with Sony's retail policy.

Re-run `npm run verify:ps4` before transferring. Follow the exact
[FTP/manual installation and log capture procedure](../README.md#transfer-install-and-test).
FTP moves bytes; only the user's installer registers the app. Previous full-size
FTP writes failed read-back, so no such copy is accepted as verified. The owner
previously could not install the replacement Boot Test; it is a different artifact.
No new PS4 React hardware result has been received.

The owner subsequently enabled FTP/Klog for this package. Both endpoints were
reachable and the read-only Klog capture received 38,629 bytes, with no PS4 React
startup marker. FTP accepted all 6,619,136 bytes under a unique `.uploading` name.
Full read-back failed with 426/timeouts in passive, active, advertised REST resume
and an enlarged client receive-buffer attempt. A resumed prefix matched the local
source byte-for-byte, but a full destination SHA-256 was not obtained. The remote
copy remains `ready=false`, was not renamed to `.pkg` and was not installed or
launched by the agent. Raw logs/transfer receipts stay in the ignored local build
directory. The verified Downloads artifact can instead be copied using a USB
device already supported by the owner's installer, or a successful manual transfer.

The next smallest milestone is to install the exact HelloWorld hash on the actual
console, capture startup logs, verify both headings for at least 30 seconds,
test Cross/Circle and close from the PS menu. If startup fails, preserve the
faulting logs and screen before adding any component, catalog or network feature.

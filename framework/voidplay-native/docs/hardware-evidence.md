# Native migration evidence

Recorded 2026-10-26. **No successful PS4 execution is claimed.** The full store
has not been rewritten. This record covers the startup/display foundation.

## Source and environment

Runtime source commit: `9db3eb2b713540dfa86649350db892b7d6574ad3`.
Branch: `codex/cpp-runtime-foundation`, based on `db6e545` / PR #4.
The final build receipt records `native_sources_dirty: false` and 35 hashed
inputs, including source, tools, compiler-discovered headers and SDK inputs.
Subsequent changes add tests/documentation only; the runtime source is unchanged.

Mac: Apple Silicon, macOS 27.0.1; Apple Clang 21.0.0; SDL2 2.32.10.
PS4 cross-compiler: Homebrew Clang and LLD 18.1.8, target
`x86_64-pc-freebsd12-elf`. Existing default LLVM 23 was not replaced or relinked.
OpenOrbis v0.5.4 release archive SHA-256:
`3c7cd5bb593ca74fa1c13fd59f3938dc0fc07985167f7275063019e63abe4526`.
Doctor passed for both host/target environments; eight critical release inputs
matched hashes independently checked against that archive.

## Exact replacement artifact

- Title: **Voidplay C++ Boot Test**, `VPLY00002`, version `01.00`.
- Build tag: `585ee1a1baded824`.
- File: `build/ps4-boot/IV0000-VPLY00002_00-VOIDPLAYBOOT0001.pkg`.
- Size: **6,619,136 bytes**.
- SHA-256: `03be335c4aaffae155e3524b7bfdf6d44f74b3f722d2908e90ad048c71ddfe90`.
- The receipt, `package.sha256`, ELF/SELF, final SFO and detailed build log are
  retained in ignored local output. Rebuilding can change package timestamps
  and the hash; identify tests by the actual receipt, not this filename alone.

## Observations by evidence level

| Check | Actual result | What it does not establish |
| --- | --- | --- |
| `native:runtime:test` | C++ bounds/overflow/stride/input/rendering checks passed under Apple ASan/UBSan; 11 Python tests passed. | No console memory/ABI/input proof. FTP tests are in-memory transfer-state fixtures; Klog test uses a local TCP server. |
| `native:mac:smoke` | Real SDL window/texture/presentation path ran six 1920×1080 frames, tested keyboard and synthetic controller events, reset/exit, then orderly shutdown. Latest sample mean raster 0.548 ms. | Not a PS4 frame-time measurement; no physical controller test. |
| 640×360 smoke | Six-frame event loop/capture passed with the smaller surface. | No store-layout parity or phone UI claim. |
| Watch mode | A source mtime change rebuilt/restarted the native host; two bounded 12-frame runs exited normally; Ctrl+C stopped the watcher. | No live state preservation or JS hot reload. |
| Cross-build | C++ → x86-64 ELF → OpenOrbis OELF/eboot → GP4/PKG succeeded with LLVM/LLD 18. | No successful launch, graphics, input or firmware support. |
| Structural verification | Re-run `ps4-verify` passed matching input/output receipts, ELF 16 KiB LOAD bounds/entry, SELF header/segments and SDK PKG hash/signature checks. Extracted eboot, three runtime files and icon match. All intended SFO fields match; only the packager's two publication fields are added. | Not proof the console loader accepts the title or that imported functions work. |
| Existing work | `npm run check`: lint/types, 23 tests, catalog validation and store/admin production builds passed. `native:test`: original host checks and six artifact tests passed. `verify:public` passed. | Browser builds/tests are not console execution. Existing E2E was not rerun because browser behavior was unchanged. |
| Device connection | Read-only FTP diagnostic listing and TCP Klog connection timed out. Owner deferred enabling FTP/Klog. | No replacement transfer, installation or launch occurred. |
| Firmware 12.00 | Owner reports firmware 12.00/GoldHEN and an immediate CE-34878-0 on the earlier diagnostic, without its first dialog. Exact installed artifact/GoldHEN version/crash trace unknown. | A generic application error does not identify a faulty instruction/API or prove pre-main failure. |

The shared software frame captured during the native Mac smoke test is below.
It is a diagnostic scene, not the migrated store or a PS4 screenshot.

![Shared C++ diagnostic framebuffer captured on Mac](mac-display-test.png)

## Failures found and corrected during local work

- LLVM-18's macOS ASan runtime spun in initialization on this macOS version;
  a process sample showed the sanitizer initializer spin, before test main.
  That owned test process was stopped. Mac testing uses Apple Clang; the
  LLVM-18 cross-compiler remains isolated to PS4 builds.
- The first SDL event-loop test did not consume all queued actions in a frame.
  The host now drains normalized actions through explicit event pumping/queue
  reads; its six-frame focus/confirm/reset/exit test passes.
- PKG extraction places SFO/icon in the entry table, outside the extracted
  application filesystem. PkgTool adds publication fields to SFO. Verification
  now extracts those entries explicitly, compares application metadata, records
  the actual final SFO, and rejects unexpected changes rather than pretending
  the unmodified input SFO is installed byte-for-byte.

These local fixes are not explanations or fixes for the owner's console crash.

## Next console experiment

1. Confirm `VPLY00002` is unused. Enable FTP and the GoldHEN Klog server; record
   firmware and exact GoldHEN version. Keep the boot package separate from the
   old `VPLY00001` diagnostic.
2. Run `ps4-verify`; use the explicit transfer command. Proceed only if its
   full read-back hash matches and `transfer.json` says `ready: true`.
3. Install manually through the owner's Internal Package Installer/file manager.
   Record the installed filename/hash and tool used. No automatic installer is
   implemented or authorized by a completed download.
4. Start a 30-second Klog capture, then launch **Voidplay C++ Boot Test**. Expect
   a blank screen for eight seconds and a normal return. Look for
   `[voidplay-boot] main reached build=585ee1a1baded824`, heartbeats and the same
   build's `normal return`. Record any error and timestamp.
5. If it fails, preserve logs and the exact artifact. No first marker means
   startup and log routing both need investigation; no marker is not proof of
   the cause. If markers stop, identify the last stage and crash trace.
6. Only after startup is demonstrated, build the smallest independent VideoOut
   color-frame experiment. Validate channel order, flip lifetime, text/geometry,
   pad/reconnect and exit before choosing the store renderer.

Console display, controller, HTTPS/TLS, filesystem, real storage, downloads and
installation remain unimplemented/unverified in this C++ runtime. Full store
migration follows those gates. No kernel or system-UI modification is used.

## GitHub handoff

Runtime commit `9db3eb2b713540dfa86649350db892b7d6574ad3` and test/evidence
commit `486dd57af1a8db06e7d47d260c256967cb64c4fe` were pushed with matching
remote HEAD. [PR #5](https://github.com/dynrbni/voidplay-ps4/pull/5) targets the
catalog milestone branch; it has not been merged.

[Check run 40223133473](https://github.com/dynrbni/voidplay-ps4/actions/runs/40223133473)
did not execute. Its annotation says: “The job was not started because your
account is locked due to a billing issue.” This is not a CI test result;
the local checks above are the available validation. No billing settings or
workflow permissions were changed to bypass the account restriction.

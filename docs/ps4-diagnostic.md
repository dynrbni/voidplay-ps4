# Native diagnostic: research and observed results

Audit date: 2026-10-25. This document distinguishes host checks, transport and console execution.
No PS4 application launch or firmware 12.00 behavior has been verified in this session.

## Reproducible toolchain evidence

- Upstream [OpenOrbis v0.5.4](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/releases/tag/v0.5.4),
  source tag commit `b458dfd9d2f5c40aa249b127c9b9b4488afdc686`.
- Downloaded release `toolchain-llvm-18.tar.gz`, 158,688,666 bytes, SHA-256
  `3c7cd5bb593ca74fa1c13fd59f3938dc0fc07985167f7275063019e63abe4526`.
  This is our observed archive hash, not an upstream authenticity signature.
- The source checkout contains headers/examples but no built libc. The release provides the
  complete sysroot and macOS converter/packager. Its header contents are treated as the actual
  build inputs, not assumed identical to the source tag.
- Host: Apple Silicon macOS; non-Apple Homebrew clang/LLVM 23.1.4 and lld 23.1.4 installed for
  ELF cross-build. Homebrew also installed z3 and updated xz as dependencies. No shell profile
  or default compiler was changed. PkgTool.Core is an upstream x86_64 Mach-O executable;
  it ran successfully on this Mac. No support on a different host architecture is inferred.
- `build.py`: target `x86_64-pc-freebsd12-elf`, pinned SDK headers/libraries/CRT/linker script,
  explicit SCE import libraries. ELF inspection confirms x86-64; create-fself generated eboot.
- `package.py`: generated title ID `VPLY00001`, content ID
  `IV0000-VPLY00001_00-VOIDPLAYDIAG0001`, experimental title and original repository artwork.
  PkgTool `pkg_validate` passed every reported digest and signature check. This is fake-PKG
  structural validation, not Sony signing, installability or firmware compatibility evidence.
- Configured test package: `/data/voidplay-diagnostic` for owned reports/probes, `/data` as
  candidate storage target, raw GitHub branch `public/catalog.json` as HTTPS target.
  Final local PKG is 6,619,136 bytes, SHA-256
  `ab314fa3adbaea1dc721686117f05414270bd5905c0d72192383648ad5339523`.
  Its source and build configuration remain reviewable locally; generated artifacts are ignored.

## API decisions and limitations

The [OpenOrbis musl statvfs implementation](https://github.com/OpenOrbis/musl/blob/2b0bb8ce2fa64ac255cb656785729d159a5f074c/src/stat/statvfs.c)
contains PS4-specific branches that omit the `statvfs` conversion. Its `statfs` path also returns
an opened descriptor instead of the syscall result. The diagnostic therefore uses declared
`fstatfs(fd, &info)` on an open target directory, with a zeroed structure, return checks,
capacity overflow/range checks and mount reporting. The release's `libkernel.so` exports
`_fstatfs`, which the libc wrapper references. This is source/symbol evidence only; the
kernel ABI, sandbox permissions and data meaning require device testing. No hand-written
syscall number or guessed structure is used.

A valid capacity is logged as `candidate_unverified`, not verified console capacity.
`/app0` can describe the app's mounted package, `/data` can have sandbox-specific semantics,
and available blocks can differ from whole-disk free space. Compare the exact target/mount
with system settings and repeat under known small file changes before promoting an adapter.
The browser never queries `navigator.storage.estimate()` for PS4 capacity.

Controller uses declared module loading, user service and Pad initialization/open/read/close,
following the API families used by the [upstream input sample](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/tree/v0.5.4/samples/input).
It records successful connected reads and observed button bits during a 15 second window.
Initialization success without actual reads/buttons is not controller proof.

HTTPS uses declared [Http APIs](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/v0.5.4/include/orbis/Http.h),
SSL/Net modules and library-default TLS validation. The upstream
[net_http example](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/v0.5.4/samples/net_http/net_http/main.c)
sets a permissive SSL callback; this diagnostic deliberately does not adopt that behavior.
Redirects must report disabled, because setter signatures in the pinned header are incomplete.
An unsupported result is safer than inventing a prototype. A watchdog requests abort after
20 seconds and the response read is capped at 1 MiB. On-console abort semantics, certificate
trust, hostname checking, valid/invalid certificates and HTTPS response behavior are unverified.
A byte count is a retrieval observation, not schema validation or authority to install content.

File I/O requires a pre-existing application-owned directory. It exclusively creates a
small probe, writes/fsyncs/seeks/reads/compares it, checks close, and retains evidence. It does
not write package mounts, replace existing files or automatically remove evidence. The host
harness uses only a temporary directory and removes its own fixture after verification.

## Current results

| Test | Actual result |
| --- | --- |
| Host arithmetic and exclusive file round-trip | Passed with address/undefined sanitizers on this Mac |
| Native C compilation and ELF link | Passed against extracted release |
| SELF/eboot conversion | Passed |
| PKG creation and digest/signature validation | Passed locally |
| Owner FTP connectivity | Greeting `GoldHEN FTP server v2.2`; anonymous session accepted |
| FTP upload | Server accepted package; remote byte count matched local; full read-back verification pending |
| PS4 install/launch and first dialog | Not observed |
| Total/available bytes and mount meaning | Not observed; no verified capacity reported |
| Controller connected reads/button input | Not observed |
| HTTPS retrieval, negative TLS tests, timeout | Not observed |
| Application directory read/write | Not observed |
| Installation/cleanup integration | Unsupported; no automatic installation or cleanup |

FTP stage contains only the diagnostic's package under its owned directory. No console
application was installed or launched by this work. Do not treat the presence of a package,
matching size or a host validation result as successful console testing. Follow the
[native owner procedure](../native/diagnostic/README.md) to collect actual reports.

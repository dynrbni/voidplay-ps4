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

## Owner launch failure and corrected package 01.01

The owner attempted to launch package 01.00 on firmware 12.00 with GoldHEN and reported
“cannot continue using this application”, without a CE code. FTP inspection of the diagnostic's
owned directory found only the staged package/checksum, with no diagnostic report. This does
not identify the console-side root cause or prove whether `main` was reached.

Two build defects were found independently of that report:

- The original GP4 omitted `sce_sys/about/right.sprx`, `sce_module/libc.prx` and
  `sce_module/libSceFios2.prx`. The pinned [dialogs sample Makefile](https://github.com/OpenOrbis/OpenOrbis-PS4-Toolchain/blob/v0.5.4/samples/dialogs/Makefile)
  includes these runtime/sample files, supplied by the SDK's module build-and-copy step.
  `right.sprx` supplies shell About information; its absence alone is not established as the
  launch failure. The corrected packager copies all three OpenOrbis-built files from the
  complete release sysroot, rejects missing/empty inputs and validates the GP4 manifest.
- LLD 23 emitted a separate read-only LOAD with 4 KiB alignment, sharing a 16 KiB page with
  executable content. The corrected link uses 16 KiB max/common page sizes and `--no-rosegment`.
  The structural guard checks LOAD alignment, bounds, entry coverage and incompatible page
  permission overlap before SELF conversion. These checks reject the preserved original ELF.

A successful build writes hashes of the ELF, eboot, configuration and source inputs. Packaging
requires that matching receipt, so a failed or stale build cannot accidentally package an old
eboot. Package 01.01 retains title ID `VPLY00001`, increments both SFO versions and attempts its
first “01.01 reached main” dialog before storage or file-I/O probes.

Validation: host sanitizer checks and six Python regression tests passed. The original GP4
and ELF were explicitly rejected by the new checks. Corrected ELF/SELF/PKG built; PkgTool's
hash/signature checks passed. Extracting the actual PKG and hashing eboot plus all three
runtime files matched the exact build inputs. SDK runtime binaries remain untracked; the
release archive/source provenance and GPL notice above apply to the bundled modules.

Corrected package: 6,619,136 bytes, SHA-256
`34d83751ff53754fa28c3f5c02901c7a8ed4b7c9cd1ab63faeac27c2bb63a32f`.
It is a correction candidate, not evidence that launch on firmware 12.00 now works. Owner
reinstallation and the first dialog/report must be observed separately; no automatic package
installation, license changes, firmware changes or cleanup was performed.

Transfer attempt for corrected 01.01: FTP connection timed out before upload. The new package is available locally; its presence on the console is not claimed. The owner has been asked to re-enable FTP.

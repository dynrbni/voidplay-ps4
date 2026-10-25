# Experimental PS4 diagnostic

This small native app is independent of React. It reaches `main`, queries a selected filesystem
mount, tries a small exclusive file round-trip in its configured application directory, samples
controller input for 15 seconds, optionally retrieves a bounded HTTPS response, and displays
status dialogs. It installs no content and deletes no downloaded files. Firmware 12.00 is
**unverified** until observed on the owner's console. FTP connectivity does not prove launch.

## Build

Use the OpenOrbis v0.5.4 release asset, not the source-only checkout. It contains musl headers,
libraries/stubs, CRT, linker script and packaging tools. Keep it outside tracked source.
On macOS use non-Apple clang and ELF `ld.lld`; the build accepts explicit `LLVM_BIN` and `LLD`.
LLVM and lld are separate Homebrew packages. No shell profile or system compiler is replaced.

```sh
npm run native:test
export OO_PS4_TOOLCHAIN=/absolute/path/OpenOrbis/PS4Toolchain
export LLVM_BIN=/opt/homebrew/opt/llvm/bin
export LLD=/opt/homebrew/opt/lld/bin/ld.lld
VP_APP_DIRECTORY=/data/voidplay-diagnostic \
VP_STORAGE_TARGET=/data \
VP_CATALOG_URL=https://raw.githubusercontent.com/dynrbni/voidplay-ps4/codex/catalog-admin-storage-poc/public/catalog.json \
python3 native/diagnostic/build.py
python3 native/diagnostic/package.py
"$OO_PS4_TOOLCHAIN/bin/macos/PkgTool.Core" pkg_validate native/diagnostic/build/IV0000-VPLY00001_00-VOIDPLAYDIAG0001.pkg
```

The app directory must already exist, be reserved for this diagnostic and be writable in the
actual app sandbox. The app never creates arbitrary console directories. Without
`VP_APP_DIRECTORY` it logs only to stdout and skips file I/O; without `VP_CATALOG_URL` it skips
HTTPS. Storage defaults to `/app0`, which may be a package mount rather than internal storage.
Do not interpret that mount's figures as whole-console capacity. Configure the target based
on the actual environment, then compare with the console's storage settings. Generated
configuration, binaries and test outputs stay in ignored `build/`. Do not commit credentials.
The configured catalog URL must exist publicly before the console request; a branch URL is
for diagnostics, not a permanent production source.

## Owner console procedure (FTP transport)

1. Keep the firmware and homebrew launch environment unchanged. Record exact firmware,
   GoldHEN version, title ID, package hash and available disk figures shown in system settings.
2. Connect your FTP client using locally configured address/authentication. This task verified
   FTP access to the owner-provided endpoint but does not store connection credentials in Git.
3. Reserve `/data/voidplay-diagnostic` for the app. Transfer the test PKG there, read it back and
   compare SHA-256. Transfer alone does not install or launch a package. Use your existing,
   authorized homebrew package installation/launch method, observing prompts and errors.
4. Launch **Voidplay Diagnostic (Experimental)**, title ID `VPLY00001`. Record whether its first
   dialog appears. Press OK and exercise controller buttons during the 15 second sample.
5. Retrieve `report-<timestamp>.txt` and `probe-<timestamp>.txt` from the configured directory
   through FTP. If no report appears, record the launch/dialog error and sandbox/permission
   behavior instead of claiming success. Files are exclusive-created and retained; a repeated
   same-second filename fails rather than overwriting evidence.
6. Compare the report's total/available bytes and mount with system settings and repeat after
   a known small authorized file change. A plausible value alone is not a verified storage API.
   Review HTTPS status/body count independently of storage. No JSON is trusted for installation.
7. Preserve the report before manually removing only this diagnostic's files. Do not automate
   install/cleanup based on download completion.

The HTTPS test preserves library defaults, never installs a permissive certificate callback
and refuses to send if automatic redirects cannot be confirmed disabled. The pinned header
leaves redirect and timeout setters without usable prototypes; it does not invent signatures.
The request has a 1 MiB read bound and a 20-second `sceHttpAbortRequest` watchdog. The abort,
trust-store, hostname validation, TLS version and module behavior still need console testing,
including negative-certificate tests before this can become a production network adapter.
If a system call stalls despite abort, close the diagnostic through the console UI.

## Evidence and upstream audit

See [research and actual results](../../docs/ps4-diagnostic.md). Host tests only verify capacity
arithmetic and constrained file I/O on a Mac/Linux temporary directory. Cross-build and PKG
validation only verify build artifacts. They do not establish console compatibility, capacity,
controller input, TLS security, file permissions or installation status.

The diagnostic source is GPL-3.0-only; see `LICENSE`. It links the GPL-licensed OpenOrbis SDK
and its separately licensed runtime components. SDK binaries are not vendored; rebuilding
requires the linked upstream release and source. This is an experimental owner test artifact,
not a production console release.

## Launch correction 01.01

The owner reported a 01.00 launch failure on firmware 12.00. Use package **01.01** for the
next controlled test; it includes the pinned OpenOrbis runtime/sample modules, checked
16 KiB LOAD layout, and an earlier startup dialog. Do not infer that this fixes the console
error before testing. See [the correction evidence](../../docs/ps4-diagnostic.md#owner-launch-failure-and-corrected-package-0101).

`build.py` now produces `build-receipt.json`; `package.py` refuses stale/failed builds and
produces `package-receipt.json` containing version, size and input/package hashes. An SDK
without `samples/dialogs/sce_sys/about/right.sprx` and the two sample `sce_module/*.prx`
files fails instead of silently producing an incomplete package. On non-macOS hosts supply
`build/sce_sys/icon0.png` before packaging; macOS derives it from repository artwork.

For the standalone **0x199 IPI**, put the package directly in `/data/`, as its
[upstream instructions](https://github.com/0x199/ps4-ipi#usage) specify. The diagnostic still
writes its own reports/probes under `/data/voidplay-diagnostic`; retain that directory.
A source archive build and a PKG digest check do not establish runtime compatibility.

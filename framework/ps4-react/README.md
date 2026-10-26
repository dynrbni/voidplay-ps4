# Voidplay [BETA] — PS4 React

A standalone native React/QuickJS application with an SDL macOS preview and
OpenOrbis PS4 package target. The default app is now **Voidplay [BETA] 01.02**:
Discover, Browse, details, Favorites, Library, on-screen search and Settings.
It uses the white `voidplay.` wordmark and bundled Manrope/artwork.

The owner reports that Hello World **01.01 runs smoothly on the actual PS4**.
Version 01.02 preserves its source-built bootstrap modules and VideoOut path,
but the larger UI requires a new console run. Local checks cannot promise zero
runtime errors or firmware-wide compatibility.

This first native store shell bundles the published catalog revision 9. It does
not fetch updates online yet. Favorites and Library last for the current session.
Downloads, installation, console storage queries and YouTube playback are not
implemented; their screens explain the current state without simulated transfers.
The web/admin catalog application remains independent and unchanged.

## Build on this Mac

Requires Node >=22.18, Python >=3.12 with Pillow, Command Line Tools/Apple Clang,
SDL2, LLVM/LLD 18 and the complete OpenOrbis v0.5.4 release. The repository's
existing native environment already provides these except no CMake is needed.
The system/default compiler and shell profiles are not changed.
The preview bundle is signed locally with an ad-hoc signature after each atomic
binary replacement; no Apple Developer account or system security change is used.

```sh
cd framework/ps4-react
npm install
export OO_PS4_TOOLCHAIN=/absolute/path/to/OpenOrbis/PS4Toolchain
npm run doctor
npm test
npm run smoke
npm run build:ps4
npm run verify:ps4
```

Use `npm ci` to reproduce npm dependencies from the lockfile. The first build
fetches the hash-pinned QuickJS-ng source archive into ignored `.deps/`; later
builds use that local source. Dependency versions and notices are in
`dependencies.lock.json`, `package-lock.json`, `NOTICE` and `licenses/`.
`npm run build:ps4` bundles JSX, compiles/links the interpreter/renderer/host,
converts ELF to SELF, creates SFO/icon/GP4, builds and verifies the package.
It also compiles the GPL `libc.prx`/`libSceFios2.prx` bootstrap shims and includes
them under `sce_module/`. They are OpenOrbis modules, not Sony SDK binaries or
an implementation of the FIOS API.

Outputs:

- `dist/Voidplay-BETA.pkg` and `.pkg.sha256`.
- `dist/receipt.json`: exact inputs, outputs, source revision, hashes and explicit
  unverified hardware status. Do not share its local paths without review.
- `build/ps4/`: ELF, OELF, eboot, GP4, input/final SFO and object files.
- `build/hello-world.png` and `build/smoke.log`: native desktop smoke evidence.

`python3 tools/build.py native` builds the independent native text/display
qualification package before embedding React. It has a separate filename;
use the Voidplay package for the actual React application.

## Native preview and editing

```sh
npm run preview       # native SDL window, same bundle/QuickJS/layout/rasterizer
npm run smoke         # bounded real SDL run, key-event injection and frame capture
npm test              # layout/build tests and native ASan/UBSan runtime checks
```

Enter / controller Cross opens or confirms. Backspace / Circle returns.
D-pad and the **left analog stick** move focus; held directions repeat after a
350 ms delay at 140 ms intervals, with an analog deadzone. Up from the first
content item selects the header. Circle never exits the console application.
Escape/window-close exits on Mac; use the PS menu on PS4.

Application entry: `apps/voidplay/index.jsx`; metadata: `apps/voidplay/app.json`;
shared catalog: `apps/voidplay/catalog.json`; interaction state: `model.mjs`.
The old `apps/hello-world` source remains as a minimal example. The default title
ID stays `RCTX00001` so this is an update to the working Hello World installation.
Do not reuse it for an unrelated title. Build-time local artwork bindings and
attribution are in `apps/voidplay/assets/manifest.json`; no network fetch occurs
during asset baking. Catalog entries are never duplicated inside components.

```jsx
import { AppRegistry, View, Text } from '@ps4-react/core';
function App() {
  return <View style={{ padding: 96 }}>
    <Text style={{ fontSize: 56 }}>PS4 React</Text>
    <Text style={{ fontSize: 84 }}>Hello World</Text>
  </View>;
}
AppRegistry.registerComponent('hello-world', () => App);
```

See [the implemented architecture/subset](docs/architecture.md) for bounds,
unsupported features and the reference compatibility matrix. No DOM/CSS or
arbitrary React web application translation is provided.

## Transfer, install and test

1. Run `verify:ps4` and record the exact SHA-256. Check the title ID against your
   installed applications; change the manifest to avoid a collision.
2. Copy the PKG using a USB method supported by your installer, or the existing
   FTP setup. This owner uses FTP port 2121 and Internal Package Installer/file
   manager. `/data` was observed on that console; choose the path supported by
   your installed tool rather than assuming every installer scans the same path.
3. Verify destination size and a full read-back SHA-256 before trusting the copy.
   In prior attempts this console accepted full-size files but FTP read-back
   failed. Such copies were not marked ready. A size match alone is insufficient.
4. Install/register manually using the console's supported installer, then open
   **Voidplay [BETA]**. FTP does not install or launch anything.
5. Expect a fullscreen native UI. Cross should open the focused catalog entry; Circle should return. Test the
   D-pad and left stick, header routes, search and session collections for at
   least 30 seconds, then close from the PS menu.
6. Enable GoldHEN Klog before launching and capture with the existing read-only
   tool `framework/voidplay-native/tools/console.py collect-klog` (from repo root,
   with your explicit `--host`, `--port 3232`, `--seconds 60`). Look for
   `[ps4-react][startup]`, `[display]` and `[runtime]`; stream routing itself still
   needs console verification. Keep raw logs private. Do not dismiss a crash
   screen before preserving its useful diagnostics.

For a GUI FTP client, connect to the owner's confirmed `192.168.100.121`, port
`2121`, using the credentials configured on the console. Navigate to the directory
your installer supports (`/data` was previously observed), upload under a new
unique `.partial` filename with overwrite disabled, then download that file to a
different local filename. On Mac compare both copies:

```sh
shasum -a 256 dist/Voidplay-BETA.pkg /absolute/path/to/read-back.partial
```

Only if both full hashes match, rename the remote copy to a unique `.pkg` filename
and select that exact file in Internal Package Installer/file manager. If RETR
times out or hashes differ, keep the copy unverified and use another supported
transfer method. Do not use the older `console.py transfer` command for this app:
that command deliberately selects the separate Voidplay C++ Boot Test artifact.

Example read-only log capture, started before manually launching the app:

```sh
# Run from the repository root; output must be a new file.
python3 -B framework/voidplay-native/tools/console.py collect-klog \
  --host 192.168.100.121 --port 3232 --seconds 60 \
  --output /absolute/path/to/new-ps4-react-klog.log
```

If it fails, record firmware/GoldHEN/installer versions, exact package hash,
last stage, time and any CE code. CE-34878-0 alone does not identify the faulty
instruction. The earlier VPLY00002 boot test is a different title/artifact.
No installation, cleanup, firmware modification or automatic device action is
performed by the build command.

## Evidence

See [actual results](docs/verification.md). Local checks and owner-reported hardware results are distinguished.
The exact 01.02 package still needs console acceptance. GPL-3.0-only source and corresponding dependency/build
materials are supplied; third-party MIT/OFL terms remain in their notices.

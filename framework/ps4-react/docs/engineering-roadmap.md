# PS4React engineering baseline and roadmap

Status: 2026-11-19. This document records what the framework actually implements,
the decisions behind it, and the gates for the work described in the PS4React
master directive. It is an engineering record, not a compatibility claim.

## Verified baseline

| Area | Current result | Evidence |
| --- | --- | --- |
| JS engine | QuickJS-ng 0.15.0, hash-pinned source, 32 MiB heap, no JIT | `dependencies.lock.json`, `runtime/quickjs.cpp` |
| React | React 18.3.1 + reconciler 0.29.2, custom mutation host | `packages/core/index.mjs`, JS bundle tests |
| Layout | Deterministic measured row/column flex subset, nested scroll viewports | `packages/core/layout.mjs`, 24 layout tests |
| Rendering | CPU ARGB8888 compositor, damage repaint, native transitions | `renderer/canvas.cpp`, `runtime/scene.cpp` |
| Mac host | SDL2 window, keyboard/controller mapping, ad-hoc signed app bundle | `platform/desktop/host.cpp`, `react:smoke` |
| PS4 host | VideoOut double buffer, Pad/UserService polling, OpenOrbis bootstrap modules | cross-build source; hardware unverified |
| Storage | Bounded JSON preferences, atomic write, no arbitrary paths | `runtime/preferences.cpp`, store tests |
| App | Voidplay 01.05 native store, fictional catalog fixture | `apps/voidplay/` |
| Tests | Root 32 JS, framework 32 JS, 13 Python, native ASan/UBSan runtime | `npm run check`, `npm test` |

The 01.05 package was built from a dirty tree before this baseline and its artifact
is no longer present. No PS4 package from this tree has been installed or launched.
Mac rendering, tests and packaging structure are separate from firmware/hardware
acceptance.

## Decisions

### JavaScript engine: QuickJS-ng

QuickJS-ng is retained because it is small, embeddable in C++17 without exceptions
or RTTI, executes the pinned React 18 bundle, and the same source builds for the
macOS host and the OpenOrbis target. Hermes was not selected: its build and runtime
integration are materially larger, and no PS4 build or console evidence exists in
this repository. QuickJS upstream was superseded by the hash-pinned -ng archive
already used for both hosts.

Consequences: no JIT, no browser APIs, no worker runtime, no `SharedArrayBuffer`.
The engine heap and script/tick budgets are explicit and bounded.

### React integration: pinned reconciler

React 18.3.1 and reconciler 0.29.2 are pinned. The host renderer implements
`createInstance`, mutation, commit and deletion for `View`, `Text`, `Image` and
`ScrollView`; DOM elements fail loudly. Upgrading React without validating the
reconciler host contract is not a routine dependency bump.

### Layout: measured in-tree flex subset

The framework keeps its deterministic layout implementation instead of adding Yoga
now. The current subset covers row/column flow, explicit and intrinsic sizes,
padding, gap, margin, grow/shrink, min/max, percentage bounds when the parent is
definite, absolute positioning and nested clipped scroll regions. Adding Yoga
would introduce a second layout authority and a larger C/C++ dependency before the
existing contract is fully exercised. Yoga remains an evaluation candidate if the
target API requires a broader Flexbox surface.

### Renderer: CPU baseline, GPU later

The production path is a CPU compositor: React commits produce bounded draw
commands; the renderer replays changed regions and presents an ARGB surface through
SDL2 on Mac or VideoOut on PS4. This is intentional for the first qualification
baseline because it is deterministic, has no shader/texture-upload dependency, and
is already exercised by tests. SDL2 is the Mac presentation adapter, not a
cross-platform PS4 GPU renderer.

A GPU backend (OpenGNM or another OpenOrbis-compatible path) is a separate milestone.
It must be selected with a measured comparison, texture lifetime rules, shader
loading and real console evidence, not by assuming SDL2 provides PS4 acceleration.

### Threading: single runtime tick, no invented workers

The current frame loop and QuickJS runtime have one owner. Input and presentation
are sequenced by the host; a JS tick has a bounded budget. Background networking,
image decoding or asset streaming are not exposed because doing so safely requires
queues, cancellation and ownership rules that do not exist yet. No API silently
pretends those capabilities are available.

### Packaging

`tools/build.py` remains the single source of truth for Mac preview, native tests,
PS4 ELF/SELF, SFO/GP4 and package verification. A separate CLI is not introduced
until the underlying operations are stable and testable; duplicating build logic
would create two release paths.

## API status

| API | Status |
| --- | --- |
| `View`, `Text`, `Image`, `ScrollView` | Implemented host components |
| `AppRegistry` | Implemented, one root |
| `Controller.subscribe` | Implemented action subscription |
| `Scroll.subscribe` | Implemented offset subscription |
| `Preferences` | Implemented bounded load/save |
| `Motion.setEnabled` | Implemented native transition switch |
| `Diagnostics.report` | Implemented asset/font report |
| `Pressable`, `Button`, `FlatList` | Not in core; app-level UI only |
| `useController`, `useIsFocused` | Not implemented as core hooks |
| Animation scheduler | Native transition only; no JS animation API |
| FileSystem, Network, Storage, Downloads | Not exposed |
| CLI `ps4react create/dev/build/run/package` | Not implemented |

## Milestones

### M0: verified 01.05 baseline (this change)

- Replace the commercial catalog fixture with an original fictional entry.
- Keep the working bootstrap, title ID and VideoOut/Pad path.
- Pass root checks, framework JS/Python/native tests, smoke and diff checks.
- Publish source and documentation to `main`; no package/hardware claim.

### M1: core component and hook contract

- Add `Pressable`, `Button` and `FlatList` only after focus ownership, event
  dispatch and list virtualization semantics are defined.
- Add `useController`/`useIsFocused` with tests for repeat, disconnect and unmount.
- Keep the app-level `ui.jsx` as a consumer, not a second framework.

Acceptance: API tests, reconciliation tests, no-op and unsupported paths fail
visibly, and the existing Voidplay navigation remains unchanged.

### M2: native animation scheduler

- Time-based transitions, easing, cancellation and reduced-motion behavior.
- React commits schedule animations; frames do not rerun reconciliation.
- Measure frame-time distributions before/after on Mac; PS4 claims only after
  console measurement.

### M3: renderer/backend decision

- Build a minimal GPU spike behind the existing scene abstraction.
- Compare CPU and GPU on the same 1080p workload, including texture memory,
  upload cost and cleanup.
- Keep the CPU path as fallback until the GPU path is proven on hardware.

### M4: developer workflow

- Add a thin CLI over `tools/build.py` for doctor/dev/build/package only when each
  command is implemented and tested.
- Do not ship `run`, `create` or hot reload as stubs.
- Keep desktop-only validation clearly labeled.

### M5: PS4 qualification

- Restore or obtain the macOS packaging tool, build from a clean tree, verify the
  exact hash, install on the owner console, and record firmware/GoldHEN/installer
  versions plus logs.
- Only then update compatibility claims.

## Open risks

- No physical PS4 run for 01.04 or 01.05; 01.01/01.02 owner reports are historical.
- The local OpenOrbis copy is missing `bin/macos/PkgTool.Core`, so `doctor` and
  package creation are blocked on this host. The Mac preview does not need it.
- The renderer is CPU-only and fixed at 1920x1080 logical pixels.
- The catalog is a bundled fixture; there is no runtime catalog refresh.
- No GPU timing or PS4 frame-time measurement exists.
- Core API surface is intentionally smaller than React Native; unsupported APIs
  fail rather than silently doing nothing.

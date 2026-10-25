# Store foundation verification

Environment: macOS Apple Silicon, Node 26.7.0, npm 11.19.0, local Google Chrome via
agent-browser 0.39.2. No actual console tests.

## Automated checks

- `npm ci`: clean lockfile installation passed; npm reported zero known vulnerabilities.
  npm 11 warned that optional `fsevents@2.3.3` has an unapproved install script; no
  approval override was added and checks/build succeeded without one.
- `npm run check`: lint (zero warnings), strict type check, six Node behavior tests,
  Vite production build. Passed again after clean installation.
- `npm run test:e2e` against running dev server and again against production preview
  (`VOIDPLAY_URL=http://127.0.0.1:4173`): one passing full browser flow on each.
  Covers every application card, feature action, detail Close/Escape, focus restoration,
  native Tab cycling in modal (browser chrome may take one tab stop), arrow right/left,
  visible 3px focus outline, Home/Browse/wordmark navigation, text/category intersection,
  clear filters, offline/online event handling, empty fixture, malformed fixture,
  request failure, loading state and retry recovery.
- Browser regression captures 1920x1080 Home, 390x844 Home/Browse; screenshots inspected.
  No horizontal overflow at tested dimensions. All cards and controls usable.
- Runtime page-error collection empty at the end of browser flow. Injected network
  failures are deliberate test scenarios, not silently ignored production errors.
- Axe 4.12.1 WCAG 2 A/AA: Home 0 violations / 0 incomplete; Browse 0 / 0;
  Details 0 violations / 1 incomplete (automated overlap ambiguity for description
  contrast). Direct luminance calculation: muted text on dialog surface 7.89:1;
  muted text on cover surface 6.32:1. Both exceed 4.5:1.

## Corrections found by actual browser tests

- Removed dialog-closing effect cleanup: React Strict Mode replay closed the newly
  opened modal. Explicit close/cancel now closes before unmounting, preserving native
  focus restoration.
- Explicit Close/cancel state handling replaces reliance on asynchronous close-event
  behavior. Browser check asserts the dialog unmounts and can reopen.
- Test harness adjusted to supported agent-browser commands and awaited dialog removal,
  instead of assuming synchronous React updates.

## Anti-slop delivery gate

- Hard gates: PASS for this preview scope. Honest fixture/placeholder labels, no
  fabricated compatibility or download claims, real controls/destinations, tested
  loading/empty/error/offline states, visible keyboard focus and mobile reflow.
- Purpose gates: PASS. Palette/type/spacing/shelf/card decisions documented in
  `design.md`; no decorative gradients, glow, icons, blur or fabricated visual assets.
- Liveliness: PASS. ENERGY 2 / RHYTHM 2 / MOTION 1; featured typographic cover is the
  focal point, shelf is subordinate, amber selection and split wordmark recur.
- Craftsmanship/quality locks: PASS within desktop mock-catalog scope, based on
  browser flows, screenshots and checks above. This is not a final cover-art design
  or a console release.

## Known limits

Only local Chrome and the listed sizes were exercised. PS4 browser/embedded runtime,
controller input, long-running transfers, checksum verification, persistent offline
caching and all backend/admin behaviors are untested or absent. Screen-reader and
physical TV viewing have not been manually evaluated.

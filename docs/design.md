# First store slice

Approved direction: the user accepted the proposed desktop home/catalog slice and asked to continue.

Reading this as a TV-oriented homebrew catalog for PS4 owners, in a restrained console-library language, ENERGY 2 / RHYTHM 2 / MOTION 1.

## Scope and boundaries

React/TypeScript/Vite desktop preview only. Home features one mock application and a recent shelf; Browse supports text search and categories. A native HTML dialog reveals selected fixture metadata and restores focus on close. All entries explicitly say mock; no download URL, file size, checksum, version, or console compatibility is invented. Downloads and installation are unavailable, not simulated. No backend/admin or console APIs enter this slice.

Catalog JSON loads asynchronously with runtime validation and retryable loading/error states. An empty catalog or unmatched search provides a clear recovery action. Browser offline status is reported separately: cached local fixtures can still be viewed. A future API can replace the loader without changing catalog presentation.

## Visual decisions

- Charcoal `#171a1e` and raised slate `#24292f` reduce TV glare and separate content levels.
- Warm-white `#f3f1eb` and muted `#b8bfc7` keep body text readable at viewing distance.
- Amber `#f4bd6a` marks selection and focus rather than decorating every surface.
- A restrained Georgia display title paired with system sans body text distinguishes the library while retaining readable controls without web-font downloads.
- A wide featured panel above a consistent shelf reflects featured versus browse hierarchy; catalog cards stay uniform for directional predictability.
- Large spacing and 48px controls support remote viewing and keyboard targeting; mobile reflows without horizontal scrolling.
- Text-only cover placeholders explicitly name missing artwork; no borrowed icons, invented branding assets, or unlicensed screenshots.
- The recurring split Void/play wordmark treatment is typography, not a fabricated app icon. Small square corners and a strong amber focus frame provide the repeated console-library motif.
- Only focus/hover color transitions; reduced-motion disables transitions. No background ornaments, glow, blur, or animated progress.

## Input and checks

Tab follows document order. Arrow keys move spatially between enabled controls, while text inputs and selects retain native editing. Navigation is separate from cards. Dialog Escape/close uses the browser's focus restoration. Desktop keyboard tests do not demonstrate PS4 controller support.

Use Node's built-in test runner for pure catalog/focus logic and browser checks for visible flows, modal focus, empty/loading/error/offline states, and mobile/1080p layout. Lint, type check, and production build before committing.

## Licensing

No Overdrive code/assets reused. Inspect upstream license and notices before any future reuse. Fictional fixtures are visibly mock and are not distributable packages.

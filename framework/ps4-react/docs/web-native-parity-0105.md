# Web/native framework parity — 01.05

The source of truth is `src/App.tsx`, its public view components and
`src/styles.css`. Web uses React 19, DOM/CSS/WOFF2; native uses React 18/reconciler,
QuickJS and bounded C++ draw commands. CSS is translated at shared layout/component
boundaries; it is not executed by a PS4 browser. Keep VideoOut/Pad/bootstrap intact.

## Baseline and discrepancy matrix

01.04 (a018496) is preserved as a clean benchmark source archive. The inherited
unfinished changes were backed up outside Git before editing. Initial checks had
21 passing / 3 failing JS tests, while desktop compilation succeeded.

| Area | Actual web behavior | Native root cause | Repair and regression |
| --- | --- | --- | --- |
| Discover | Vertical document: hero, all nonempty shelves, footer | 01.04 selected one fixed shelf; unfinished scroll lacked complete controller contracts | Real `Discover` uses one measured page ScrollView plus independent shelf ScrollViews; native runtime tests reach real footer and all three fixture shelves |
| Horizontal shelves | Scroll to focused card without moving the page unnecessarily | Nested reveal returned entire viewport, causing unrelated page movement | Propagate the clipped focused rectangle; 59 right inputs reach final fixture card with identical page offset |
| Focus/header | Sticky header overlays initial hero, darkens after scroll; focused items remain readable | Fixed coordinates, no top inset, stale cached page state | Shared focus reveal inset, active scroll notifications, fixed header plus actual scrolling document footer |
| Typography | Manrope variable 400/500/550/600/650/700/750/800, small regular captions, measured line boxes | One weight, small-size bitmap fallback, manual character wrapping, atlas-top baseline | Native-size weighted TTF masks, measured shared word wrapping and real font half-leading; raster and layout tests |
| Unicode | Latin punctuation/accented titles stay intact | App removed non-ASCII characters | NFC Latin-1 and store punctuation, UTF-8 raster/measurement; explicit once-per-codepoint missing glyph warning with visible ? |
| Flow layout | Nested flex, intrinsic text, constrained width, growth/shrink, overflow | Fixed dimensions or one-pass sibling positions | Separate measure/place/paint, percentages with definite parents, min/max dimensions, margins/gap, grow/shrink and repeated-update tests |
| Clip/layers | Each nested shelf restores its parent's clip | Inner clip reset to unbounded surface; alpha rectangles overwrote rather than blended | Parent clip restoration and C++ source-over rectangles; nested viewport and raster bounds tests |
| Cards | Square covers, 16px/550 titles, 12px captions, focus halo | Oversized layout, bitmap captions and outline clipping | Shared web tokens, measured label clamp, padded scrolling halo; visible cards remain within intended viewport |
| Long catalogs | Last entries remain reachable | Silent 24-item shelf cap, mounting all records would exceed node budget | Keep full data extent with measured leading/trailing spacers and bounded nearby card/grid windows |
| Details | Full description/changelog and metadata, two-column information, sources/gallery | Truncated text and tab-sized pages | Measured blocks retain all text; focus reaches each paragraph/metadata row; shared components and scroll page |
| Assets | Correct aspect ratio, alpha and fallbacks | Fixed cover fitting, unknown image could fail JS frame | Explicit cover/contain/fill, checked local asset paths, missing-image log/fallback; file absence fails build with path |
| Other pages | Shared header, filters, grids, collections, queue/Settings and empty states | Separate coordinate patterns and duplicated body positioning | All public screens use shared flow primitives/tokens/page container; controller and root regressions preserve services |
| Runtime | State changes update view and preserve selection | Scroll reset risk and untested lifecycle | Real JSX reconciliation tests while scrolled, repeated mounts, Hello World counter/Cross/Circle and sanitizer guards |

## Implemented framework semantics

- `View`, `Text`, `Image`, `ScrollView`; row/column flow, explicit/intrinsic sizes,
  bounded padding/gaps/margins, main/cross alignment, flex growth/shrink, min/max
  dimensions and percentages when the parent dimension is definite. Absolute
  positioning remains for artwork/fixed rails/overlays. Unsupported style names,
  family names and layout modes fail with the offending node/style.
- Text measurement and drawing share one native word wrapper. Pixel sizes and
  line heights use logical 1920x1080 pixels; font ascent/descent give CSS-style
  half-leading. Line clamping uses measured height. Fonts/assets are baked before
  compilation, so no asynchronous font/image fetch can leave a stale layout.
  Every React commit remeasures the changed view tree with a bounded text-metric
  cache. Native images use explicit sizes and intentional fit modes.
- ScrollView has stable `scrollKey`, measured content extent, viewport/clip, axis,
  saved offset, optional focus-reveal insets and anchored child reveal. Nested
  regions preserve axis independence. Offsets survive reconciliation and are
  clamped on content shrink; active scroll notifications drive header state.
- The font source is bundled SIL OFL Manrope variable TTF; browser WOFF2 is not
  loaded by the console. Bake 8 weights x 51 display sizes with known Latin-1/
  punctuation coverage. `build/font-report.json` records source hash, weights,
  sizes, glyph coverage and metrics; startup logs `Diagnostics.report()`.
  Italic, complex shaping, CJK and arbitrary font families are unsupported.
- Rendering retains dirty regions, bounded image caches and timed native
  transitions. Layout/React run on commits, not on every animation frame. CPU
  rendering remains; no GPU texture or browser hardware-acceleration claim.

## Comparison protocol

Reference viewport: 1920x1080. The comparison was recorded against public catalog
revision 9 before the fixture replacement. The native build now bundles a
fictional **Orbit Workshop** entry with original Voidplay concept art; the prior
commercial test entry and its remote cover were removed. A temporary copy of the
built web store served the comparison snapshot locally; only artwork URL paths
were adapted to `/art/` so network availability could not alter the comparison.
Public/private catalog sources and live Pages are unchanged. The new hero is a
1672x941 original source and is contained rather than enlarged; a genuinely larger
landscape source is still required for a sharper full-screen hero.

Observed web positions: header 76px, featured copy (80,162), title (80,201.8),
56px/650 with 62.72px line height, hero height 669.6, shelf heading (80,621.6),
first square cover (80,680.6), 283x283, title/caption block at y963.6.
Native screenshots and final measured offsets/results are recorded after visual QA.

## Validation and actual limits

Desktop tests are not proof of PS4 hardware correctness. Console bootstrap and
flip/input ownership are preserved; the exact 01.05 package still needs a physical
console test. No transfer, installation, storage capacity, online catalog refresh
or YouTube playback integration is invented. Those explicit unavailable states
remain. The test-only 60-entry fixture and Hello World test bundle never enter
Voidplay's production bundle/package. The public/private owner catalog is
unchanged; the native fixture is a separate fictional snapshot.

Remaining differences: CPU shadow/transition approximations, no CSS backdrop blur,
no web input caret/IME/browser video, limited Unicode and no automatic viewport
reflow on PS4 (fixed 1920x1080). Mac can resize the presentation window; that scales
the fixed logical canvas. Structural viewport changes may use a native crossfade
rather than browser compositor scrolling. These limitations must remain explicit.

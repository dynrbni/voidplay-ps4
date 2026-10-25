# Cinematic redesign verification

## Baseline and scope

macOS Apple Silicon, Node 26.7.0, local Google Chrome via agent-browser 0.39.2.
Foundation baseline passed lint/types/six tests/build before changes. No backend or
console changes. Branch is stacked on unmerged foundation PR #1.

## Results

- `npm run check`: PASS, ESLint zero warnings, strict TypeScript, seven Node tests,
  production Vite build. Tests cover catalog validation (including art URL restrictions),
  filter intersection, immutable title sort, fixture validity, fetch failures and spatial candidates.
- `npm run test:e2e`: PASS against development preview, then production preview using
  `VOIDPLAY_URL=http://127.0.0.1:4173`. One full browser regression per run.
- Browser coverage: hero sizing and real actions; horizontally overflowing shelf;
  left/right row boundaries, up/down movement, focus outline, scrolled-card dialog and
  focus/scroll restoration; shelf buttons; Browse/category/search/sort; all six details;
  Search focus; Escape back; mobile overflow; offline hint; failed hero/poster artwork;
  loading/empty/invalid metadata/network failure and retry. Final page errors: none.
- Rendered screenshots inspected at 1920x1080 (Discover and Browse) and 390x844
  (Discover and Browse). The hero dominates, first shelf begins beneath it; Browse is
  a distinct dense poster grid. No horizontal document overflow. Home has intentional
  lateral shelf overflow only. `docs/images/` holds desktop evidence.
- Axe 4.12.1 WCAG 2 A/AA: Discover zero violations / zero incomplete; Browse zero /
  zero. Fixed an invalid accessible label role and replaced translucent concept-art
  captions with opaque backgrounds to remove contrast ambiguity.
- Manrope font self-hosted with OFL notice; concept SVGs locally authored and labeled.
  No runtime dependency added; no remote image/font dependency.

## Issues found and fixed

- Escape attached only to the React shell missed cases where focus fell to the
  document after route changes. Document-level handler now restores Discover context.
- Search while already in Browse could lose focus to pointer timing. Existing-page
  Search now focuses the mounted native input directly; cross-page focus waits for render.
- Hidden mounted screens preserve shelf offset and input state; hidden controls are
  excluded from directional navigation and the accessibility tree.

## Design gate

- Hard gates PASS for desktop preview scope: honest mock/concept disclosures, no
  invented metrics or compatibility, real destinations/actions, recovery/fallback
  states, keyboard focus, responsive layout and rendered-browser evidence.
- Purpose gates PASS: hero overlays protect text; poster layout serves shelf scanning;
  Manrope unifies TV hierarchy; amber indicates selection. Rationale in design.md.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 1; cinematic focal feature contrasts
  with compact shelves and dense Browse, with restrained focus transitions.
- Craftsmanship PASS within implemented mock store scope; no unbuilt nav destinations,
  decorative controller hints or download/install controls.

## Limitations

The requested two screenshot attachments were not available to this session; visual
review follows the written specification, not a direct reference-image comparison.
Only listed Chrome desktop/mobile viewports were tested, not physical TV viewing,
manual screen-reader usage, PS4 execution or controller hardware. Real versions,
file sizes, ratings, popularity, release dates and compatibility are absent rather
than invented. Font subset covers Latin; system fallback handles other scripts.
No install/download/library/admin/backend capabilities are added by this redesign.

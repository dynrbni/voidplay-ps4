# Compact beta store verification — 2026-10-25

## Scope

User-requested correction to PR #3: transparent sticky header, smaller typography/spacing,
revised navigation and white BETA, homepage/detail layouts following two supplied screenshots,
solid-white saved hearts, and a connected dummy download flow. The user explicitly deferred
source URLs/admin publishing and asked to focus on dummy transfers. No real package transfer,
PS4 receiver or install capability is implied by the demo.

## Automated checks

- `npm run check`: PASS, ESLint zero warnings, strict TypeScript, 15 pure-logic tests and Vite
  production build. JS approximately 345 kB / 104 kB gzip, CSS approximately 22.4 kB.
- `AGENT_BROWSER_BIN=<local-binary> VOIDPLAY_URL=http://127.0.0.1:4175 npm run test:e2e`:
  PASS, all four isolated browser scenarios on the production build.
- Main scenario asserts exact header labels/icons, transparent computed background, sticky
  position/top after scroll, white BETA and first-cover height within 1080p. It tests focus-driven
  hero updates, keyboard/filled-heart synchronization, Favorites inline removal/focus fallback,
  separate tracked Library persistence, six detail routes, related routes, filters/sorting,
  independent Search/result focus, shelf/focus/scroll restoration and responsive overflow.
- Recovery scenario covers offline, missing art, empty/malformed catalog, loading, network abort,
  retry, collection write failures/corruption and recovery. Gallery scenario uses only test-local
  intercepted metadata to cover next/previous/missing images and selected-item context.
- New demo scenario covers detail→Downloads, live-updating simulated progress, pause stability
  across timer ticks, queueing multiple items, duplicate prevention, automatic promotion of the
  next demo, resume, progress continuing across pages, reload→paused restoration, no automatic
  Library entry, cancel/retry, completion bounds, clearing finished entries, demo storage failure
  and corruption. Instrumented fetch observed no request initiated by the dummy transfer flow.
- Pure tests cover the strict catalog/artwork contract and physical assets, filtering/sorting,
  loader errors, routes/collections/spatial selection, plus simulator transitions, single active
  demo, paused state stability, restart, completion, bounded/corrupt storage and `mode: demo`.
- `git diff --check`: PASS. No new runtime dependency or executable/package asset.

Environment: macOS Apple Silicon, Node 26.7.0, local Chrome through agent-browser 0.39.2.

## Visual inspection

Actually inspected rendered 1920×1080 Discover/detail/Downloads and scrolled header, 1366×768
Discover, and 390×844 Discover/detail/Downloads; Browse and other destinations also have
responsive browser assertions and captures. Compared actual page hierarchy with both supplied
reference images: transparent overlaid navigation, compact square covers, first shelf within
the screen, left-aligned editorial copy and full-backdrop details with bottom actions.
No proprietary reference artwork was added to the project.

A correction pass fixed mobile Downloads controls shrinking title/progress into a narrow column;
controls now wrap under a full-width content area. Header text shadows and dark icon circles
preserve the transparent header while helping legibility over artwork. All cards keep a visible
favorite action and keyboard focus state. Screenshots wait for image decode/paint.

Axe 4.12.1 WCAG 2 A/AA: zero violations on all eight screens plus an active Downloads state.
Browse/detail/Search/Favorites/Library/Downloads/Settings and active Downloads have zero
incomplete rules. Discover has one incomplete contrast rule for the first shelf heading/action
overlapping the backdrop. Its rendered contrast was inspected manually. This is a targeted
browser audit, not a full physical-TV/screen-reader accessibility certification.

## Evidence and limitations

`docs/images/` contains the current Discover, Browse, detail, mobile and demo-Downloads examples.
Original concept art/font are local. Local collection persistence remains separate from dummy
queue persistence. No actual source/admin endpoint, internet-speed measurement, file write,
resume protocol, checksum, install, physical PS4 controller/runtime or console compatibility was
tested. Demo values are labeled in the UI; a completed simulation means no file was transferred.
The queue is intended for one active app tab; cross-tab ownership is deferred. Offline reload
is not guaranteed because no service worker/cache layer is implemented.

Branch: `codex/fluid-store-redesign`, updating [PR #3](https://github.com/dynrbni/voidplay-ps4/pull/3)
against `feature/homepage-cinematic-redesign`. Earlier foundation/homepage PRs remain separate.

Implementation commit: `4094fefdb999d3cad0054648a45a89c1f255166a`. Push was verified by
matching `git ls-remote` to the local commit, and PR #3 title/body were updated to the final
compact-layout/dummy-download scope. The following docs-only handoff does not change tested code.

## Scrolled header and shelf focus follow-up

The header now changes from clear to a blurred translucent surface above 24px of scroll. Poster focus uses an inset white ring and padded scrolling gutters so the selected edge is not outside the clipped scroll viewport. Artwork fades and focus lift respect reduced motion. The E2E checks cover transparent initial state, scrolled surface, sticky position, first/last focus and responsive overflow.

## Admin catalog and storage milestone

- `npm run check`: strict lint/types, 23 unit tests, catalog validation and independent store/admin production builds.
- `npm run verify:public`: built store manifest is valid; no admin/workspace/package/credential markers in `dist/`.
- Four production store E2E scenarios plus two admin/publication scenarios. The admin scenario fills the actual form, validates missing metadata/auth instructions, configures/removes sources, previews, stages a snapshot, saves draft edits without leaking them, exports and unpublishes. The date input uses a native value/input event in the harness because agent-browser's text fill does not populate Chrome's date control.
- Browser publication test injects test-only authorized metadata; the checked-in public catalog still has no executable package entries. One manifest supplies home, browse, search and direct detail; unpublishing the last entry keeps the public catalog empty.
- `/voidplay-ps4/` subpath preview: catalog, twelve visible images and self-hosted font loaded; no document overflow.
- Axe WCAG2 A/AA: zero violations on admin empty/editor/preview and Settings. Existing shelf/gradient coverage limits still apply to older store audits.
- `npm run native:test`: capacity bounds/overflow and exclusive file read/write checks pass with address/undefined sanitizers on the Mac. Native ELF, eboot and PKG build; PkgTool validates local package hashes/signatures. See `docs/ps4-diagnostic.md` for exact provenance and the separate, unverified device results.
- FTP connection and remote package size observed. Full package read-back timed out on both passive/active attempts. No PS4 package install, app launch, native storage result, controller input, HTTPS request or sandbox file round-trip has been verified.
- GitHub Pages remains disabled; the manual main-only deployment workflow has not been run. No credential-bearing publishing endpoint is present.

Remote handoff: PR #4 (`codex/catalog-admin-storage-poc` → `codex/fluid-store-redesign`), implementation commits `40a70f7` and `da882b0`. GitHub Actions run [40210738627](https://github.com/dynrbni/voidplay-ps4/actions/runs/40210738627) did not start any job steps: GitHub reported the account is locked due to a billing issue. Remote CI is therefore unavailable, not passing; no account billing changes or repeated reruns were attempted.

## Native launch failure follow-up

Owner reports package 01.00 cannot continue on firmware 12.00/GoldHEN, without CE code.
The package lacked three files included by the pinned OpenOrbis sample; its ELF also used a
4 KiB RO LOAD sharing a 16 KiB executable page. Added package-input and ELF structural guards,
checked build receipts and corrected packaging/link flags in version 01.01. Original artifacts
fail the new guards. Six Python regression tests and host sanitizer checks pass; corrected
native build, PKG hash/signature validation and extracted-payload hash comparisons pass.
Console-side cause and corrected launch remain unverified; no automatic install was attempted.

## Password-authenticated owner studio and live Pages — 2026-10-26

Owner selected a loopback Mac backend for development. The public Pages admin
shell contains no credential or private workspace. Server authentication protects
all workspace/edit/import/publish endpoints. The requested password was configured
through hidden input; a salted scrypt verifier is stored privately with mode 0600
inside a mode 0700 ignored directory. Sessions expire and remain only in memory.
Unauthenticated access to the running Mac workspace returned HTTP 401.

- `npm run check`: PASS, zero lint warnings, strict TypeScript, 29 tests, real-mode
  manifest validation and independent store/admin production builds.
- `npm run verify:public`: PASS. Combined Pages output inspection also rejects
  server/private workspace/package/credential markers. Private verifier material
  was checked against tracked text and generated Pages output with no matches.
- Two isolated owner/publication browser scenarios PASS: wrong/correct password,
  private authoring, three independent mirrors, optional normalized YouTube
  trailer, snapshot isolation from later draft edits, publication/unpublication,
  logout/reload, mobile overflow and zero WCAG2 A/AA axe violations on login/editor.
  The tests use a temporary backend/workspace and fixture publisher. Trailer
  network responses are intercepted; actual uploader playback is not certified.
- Four store regression browser scenarios PASS using explicit test-preview data.
  Real mode also covers empty catalogs, genres/search and direct details from
  the same published manifest. No test fixture was published to the live site.
- One browser run during asset rebuild/deployment timed out at snapshot staging.
  Two subsequent isolated runs passed; the harness now waits for the metadata
  editor after leaving trailer preview and reports visible validation errors on
  failure. The original timeout's cause was not established.

Actual deployment evidence:

- [Store](https://dynrbni.github.io/voidplay-ps4/),
  [admin shell](https://dynrbni.github.io/voidplay-ps4/admin/) and
  [catalog JSON](https://dynrbni.github.io/voidplay-ps4/catalog.json) returned HTTP 200.
- Initial `gh-pages` assets: `3b5ea71ee9e1a2269421831343dba97a94bcfd36`.
- A password-authenticated request to the actual Mac backend committed the empty
  real-mode catalog revision 1: `fa58612aaf227e8982139e403038239e73c38963`.
  This is an actual GitHub publication, separate from fixture browser tests.
- Asset redeploy: `8e638b1f9b3190a308039aa996317b618c901f37`. GitHub Pages API
  reported `built` with no error. It preserved revision 1's exact catalog blob
  `c4b59dd37d2339ae140816f21e00fff83f0288cd`, despite the source catalog being r0.
  HTTP re-fetch confirmed revision 1, `previewMode: false`, zero entries.
- The deployed admin's **Open studio on this Mac** link was verified in Chrome
  to target `http://127.0.0.1:5186/`. Direct localhost serves HTTP 200. Chrome in
  this session blocked Pages HTTPS-to-loopback API access, so use that local
  studio link when the browser does not permit local-network access. Pages
  alone cannot host the authenticated backend; this Mac must be running.

Source implementation `9c6086fccc9e6385c0339ada71a66f7ac0309832` and local-studio
fallback `639af8c` are pushed on `codex/pages-owner-catalog` in
[stacked PR #6](https://github.com/dynrbni/voidplay-ps4/pull/6), targeting
`codex/cpp-runtime-foundation`. PRs #1–#5 remain unmerged. The deployment branch
is separate; publishing does not bypass the source PR integration policy.

Hosted source checks did not start: [run 40230710043](https://github.com/dynrbni/voidplay-ps4/actions/runs/40230710043)
reports the account is locked due to a billing issue. Local checks pass; hosted
CI is unavailable, not passing. Legacy branch-based Pages deployment succeeded
independently. No account billing changes were made.

The catalog intentionally contains no invented real game/package. Browser source
links and catalog metadata are live-capable; native C++ catalog retrieval,
YouTube playback, console downloads/installation and firmware 12.00 runtime
remain unverified/unimplemented in the separate native startup PoC.


## Optional metadata, owner artwork repair and boot crash — 2026-10-26

- `npm run check` PASS: lint/types, 32 tests, both production builds and catalog
  validation. `verify:public` and combined Pages output validation pass.
- Two admin/publication browser scenarios PASS after updating the requirements:
  ID-only entry staging/publication, page-to-image helper response, three optional
  mirrors, snapshot isolation and logout. Minimal public metadata renders detail
  pages with honest unknown values, no sources and a real cover fallback after a
  failed hero. Four existing store browser regressions also PASS.
- Artwork failures were page URLs used as images, not an absent catalog entry.
  The authenticated resolver checks HTTPS public-address DNS, pins the result,
  validates redirects/types and limits HTML/body/time. Pure checks cover page
  metadata extraction and private/reserved/mapped-address exclusion. The real
  supplied cover page resolved to an image; the supplied wallpaper host returned
  403. Failed/missing cover and hero can fall back to each other.
- Backed up private workspace revision 8, repaired only its known artwork fields
  while preserving draft and public snapshots independently, then published r9 in
  `b2a0d5e6ea05a01d6b616c6fa5a3cf4f8103333f`. No fixture was added and no unrelated
  draft metadata was published. Owner-supplied content remains in the live catalog;
  it was not copied into tracked components/tests.
- Source fix `e988263` and native candidate `4b78134` pushed to the existing PR #6.
  Pages assets `3876665a052d7ed0168f7e785e4f4b8ff9e4e22f` reported `built` with no
  error. Redeploy preserved exact r9 catalog blob
  `d3160a9a1d549a549d51bfef171f0c882a0bc689`. Local owner server was restarted on
  127.0.0.1:5186; an old tab with no unsaved editor still showed r1. The refreshed
  admin checks newer workspace revisions on focus when it has no unsaved edits.
  Server restart revokes old memory-only sessions, so the owner signs in again.
- Live Chrome verification after deployment loaded the actual owner entry and
  decoded its remote cover plus hero fallback successfully; inspected the rendered
  screenshot. The source cover is low resolution, so a distinct landscape hero
  remains optional. No image was downloaded into the repository or committed.
- Hosted check 121343029733 did not start because of the same account billing
  lock. Local results above are the available check evidence.

The screenshot is a real console failure of VPLY00002. Klog recorded crash
reporting/exception code 12 but no faulting instruction or verified main marker.
Candidate 01.01 keeps the boot probe alive instead of returning through libc exit;
this is an experiment supported by the bundled object's disassembly and another
native port's report, not a proven root cause. Local sanitizer/11 Python tests,
cross-build, extracted-content and package checks passed. Full-size FTP writes
were observed, but read-back failed; receipts remain not ready/not installed/not
launched. The owner cannot install the new candidate yet. Hardware verification
therefore remains pending. Exact candidate hashes and test procedure are in
`framework/voidplay-native/docs/hardware-evidence.md`.

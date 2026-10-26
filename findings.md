# Audit findings

## Local baseline
- Workspace: `/Users/dyn/Documents/Coding/Project/voidplay-ps4`.
- Initial directory listing: zero entries. No source, README, AGENTS.md, package.json, lockfile, build scripts, tests, configuration, or Git metadata.
- `git status --short --branch`: exit 128, not a Git repository.
- Build/test status: not run, no project or scripts exist. No pre-existing code failure identified.
- Node: v26.7.0. npm: 11.19.0.

## GitHub verification
- Intended remote: `https://github.com/dynrbni/voidplay-ps4.git`.
- `git ls-remote --symref ... HEAD refs/heads/main` and full `git ls-remote ...`: success, no refs.
- `gh repo view dynrbni/voidplay-ps4 --json nameWithOwner,url,isEmpty,defaultBranchRef,viewerPermission`: correct repository, `isEmpty: true`, blank default branch, `viewerPermission: ADMIN`.
- Read access confirmed; push authorization not tested. Local origin not configured because Git not initialized yet.

## Cinematic redesign findings
- Existing Home and Browse shared a flat layout and serif type; redesigned presentation without replacing data loading or runtime boundaries.
- Original concept artwork and local Manrope replace repeated text covers; font OFL retained, no package dependency added.
- Homepage uses curated subsets rather than unsupported popularity/ratings/recency. Only implemented navigation destinations shown.
- Updated dev/production browser regression passed; seven Node checks plus lint/type/build pass. Discover and Browse axe scans each zero violations/incomplete.
- Two reference screenshot attachments were not available; inspected rendered 1080p/mobile against written specification instead.
- Current main is still initial baseline; redesign branch stacks on feature/store-foundation to preserve unmerged app history.

## Implementation findings
- React/TypeScript/Vite first slice is now present. Clean install and quality gates pass; see docs/verification.md.
- Correct origin configured after one Git initialization; baseline 722faee pushed on main.
- Direct dependencies use MIT/Apache-2.0; npm install/ci report zero known vulnerabilities.
- Optional fsevents install-script warning did not prevent checks; no override added.

## Upstream boundaries
- Overdrive GitHub metadata: license null; root listing has no LICENSE. No code/assets reused.
- OpenOrbis README requires non-Apple LLVM; current Mac has no configured OO_PS4_TOOLCHAIN and no Homebrew LLVM binaries at checked path.
- OpenOrbis latest release v0.5.4 lists one toolchain-llvm-18.tar.gz asset; host suitability not proven. Upstream sample hardcodes Intel Homebrew paths on Darwin.
- No OpenOrbis build attempted. No console connection or PS4 runtime verified. Sources and next experiment in docs/ps4-status.md.
- React desktop preview does not establish PS4 compatibility.

## V2 redesign audit (2026-10-25)
- Clean working tree on feature/homepage-cinematic-redesign; existing PR #2 targets feature/store-foundation, PR #1 targets main. V2 will stack on PR #2's branch.
- Six fictional mock entries; no authorized packages, live metadata or screenshot gallery. Existing details are a small text dialog; Favorites/Library/Downloads/Settings absent.
- Local Manrope already included. Existing artwork is original SVG. UI has amber selection and an oversized metadata/disclosure emphasis that V2 removes.
- Reference screenshots were not attached to this session. Written design brief is the available reference.
- V2 image generation used only for original visual references and concept artwork; no proprietary assets or application screenshots copied. Six WebP assets total approximately 1.7 MB.
- Screenshot QA must await image decode and paint: complete/naturalWidth alone can precede asynchronous decoding.
- Native Chrome/agent-browser locators support select via snapshot refs; `find ... select` is not a supported action. Gallery interception requires a reload after installing the test route.
- Final axe incomplete contrast checks are gradient-covered header text and intentionally clipped shelf items. Opaque palette contrast and stronger header coverage provide manual evidence; no full certification claimed.

## Compact beta correction
- User supplied both visual references and clarified real sources/admin publishing are deferred. Dummy download simulation is explicitly authorized and labeled in the UI.
- Header computed background is transparent, position sticky, top remains zero after scroll. Square first shelf fits vertically in the 1080p opening view.
- Favorites now need sibling buttons rather than nesting a heart inside a card button; row navigation preserves whether the user is traversing cards or hearts.
- Active/queued demo records restore paused. Demo progress is separate from catalog metadata and tracked Library; no real transfer request occurs.
- Mobile transfer controls initially shrank the title/progress; explicit wrapping fixed the content width.

## Admin/storage milestone audit
- Clean 2e6c342 on codex/fluid-store-redesign. origin/main remains 722faee; open PR stack #1 foundation → #2 homepage → #3 compact store. No branch protection configured, but README requires PR integration; no merge requested.
- GitHub API reports has_pages=false. No publishing server exists, so choose separate loopback admin and validated local JSON export + Git/PR workflow. Do not place GitHub credentials in browser/public data.
- OO_PS4_TOOLCHAIN unset; only Apple clang and make found on PATH. Homebrew LLVM absent. Device address/launch path requested asynchronously.

### Milestone implementation findings
- UI follow-up passed 15 unit/4 browser tests and was pushed as bb7dfb5 on PR #3 before creating codex/catalog-admin-storage-poc.
- Separate local admin and static public manifest share strict Zod schemas; publication exports only validated snapshots, never drafts or owner workspace. No server-side publishing infrastructure exists, so Git/PR export is the documented production route.
- OpenOrbis v0.5.4 release archive was downloaded and inspected. Source-only clone lacks built libc; release sysroot plus non-Apple LLVM/lld successfully built ELF/eboot/test PKG. Host tools ran on Apple Silicon. Dependencies installed: LLVM/lld, z3, xz update; no shell profile/default compiler changes.
- OpenOrbis musl PS4 statvfs conversion is omitted; diagnostic uses declared libc fstatfs, validates arithmetic/results and reports candidate/unverified mount-scoped figures. Never infer PS4 disk capacity from browser quota.
- Owner supplied FTP and Internal Package Installer/file-manager launch path. FTP connected and accepted the diagnostic under its owned directory; matching size observed, read-back hash incomplete due timeouts. No install/launch performed; firmware 12.00 remains unverified. Private endpoint is intentionally absent from tracked configuration.

### Owner launch failure follow-up
Owner reports package 01.00 fails with “cannot continue using this application” on firmware 12.00/GoldHEN, no CE code. Found missing OpenOrbis sample modules and 4 KiB/overlapping ELF LOAD layout. Corrected 01.01 builds with package/ELF/source-receipt guards and six Python regression checks. PKG/extracted runtime hashes verified locally; corrected FTP transfer is blocked by connection timeout. Console root cause and corrected launch remain unverified.

# C++ migration continuation, 2026-10-26

- Direct request selects C++ over the attachment's JSX goal; retain its hardware-first audit and validation sequence. Owner admin remains web-only.
- Source audit pins Overdrive framework 264f78e6b92e5eed1415490b003944eb97ed4f8b and JVK3R continuation 65691ac70c814edd01b6f7174ad208748b503a17; no code/assets imported. See framework/voidplay-native/docs/architecture.md and NOTICE.
- Prior diagnostic was already native C. Owner reports CE-34878-0/no initial dialog, without installed hash or trace. Neither pre-main failure nor an API cause is established.
- LLVM/LLD 18.1.8 installed as versioned tools; default LLVM/shell unchanged. Eight critical SDK files match the hashed v0.5.4 archive. Mac uses Apple Clang 21 because LLVM-18 ASan spun before main on macOS 27.
- Native Mac test exercises a shared C++ surface and SDL window/input. It is a display test, not a migrated store or PS4 emulator. Existing catalog/admin/browser client remains intact.
- Final PS4 boot package at runtime commit 9db3eb2: SHA256 03be335c4aaffae155e3524b7bfdf6d44f74b3f722d2908e90ad048c71ddfe90, 6,619,136 bytes, VPLY00002 01.00. Cross-build/structural/extracted-content checks passed; hardware unverified.
- Owner deferred FTP/Klog activation. No replacement transfer/install/launch. Full store migration remains gated on console startup/presentation, not complete.

## Owner Pages catalog — 2026-10-26

- Owner selected a Mac backend instead of cloud hosting. GitHub Pages serves public assets/JSON and a login shell; a loopback server protects private authoring and publishing with password authentication. No static password gate is claimed.
- Real catalog starts empty. Optional genres and normalized YouTube trailers are shared metadata; one to three mirrors preserve independent provider/URL/size/hash/access requirements. No authorized real listing was supplied.
- Pages is now enabled on gh-pages and built successfully. Authenticated backend publication created empty real revision 1 in fa58612; asset redeploy 8e638b1 preserved its exact catalog blob c4b59dd37d2339ae140816f21e00fff83f0288cd.
- Chrome blocked HTTPS Pages to HTTP loopback API access in this session. The Pages login shell provides a direct local-studio link; localhost owner editing is the reliable development route. Mac must remain running.
- Regular source Actions are still blocked by account billing, independently of successful legacy Pages builds. Native C++ catalog/trailer/console integration is not established by this web milestone.


## Optional catalog/artwork and native crash follow-up

- Owner artwork URLs were HTML pages; the cover page has a valid Open Graph image, while the wallpaper page returned HTTP 403. Repairing those image fields and cover/hero fallback addresses the web symptom. Private backup and independent draft/snapshot preservation prevent unrelated edits from leaking.
- All descriptive metadata can be omitted; IDs/revisions remain structural. Supplied invalid URLs/dates/checksums still fail. Missing package size/hash never becomes verified install evidence.
- An old owner tab displayed revision 1 while disk workspace had revision 8. Focus refresh applies newer server revisions only while no unsaved edits exist. Restarting the owner backend revokes memory-only sessions.
- Klog/FTP are reachable now. A capture records VPLY00002 crash reporting and exception code 12; no trace identifies the failing instruction. The original probe's eight-second main return enters musl exit/_exit. Candidate 01.01 removes that return path; hardware outcome remains unknown because the owner cannot install it yet. Passive/active FTP read-back failed despite complete-size writes, so no partial file is marked ready.

## PS4 React master-prompt implementation

- New direction explicitly requires a real interpreted React/reconciler runtime and Hello World, replacing the C++-only client direction. Scoped to framework/ps4-react, based on clean f517ab6 and stacked PR #6; no earlier PR merged.
- Reference source/licenses audited: PS5 React/Overdrive flow is useful, but PS5 CRT/EGL/platform code is not imported. A new two-component mutation renderer is smaller than Embedded React's larger patched engine; React 18.3.1/reconciler 0.29.2 and QuickJS-ng 0.15.0 are pinned dependencies with notices.
- Native VideoOut/Pad/UserService are declared and linkable in the actual SDK. Native frame cross-build/PKG succeeded. The Mac SDL host executes the real React bundle and renders Hello World with a state counter; native integration tests confirm pixel changes/reset and bounded error handling under ASan/UBSan.
- Corrected target C++ header leakage from the Mac SDK; avoided unrelated STL nanosleep dependency. Added target-only malloc_np.h compatibility using the allocator declaration actually provided by OpenOrbis musl. SDK GP4 generator omitted new notice directories, so the build derives its root directory tree from packaged file paths.
- Native PS4 executable links QuickJS/React bundle and packages without any proprietary PRX/SPRX module. Console acceptance remains distinct from local package validity.
- Repeated Mac app-bundle overwrites triggered a real kernel code-signature load failure before startup. Atomic inode replacement and local ad-hoc bundle signing/verification fixed the repeated-build smoke path; this is separate from the unknown PS4 crash.
- Physical RCTX00001 01.00 failure is now identified: Klog reports 0xa0020102 / PRX_SCE_MODULE_LOAD_ERROR, explicitly missing application `.prx` files before main. OpenOrbis's GPL source modules are small bootstrap shims, not proprietary Sony runtime copies; compile them and include both libc.prx and libSceFios2.prx. The 01.01 package guards now reject the omitted-module layout. Actual launch remains a new acceptance test.

## Native Voidplay shell

- Owner-reported 01.01 console success establishes a working baseline after the missing-PRX correction. The larger 01.02 UI uses that startup path and requires its own hardware run.
- The native renderer can show local RGB565 artwork and a baked Manrope ASCII atlas without a browser, font runtime, proprietary PRX or new graphics dependency. Asset preparation is offline; original source/attribution and OFL notice are tracked.
- Shared public snapshot r9 feeds every native catalog view. No private authoring workspace or duplicate component-level catalog is bundled. Session collections and metadata do not imply installed packages or verified compatibility.
- Native directions use SDK left-stick fields and the same bounded D-pad/analog repeat filter exercised under sanitizers. Absolute layout is independent of flow siblings, and Discover pagination keeps its second page above the footer.

## Native web experience 01.03

- Owner reports 01.02 runs well. Public web audit confirms real entries already disable console transfer and the only web queue implementation is a simulation; do not fabricate native downloads or installation.
- Native port adds web-style compact header/utility icons, rounded/translucent surfaces, hero/shelves, filter/sort/clear/search, full detail metadata/source/gallery/trailer/related sections and persistent collections/preferences. Admin remains separate.
- Native preferences use only a fixed owned file with a 64 KiB limit, temporary write/flush/fsync/rename and visible failure/session fallback. OpenOrbis exposes fileno only behind its POSIX feature macro; declaring that feature resolves the cross-build error.
- Build-time public catalog sync uses shared validation and checked/pinned public DNS for bounded image requests. Console HTTP/video/transfers/install/storage-capacity integrations remain unavailable and labeled. No owner data or live publication was changed.

## 01.04 quality diagnosis

- The catalog image is only 284x351. Enlarging it to full HD introduced unavoidable blur; the correction contains it at source size rather than claiming upscaling is genuine HD. Native assets now retain ARGB8888 and report source/output decisions.
- Actual UI font sizes avoid per-draw glyph resampling. Retained command comparison/damage clips and a bounded resize cache remove repeated full-frame scaling. Native tween/crossfade replaces JS shade steps; release O3 and remaining-frame pacing lower active-frame cost.
- Final 120-action Mac CPU mean is 1.421 ms versus 6.151 ms baseline, with p95 2.704 versus 8.373 ms; startup is slower at 38.263 versus 21.402 ms. No console FPS is inferred. Physical PS4 quality/performance remains a separate acceptance gate.

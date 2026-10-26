# Cinematic homepage redesign

## Goal
Implement the user's cinematic home/store specification on the existing desktop app. No console compatibility claims.

## Audit
- Clean feature/store-foundation at df34c23; origin matches intended repository.
- Fetched origin: main remains baseline 722faee, foundation PR #1 unmerged.
- Created feature/homepage-cinematic-redesign from existing app; use stacked PR against feature/store-foundation.
- Baseline npm run check passed: lint, strict types, six tests, production build.
- Existing state routing in App.tsx; Zod JSON loader; independent spatial navigation; native detail dialog. No router/backend change needed.
- No reference screenshot attachments available in this conversation; follow written brief without claiming exact comparison.

## Design
Approved by explicit implementation specification. ENERGY 2 / RHYTHM 2 / MOTION 1.
Near-black, white/muted type, amber focus; self-hosted Manrope. Original locally stored SVG concept illustrations, labeled mock. Full-bleed 52vh hero, left/lower copy, dual real actions; horizontal curated poster shelves. Browse remains a filterable/sortable poster grid. No fake statistics or controller hints.

## Phases
### Phase 1: Presentation and assets
**Status:** complete
- Self-host font/license, original concept artwork and validated optional art URLs.
- Shared poster and artwork fallback; compact navigation, cinematic hero, shelves, distinct Browse.

### Phase 2: Interaction and verification
**Status:** complete
- Scope horizontal arrows to shelves; maintain focus and scroll after details.
- Tests for schema/sorting, shelves, fallback, loading/empty/error/offline, keyboard and mobile.
- Inspect actual 1080p/mobile screenshots; run accessibility and quality checks.

### Phase 3: Publication
**Status:** complete
- Update docs, review diff, commit/push branch, open stacked PR; verify remote head.

## Next Step
Review stacked PR #2 (feature/store-foundation base). Merge foundation PR #1 before retargeting redesign to main. No merge performed.

## Errors
Browser regressions found Escape/back and Search focus failures; corrected document-level back handling and already-mounted Search focus, then full dev/production E2E passed. Axe found prohibited aria-label on generic div; added group role. Caption contrast ambiguity resolved with opaque background. Browser bridge remains disconnected; local agent-browser/Chrome used.

## V2 redesign continuation

Implementation, visual inspection, production check and three E2E scenarios complete. See docs/superpowers/plans/2026-10-25-fluid-store-redesign.md for the V2 checklist. Implementation commit 9a88442 was pushed and verified on origin/codex/fluid-store-redesign. PR #3 targets feature/homepage-cinematic-redesign; final documentation handoff follows.

## Compact beta correction

User-supplied references and dummy transfer clarification implemented. Transparent/sticky header, compact layout, filled-heart favorites and connected demo queue are verified. See docs/superpowers/plans/2026-10-25-compact-store.md. Implemented in 4094fef, pushed and verified against origin; PR #3 title/body updated to the final compact layout and demo download scope.

## Admin catalog and PS4 diagnostic continuation

Current milestone plan: docs/superpowers/plans/2026-10-25-admin-storage.md.
UI follow-up pushed on existing PR #3 (bb7dfb5), then separate codex/catalog-admin-storage-poc branch.
Owner admin/publication and platform interfaces implemented and locally verified. Native diagnostic
cross-built and packaged; console-side integrity/launch/storage/controller/HTTPS/file-I/O evidence
remains unavailable. FTP and the owner's Internal Package Installer/file-manager path are recorded
as transport/setup facts only. No console compatibility claim or automatic installation.

Remote handoff: PR #4 opened/attached against PR #3; implementation commits 40a70f7 and da882b0 pushed with matching remote SHA. GitHub CI did not start because of an account billing lock. Local checks pass; console runtime and full FTP read-back hash remain unverified.

## C++ runtime migration, 2026-10-26

User now supplied a CE-34878-0 screenshot and requests native C++ with separate Mac testing.
Current plan: `docs/superpowers/plans/2026-10-26-cpp-runtime.md`.
Clean branch `codex/cpp-runtime-foundation` starts at db6e545, stacked on PR #4.
Direct C++ choice takes precedence over the attached brief's JSX goal; retain its hardware-first gates.
Do not port the full store before isolating native startup and validating PS4 presentation.

## Owner Pages catalog, 2026-10-26

User redirected focus to a real owner-edited catalog and password login. They selected a Mac backend because no cloud account exists. Current branch codex/pages-owner-catalog, based on d368c6a / PR #5. See docs/superpowers/plans/2026-10-26-pages-owner-catalog.md. The Mac backend protects private workspace/actions; Pages hosts public metadata and the login shell. Native console testing remains deferred.

## Catalog permissive metadata, artwork recovery and C++ crash follow-up (2026-10-26)

User explicitly requests immediate repairs. Preserve owner workspace (currently revision 8), make all descriptive metadata optional with honest empty states, diagnose artwork page links and resolve usable image URLs with bounded authenticated fetching. Keep ID/revision/URL validity and installation gates. Existing source branch/PR #6 is clean; continue there. Investigate C++ Boot Test using live Klog and the exact native artifact, then build/verify a correction supported by evidence. Never claim console launch fixed until tested.

- [x] Optional metadata and resilient store rendering, preview/artwork diagnostics and regression coverage.
- [x] Native crash evidence and targeted candidate build/verification; owner cannot install 01.01 yet, so hardware acceptance remains pending.
- [x] Preserve private data, run checks/browser tests, push source and redeploy Pages preserving live catalog.

## PS4 React Hello World — master prompt, 2026-10-26

User selects a real embedded React runtime with a visible PS4 Hello World, replacing the preceding C++-only direction. Implement in framework/ps4-react on codex/ps4-react-hello-world, stacked on existing PR #6. Keep owner backend/data and live Pages intact. Use skills for planning, code quality and evidence-based verification; implementation is explicitly authorized by the master prompt.

Architecture: pinned React 18/reconciler + QuickJS-ng interpreter; a small mutation renderer emits bounded rectangles/text into a shared CPU framebuffer. SDL2 hosts the Mac preview; verified OpenOrbis VideoOut/Pad/UserService declarations drive the PS4 target. No PS5 native source, proprietary modules, browser/DOM runtime, store migration, download/install adapter or invented hardware success.

1. Audit source/licenses/toolchain, pin dependencies and write compatibility/implementation notes.
2. Build native visible frame and complete PS4 presenter/package workflow; validate locally before embedding JS.
3. Embed bounded QuickJS, bundle real JSX/React/reconciler and connect the renderer. Test lifecycle/errors/updates.
4. Exercise the same UI in native Mac preview and cross-build PS4 PKG; verify metadata/extracted bytes/notices.
5. Document limitations/hardware procedure, commit and push coherent work, provide exact package/hash and native screenshot. Hardware acceptance remains separate until installed/launched on the actual console.

Highest risks: existing untraced CE-34878-0, OpenOrbis startup/exit, VideoOut buffer lifetime, JS libc dependencies, malformed native bridge input and package provenance. The user has been unable to install the previous candidate; all locally verifiable work should still be completed.

Local implementation and validation completed through Mac native interaction,
sanitizers, cross-build/package inspection and reproducible command documentation.
Source publication/final clean-source receipt are the remaining handoff steps.
Physical PS4 installation, display, input and lifecycle acceptance remain pending;
the new Hello World package has no console result yet.

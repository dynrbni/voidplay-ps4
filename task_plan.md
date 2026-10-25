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

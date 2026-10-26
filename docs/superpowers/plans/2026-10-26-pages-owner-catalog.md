# Password-protected owner catalog and GitHub Pages

**Goal:** Let the owner author real catalog metadata, preview trailers and publish a public catalog the application loads, while keeping passwords and publishing credentials out of static assets.

**Architecture:** GitHub Pages serves the public store/catalog and the admin application shell. Private workspace and mutations require a password-authenticated backend. The owner selected a loopback Mac backend; public assets contain no password or publishing credential. Never claim static JavaScript password checks enforce authorization.

**Baseline:** clean d368c6a; PRs #1–#5 remain stacked/unmerged. Work branch codex/pages-owner-catalog. Pages API returns 404 (not enabled); Actions last failed before starting due to billing. Do not merge old PRs to publish development artifacts.

## Steps

- [x] Extend shared metadata/drafts with genres and validated optional YouTube trailer URLs, preserving existing snapshots/backups.
- [x] Add owner form fields, store genre/search metadata and a click-to-load trailer with safe embed URL and external fallback.
- [x] Implement server-side password authentication, bounded sessions/rate limits, revision-safe private workspace and publication; password remains local/server secret only.
- [x] Build a Pages output containing public catalog/store and admin shell, excluding server code, secrets, workspace and test fixtures. Start the public catalog in real/empty mode.
- [x] Publish the development site/catalog through a separate deployment branch, within available GitHub permissions. Report exact blockers if Pages deployment or cloud auth is unavailable.
- [x] Exercise login failures/session/logout, real entry editing with 1–3 mirrors, save/publish/unpublish, trailer validation/embed and public catalog loading. Verify no secrets in Git or generated assets.
- [x] Document the actual owner workflow and hosting limits, commit Conventional Commits, push and attach a stacked PR.

The owner has not supplied metadata or redistribution permission for a real game. Do not invent an executable listing. Tests use isolated metadata fixtures and never publish those fixtures to the live catalog.

## Result

Published store, admin shell and real-mode catalog return HTTP 200. Authenticated
Mac publication created revision 1 (empty); an asset redeploy preserved its exact
catalog blob. Source PR #6 remains stacked on #5. See docs/verification.md for
commit hashes, browser evidence and the account billing block on Actions.

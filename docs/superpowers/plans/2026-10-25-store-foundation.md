# Store foundation implementation plan

> Execute inline with executing-plans; no subagents needed.

**Goal:** Deliver the approved desktop home/catalog slice.
**Architecture:** Validated local JSON loader and pure filtering independent of React views. Spatial keyboard navigation lives outside cards. No console adapter is fabricated.
**Stack:** React, TypeScript, Vite, ESLint; Node built-in tests.
**Spec:** `docs/design.md`.

## Constraints

Desktop preview is not PS4 verification. All fixtures visibly mock. No invented downloads, compatibility, progress, artwork, or installation. No secrets or paid services. Preserve user files.

## Tasks

- [ ] Commit/push audited baseline on initial main, then fetch and branch `feature/store-foundation`.
- [ ] Add package scripts, strict TypeScript, Vite, ESLint and lockfile. Use `npm run check` for lint, typecheck, tests and build.
- [ ] Write `src/catalog.test.ts` for malformed/duplicate entries and search/category intersection. Run `node --test src/catalog.test.ts` before implementing `parseCatalog(value: unknown): CatalogEntry[]` and `filterCatalog(entries: CatalogEntry[], query: string, category: string): CatalogEntry[]` in `src/catalog.ts`.
- [ ] Add labeled JSON fixtures and an abortable fetch loader. Empty arrays are valid; invalid responses and HTTP failures show retry.
- [ ] Implement React home, browse, search, category filters, detail dialog and source/capability notice. Native controls only; no dead navigation.
- [ ] Implement pure spatial candidate selection and document-level arrow handling outside text/select controls. Test direction boundaries and closest candidates.
- [ ] Verify 1920x1080 and mobile rendering, all controls, dialog focus restoration, loading, empty, malformed/network failure and offline states. Capture screenshot outside tracked source.
- [ ] Update onboarding and capability docs with actual results, run `npm run check`, review diff, commit/push feature, open PR. Merge only if policy permits and checks pass, then verify integrated main.

## Verification commands

`npm ci`, `npm run check`, `npm run dev -- --host 127.0.0.1`, `git diff --check`, `git diff --cached`, `git push -u origin feature/store-foundation`.

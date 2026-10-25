# Admin catalog and PS4 storage milestone

Architecture: keep owner-only local React/TypeScript admin as a separate Vite entry/build, shared validated catalog/workspace schemas, and public static manifest consumed by the store. No credential-bearing browser publisher. Export public snapshots and use a validated Git/PR publishing workflow; Pages deployment stays opt-in until repository setup/integration. Storage/network/download/install expose explicit interfaces, with desktop storage clearly mock and installation unsupported.

- [x] Fix shelf focus clipping, improve restrained/reduced-motion-aware transitions and add a translucent scrolled-header surface; verify and push to existing PR #3.
- [x] Create codex/catalog-admin-storage-poc stacked on the corrected UI branch; preserve main and existing PR stack.
- [x] Implement draft/published/unpublished lifecycle, unique IDs, revision/snapshot checks and publication requirements including authorization, source URLs/auth descriptions and SHA-256.
- [x] Build independent owner admin with complete form, validation, store-style preview, local workspace persistence, backup/import and public JSON export.
- [x] Connect public manifest to Discover/Browse/Search/details without component data duplication; preserve explicitly separate concept-preview mode and demo downloads.
- [x] Add static-host/subpath support, publication validator/atomic local import and documented Git-based Pages workflow with no admin bundle or secrets in store output.
- [x] Implement explicit platform interfaces, labeled desktop storage mock and installation/cleanup guards.
- [x] Inspect pinned/current upstream OpenOrbis headers/examples, create minimal native diagnostic plus host-test harness/build preflight and record toolchain/device limitations honestly.
- [x] Run independent unit, admin/store production builds, browser flows, rendered QA, schema/public-artifact checks and available native checks.
- [x] Commit coherent increments, push branch, open/attach stacked PR and verify remote hashes.

Device execution requires the owner's PS4 connection/launch path and physical observations. No firmware 12.00 capability is considered verified by a host test or a successful cross-build.

Remote: PR #4 stacks on #3; catalog commit 40a70f7, native commit da882b0, both pushed and remote SHA verified. GitHub Actions jobs did not start: account locked due to billing. Local checks passed; no remote CI pass or PS4 runtime success is claimed.

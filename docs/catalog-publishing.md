> The current owner workflow uses a password-protected Mac backend and Pages publication.
> Start with [Owner catalog: GitHub Pages + this Mac](owner-pages.md).
> The export/import contract below remains supported for manual Git review.

# Owner catalog workflow

The owner dashboard is a separate local React/TypeScript application. Run `npm run admin:dev`
(loopback port 5185), or `npm run admin:build` and `npm run admin:preview` (4185).
The public store uses `npm run dev` and a separate `dist/` build. `admin-dist/` is never
included in the Pages artifact. Do not upload the dashboard or workspace backups to Pages.
There is no online authentication server or direct publishing endpoint in this repository.
A fake browser password would not make a public admin dashboard owner-only.

## Editing and snapshots

Create a unique lowercase/hyphenated ID; IDs are immutable after creation. Save drafts freely,
validate, and preview before staging a published snapshot. Each mutation increments the
workspace revision and that record's revision. Saving edits to a published entry preserves
its previous public snapshot. Staging publication replaces that snapshot only after all
publication rules pass. Unpublish retains the private history/snapshot but removes the entry
from the next public export, including when it is the last entry.

Publication requires title, both descriptions, category/developer, version/date, cover/hero,
interface languages (audio/subtitle lists may be empty), positive integral bytes, format,
compatibility notes, changelog, license and an explicit redistribution authorization statement.
Screenshots are optional, up to twelve, with captions. Verified compatibility requires actual
firmware values and recorded test evidence. A checkbox or successful build is not evidence.

Every entry needs 1–3 independently configured sources: source ID, provider,
public HTTPS URL, expected bytes for that source, 64-character SHA-256, and access
requirements. Required authentication needs explanatory instructions. Never paste tokens,
passwords or signed/private URLs. Schemas reject unknown fields, URL credentials, unsafe
schemes, local hosts, common secret query parameters, duplicate IDs and inconsistent revisions.
This validates metadata; it does not independently prove permission, test the package, fetch
and verify its checksum, or certify firmware compatibility. The owner must establish those facts.

`voidplay.owner-workspace.v1` lives in this browser's localStorage, without account sync.
Export a workspace backup before changing browsers or clearing data. Backups can include
unfinished metadata; keep them private. Imports are validated, reviewed before replacement,
and reject older or conflicting revisions. Cross-tab changes block stale writes rather than
silently overwriting. Broken stored data is not replaced until a recovery copy is exported.
Unsaved changes block switching entries and public export.

## Publish through Git

The trade-off: exporting is safe without a server or GitHub browser token, but an export does
not change the live site. A developer reviews, commits, merges and deploys it. GitHub credentials
stay in the developer's Git/CLI credential store or GitHub Actions' scoped OIDC environment.

1. Save, validate and stage each intended publication/unpublication in the dashboard.
2. Export **workspace backup** privately and **public catalog** for Git.
3. Update from the correct reviewed base. This repository currently has a stacked PR policy;
   do not skip or auto-merge dependencies.
4. Put artwork you own or may redistribute in `public/art/` (lowercase hyphenated filenames),
   or use durable public HTTPS image URLs. The admin preview resolves existing local artwork
   from the repository. New files appear after restarting/rebuilding the admin.
5. Inspect the current revision in `public/catalog.json`, then run:

   ```sh
   npm run catalog:validate -- /absolute/path/catalog-rN.json
   npm run catalog:import -- /absolute/path/catalog-rN.json --expected-revision 0
   npm run check
   npm run verify:public
   git diff -- public/catalog.json public/art
   ```

   Replace `0` with the real base revision. The importer locks the destination, rejects
   stale/non-increasing revisions and preview exports, validates before writing, fsyncs a
   sibling temporary file and renames it atomically. Failures preserve the original catalog.
   If a process dies leaving `public/catalog.json.lock`, inspect the process and Git diff before
   removing the stale lock. Keep one owner workspace as the revision authority; do not create
   separate divergent workspaces to publish to the same catalog.
6. Commit using Conventional Commits, push a feature branch and open a PR. Review the metadata,
   permission evidence, package hash and artwork. Merge through the existing dependency stack.
7. Once this milestone is on `main`, enable repository **Settings → Pages → Source: GitHub Actions**.
   Run **Publish reviewed store to Pages** manually on `main`. It validates and uploads only
   `dist/`, uses the `github-pages` environment and minimal deploy permissions. This work does
   not enable Pages, merge PRs or deploy the site automatically.

The public manifest is `public/catalog.json`, with schema version, monotonically increasing
revision, timestamp and published entries only. `previewMode: true` explicitly enables the
fictional fixture and requires zero published entries. Every admin export sets preview mode
false: an empty publication stays empty instead of resurfacing demo entries. Invalid manifests
fail visibly. The same validated manifest supplies Discover, Browse, Search and hash detail
routes. Components contain no duplicate catalog records.

Store assets and fetches use the Vite base so the public build works under `/voidplay-ps4/` on
Pages. Hash routes avoid server route configuration. The live transfer/installation adapters
are unavailable; published entries show source metadata and an explicit unavailable console
transfer action. Only fictional preview entries use the separately labeled demo queue.

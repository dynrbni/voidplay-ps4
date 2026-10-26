# Catalog contract and publication

Start with [Owner catalog: GitHub Pages + this Mac](owner-pages.md) for login,
editing and deployment instructions. The owner studio is a separate React/TypeScript
build. A loopback Mac backend authenticates private workspace access and commits
validated catalog snapshots to the `gh-pages` deployment branch. GitHub Pages
serves the public store, catalog and login shell; it cannot authenticate private
writes by itself.

## Editing and snapshots

Create a unique lowercase/hyphenated ID; IDs are immutable after creation. Save
drafts, validate and preview before staging a published snapshot. Each mutation
increments workspace and record revisions. Saving a published entry's draft
preserves its public snapshot. Staging replaces that snapshot only after all
publication rules pass. Unpublish retains the private history but removes the
entry from the next public export, including when it is the last entry.

Only the permanent entry ID is required for a listing. Titles fall back to that ID;
all descriptions, artwork, genre, developer/version/date, languages, file metadata,
compatibility notes, changelog, license and permission statements can be omitted.
Zero to three sources are accepted. A configured source needs a valid URL; omitted
provider, size, checksum and access instructions do not prevent listing. Blank
source/screenshot rows are excluded from published snapshots. Missing size and
checksum remain unknown, not verified. Installation and cleanup still require
separate authorization, compatibility, integrity and verified storage evidence.

Provided values remain bounded and validated: invalid URLs/dates/checksums,
credential-bearing links, duplicate IDs and unsupported claims of verified firmware
compatibility fail. Existing complete snapshots/backups remain readable. Artwork
checks can resolve Open Graph/Twitter image metadata through the authenticated Mac
backend, with public-address DNS pinning, redirect/body/time limits and no image
proxy or upload. A host that blocks access needs a direct image URL or another host.
Cover and hero fall back to each other when absent or unavailable.

The workspace lives in `.owner-data/workspace.json` on this Mac, outside Git and
static output. Sessions remain only in memory. Export private workspace backups
before moving Macs; browser storage does not contain drafts or credentials.
Imports are validated and reviewed before replacement, and reject older or
conflicting revisions. Server locks and expected revisions prevent stale writes.
Unsaved changes block switching entries and public publication.

## Public catalog and Git review

**Publish to Pages** exports only staged snapshots and uses the authenticated Mac
`gh` CLI. It checks the live catalog revision and blob SHA before committing
`gh-pages/catalog.json`. GitHub credentials remain in the Mac's credential store.
**Check deployment** checks whether the public JSON has reached that revision.
Asset redeploys preserve the existing live catalog; updating the source branch's
`public/catalog.json` does not replace published owner metadata.

The source catalog and CLI remain useful for offline review or another deployment:

```sh
npm run catalog:validate -- /absolute/path/catalog-rN.json
npm run catalog:import -- /absolute/path/catalog-rN.json --expected-revision 0
npm run check
npm run verify:public
```

Replace `0` with the actual local source revision. Import uses an exclusive lock,
validates before writing and atomically renames a sibling temporary file. Failures
preserve the original catalog. Inspect any leftover lock before removing it.
These commands update the local source catalog only. Publish this Mac's workspace
through the owner studio to update the current live site. Use one workspace as
the revision authority; avoid divergent workspaces publishing to the same catalog.
Source changes still follow the existing stacked PR policy. The obsolete manual
Actions Pages workflow has been removed; Pages serves the `gh-pages` branch.

The manifest carries schema version, monotonically increasing revision, timestamp
and published entries only. Every owner export sets `previewMode: false`; an empty
publication stays empty. Fictional fixtures are available only in explicit test
preview mode and are omitted from Pages output. One validated manifest supplies
Discover, Browse, Search and direct hash detail routes, without component copies.

Public assets resolve under `/voidplay-ps4/`. HTTPS artwork URLs must be durable;
local `/art/` paths must exist in the deployed assets. Web trailers load only on
request and depend on YouTube/uploader availability. The native C++ runtime does
not yet consume this catalog or play trailers. Real console transfer/install
adapters remain unavailable; source links are exposed as metadata, and downloads
never trigger automatic installation or cleanup.

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

Publication requires title, both descriptions, category/developer, version/date,
cover/hero, interface languages, positive integral bytes, format, compatibility
notes, changelog, license and an explicit redistribution authorization statement.
Audio/subtitle lists may be empty. Genres and a validated YouTube trailer are
supported; screenshots are optional, up to twelve, with captions. Verified
compatibility requires actual firmware values and recorded test evidence.

Every entry needs 1–3 independently configured sources: source ID, provider,
public HTTPS URL, expected bytes for that source, 64-character SHA-256 and access
requirements. Required authentication needs explanatory instructions. Never paste
passwords, tokens or signed/private URLs. Schemas reject unknown fields, URL
credentials, unsafe schemes, local hosts, common secret query parameters,
duplicate IDs and inconsistent revisions. Validation does not independently
establish redistribution permission, package integrity or firmware compatibility.

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

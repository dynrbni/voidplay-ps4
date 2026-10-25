# Voidplay

An independent PS4 homebrew store project, currently a React/TypeScript desktop preview.
Only content authorized for redistribution is in scope.

The beta store has a compact cinematic Discover page, a transparent sticky header with a BETA
badge, focus-driven featured artwork, square and landscape shelves, a searchable Browse grid, and a dedicated
hash-addressable detail page for every entry. Search, Favorites, Library, Downloads and
Settings/About share one monochrome design system and self-hosted Manrope typography.
Header links are Discover, Browse, Downloads and Library, followed by Favorites, Search and Settings icons.

![Voidplay Discover desktop preview with original concept artwork](docs/images/store-preview.png)

All six listings are explicitly fictional concepts. Original generated artwork is stored locally;
no executable files, download URLs, fabricated ratings or compatibility claims are included.
Downloads provides an explicitly labeled dummy transfer flow. **This is not a PS4 release.** Console rendering,
controller input, network/storage behavior and installation remain unverified.
See [capability status](docs/ps4-status.md), [design](docs/design-v2.md),
[artwork provenance and prompts](docs/artwork.md) and [verification](docs/verification.md).

## Development

Requires Node >=22.18 and npm. Verified locally with Node 26.7.0.

```sh
npm ci
npm run dev
npm run check       # lint, strict TypeScript, 15 pure-logic tests, production build
npm run preview     # serve the static production build
```

Vite binds to loopback by default and reports its selected port. The `dist/` output is a
web preview, not a console package. No runtime credentials or external font/art service is needed.

Browser regression tests use `agent-browser` with a local Chrome installation:

```sh
npm run test:e2e
```

Keep the dev server running. Set `VOIDPLAY_URL` for a different port or production preview,
`AGENT_BROWSER_BIN` if the binary is outside PATH, and `AGENT_BROWSER_EXECUTABLE_PATH`
if Chrome needs an explicit location. The four test scenarios use isolated browser sessions;
request interception and synthetic screenshot metadata exist only inside the tests.
Screenshots and audit reports are written under ignored `artifacts/`.

## Navigation and local collections

Tab and arrow keys navigate, Enter selects, and Escape goes back. Horizontal arrows stay
inside a shelf; shelf buttons and touch scrolling are also available. Browser Back and the
detail Back button restore prior focus and scrolling where that view still exists. Direct
links such as `/#/item/orbit-workshop` work on static hosting. Reduced motion respects the
system preference and the optional browser-local setting.

Favorites and tracked Library entries are separate arrays of catalog IDs in the versioned
`voidplay.collections.v1` localStorage record. No account or cross-device sync is implemented.
Clearing site data removes them. Invalid or unavailable storage produces visible feedback;
write failures retain session changes. Library tracking does not mean downloaded or installed.
Loaded catalog entries remain usable offline, but this is not an installable offline app:
there is no service worker or persistent catalog cache.

## Dummy downloads

As requested for the beta, Download to PS4 currently starts a **demo simulation** and opens
Downloads. It does not fetch a package, measure internet bandwidth, send bytes to a PS4,
write a file or install anything. The manager labels progress, sizes, speed and ETA as demo
values and supports queueing, pause/resume, cancel, retry and clearing finished demos.
One demo runs at a time and continues across store pages. Completed demos do not become
installed applications or automatically enter Library.

The bounded `voidplay.demo-transfers.v1` browser record persists demo state separately from
catalog and collections. Pending/active entries restore paused after reload; the simulator
never claims to transfer in a closed tab. Storage failures retain session state and show a
message. The dummy queue is intended for one active app tab; concurrent-tab coordination,
a real package source/admin contract and a PS4 receiver are deferred.

## Boundaries

- `src/catalog.ts`: strict Zod catalog validation, fetch loader, filtering and sorting.
- `public/catalog.mock.json`: six fictional development listings.
- `src/App.tsx`: catalog lifecycle and page composition.
- `src/useStoreNavigation.ts`, `src/routes.ts`: hash routes, history, back and focus restoration.
- `src/navigation.ts`: directional desktop keyboard navigation.
- `src/collections.ts`, `src/useCollections.ts`: validated local collections and storage feedback.
- `src/demoTransfers.ts`, `src/useDemoTransfers.ts`, `src/Downloads.tsx`: separate dummy queue/state machine and manager.
- `src/FavoriteButton.tsx`: shared, accessible filled-heart favorite control.
- `src/FeaturedHero.tsx`, `src/ContentShelf.tsx`, `src/ContentPoster.tsx`: artwork presentation.
- `src/Details.tsx`, `src/ScreenshotGallery.tsx`: selected-item details and optional gallery.
- `src/CatalogView.tsx`, `src/CollectionView.tsx`, `src/SecondaryPages.tsx`: store screens.
- `src/main.tsx`: startup and render-error recovery.
- `public/art/`, `public/fonts/`: local concept artwork and licensed font.

The catalog accepts bounded, unique lowercase/hyphenated IDs, title, description, category
(`Utilities`, `Games`, `Media`), `mock: true` and compatibility notes. Optional summary,
cover/hero artwork, author, version, license, release notes and screenshot descriptions are
validated. Artwork paths must be local `/art/name.svg|webp|png|jpg`; remote and traversal paths
are rejected. Unknown metadata, live listings and download sources are rejected. Fields without
data are omitted. Current fixtures have no release metadata or genuine screenshots, so their
pages do not show those sections. A live package catalog still needs a separate validated
contract for redistribution authorization, URLs, file sizes, versions and SHA-256 verification.

## Git workflow and licensing

Use stable `main` and short-lived feature branches. Check, review, commit with Conventional
Commits, push to `https://github.com/dynrbni/voidplay-ps4.git`, then open a PR. The V2 branch
stacks on the earlier homepage branch while PRs #1 and #2 remain unmerged.

No Overdrive/Netflix source or assets were copied. Dependency/font notices are documented in
[dependencies](docs/dependencies.md). No project-wide distribution license has been selected.
Actual PS4 execution must be proven before choosing a console renderer or exposing installation.

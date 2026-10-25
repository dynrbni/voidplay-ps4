# Compact Voidplay beta store

The supplied homepage and detail screenshots now guide the actual composition. Their artwork,
branding, proprietary application data and PS5-specific capabilities are not copied. The user's
later clarification explicitly requests dummy transfers until an admin catalog/source exists.

## Header and compact scale

The header is sticky at top:0 with an actually transparent background, including after scrolling.
It overlaps the artwork without reserving a colored bar. The desktop height is 76px (68px on
smaller desktops); narrow screens use two compact rows. A small solid-white BETA badge sits
beside the Voidplay wordmark. Main labels are Discover, Browse, Downloads and Library; the
right-hand icons are Favorites, Search and Settings. Text shadow and local control surfaces
help the header remain readable without an opaque full-width background.

Manrope remains self-hosted. Central tokens reduce display titles to at most 56px, body text
to 15px, navigation to 15px, shelf headings to 19–23px and item titles to 16px. Primary actions
are compact white capsules; favorite/actions use circles; cover corners use 7px radii.
The palette remains black/white/grayscale. Existing original concept artwork supplies color.

## Discover and details

Discover puts its copy high-left and brings the first shelf into the initial viewport. Square
covers replace tall posters on this shelf; the whole row is visible vertically at 1920×1080.
Focusing/hovering a first-shelf item updates the hero and the selected white cover outline;
there is no autoplay. Utility/media shelves retain a wider landscape format. Browse uses six
compact columns on large screens and reduces columns responsively.

Details use an uninterrupted full-viewport backdrop, high-left title/summary/description and
lower-left Download to PS4, favorite and information actions. The information control scrolls
to the real About section, where separate Library tracking remains available. Available
metadata, optional genuine screenshots and related entries remain data-driven. Unknown release
metadata and genuine screenshots are still omitted from current fictional fixtures.

A shared FavoriteButton appears beside each listing, in the hero and on detail pages. A saved
heart fills solid white. Header Favorites opens the persisted collection; inline removal works
there too. No nested button markup or hover-only action is introduced. Keyboard arrows move
between shelf cards and between corresponding favorite controls; Tab reaches both.

## Demo download boundary

Download to PS4 opens the same queue shown by header Downloads. Explicit DEMO labeling explains
that size/progress/speed/ETA are simulated and no file is fetched, sent or installed. Each entry
has at most one queue record; one simulator advances at a time. Pause/resume/cancel/retry and
clear-finished controls work. State persists independently from Favorites/Library and restores
unfinished entries paused. Completion does not imply an installed app or alter Library.

`demoTransfers.ts` owns the bounded schema, pure transitions and formatting; `useDemoTransfers.ts`
owns timers and browser persistence; Downloads presents those values. No live download URL is
added to the mock catalog, no PS4/PS5 API is assumed, and there is no fabricated executable file.
A future live adapter requires an admin/source contract and verified PS4 receiver independently.

## Navigation and resilience

Hash routes, browser/Escape back, mounted store views, scroll restoration and result focus are
preserved. Focus falls back to the page group if inline removal deletes the active element.
System/local reduced-motion settings remain supported. Loading/error/empty/offline/missing-art
and corrupted/unavailable storage states are tested. Final rendered screenshots and actual
verification results are recorded in verification.md.

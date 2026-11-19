# Native web experience 01.03

The owner has tested 01.02 successfully. Keep its startup, GPL bootstrap modules,
VideoOut buffers and controller path. Extend the shared native renderer rather
than embedding a browser or treating CSS as C++. All catalog entries stay in JSON.

Visual direction: reproduce the public web store's black/white Manrope identity,
artwork hero and compact header, with a white focus ring and filled favorite
heart. ENERGY 2 / RHYTHM 2 / MOTION 1. Fixed 1080p controller pages replace browser
scrolling so all controls remain visible above the footer. Header gets a dark
translucent surface on secondary pages, matching the web's scrolled state.

| Web view | Native implementation |
| --- | --- |
| Header | Four text routes, favorite/search/settings icons, beta wordmark |
| Discover | Selected artwork hero, primary/favorite actions, category shelves |
| Browse/Search | Title/genre search, category tabs, sort/clear, controller keyboard |
| Detail hero | Artwork, title, metadata, download status, heart and about action |
| Detail body | About, release notes, full metadata, source info, screenshots, trailer metadata, related listings |
| Favorites/Library | Separate persisted collections and actionable empty states |
| Downloads | Honest real-transfer unavailable state; explicitly opt-in test queue with pause/resume/cancel/retry/clear |
| Settings | Working reduce motion preference, catalog snapshot, storage unavailable, controls, about |

A bounded native bridge reads/writes only one owned preferences file. Invalid
JSON or failed persistence must preserve usable session state and show an error.
Downloaded-game files and installation are not exposed. Package source links and
YouTube metadata are displayed; no browser opening, video or HTTP adapter is
invented. Updating the offline published snapshot remains an explicit build step.
The owner admin is not part of a public console store and remains on Mac/web.

Validate pure routing/filter/collection/queue behavior, native image/rounded-alpha
clipping and preferences round trips/errors under sanitizers. Exercise actual Mac
screens via native UI, build/inspect the final PS4 package and push the existing
stacked PR. Owner testing of 01.03 is a separate acceptance result.

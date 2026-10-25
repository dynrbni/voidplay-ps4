# Compact console store correction

User-approved direction: follow the supplied homepage/detail screenshots, retain original concept artwork and monochrome UI, use a genuinely transparent sticky header, compact all sizing, put a white BETA badge beside the wordmark, show Discover/Browse/Downloads/Library and Favorites/Search/Settings icons, and use filled white hearts for saved concepts.

The user clarified that source URLs/admin publishing are deferred: downloads must currently be dummy simulations. Label progress, sizes, speed and completion as demo values. No package is fetched, written, installed or sent to PS4. Keep the simulator separate from catalog metadata and collection persistence.

- [x] Recompose the header, home/shelves and full-backdrop detail page against the supplied screenshots.
- [x] Share filled-heart toggles between hero, posters, details and Favorites; retain separate tracked Library behavior.
- [x] Implement a typed demo transfer queue with progress, demo speed/size/ETA, pause/resume/cancel/retry, duplicate prevention and browser-local restoration to paused state.
- [x] Connect detail actions and header Downloads to the same queue; preserve navigation, accessibility and focus restoration.
- [x] Test simulator state transitions and browser flows; inspect desktop/laptop/mobile and sticky header scrolling.
- [ ] Document the dummy boundary, run production checks, commit, push and update the existing PR.

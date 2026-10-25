# Fluid store redesign implementation plan

Goal: implement the supplied V2 brief in the existing React desktop preview and push a reviewable stacked PR.

Architecture: retain the strict catalog loader and existing presentation components. Replace the small modal with a full-page, hash-addressable detail view. Keep mounted discovery/catalog screens for reliable focus restoration. Separate versioned local collection persistence from catalog data; keep unavailable downloads truthful.

Design: #050505 background, #fff foreground/focus, #a3a3a3 secondary text, #737373 decorative muted text, #171717 surfaces. Self-hosted Manrope with large display type and regular reading text. Edge-to-edge orbital concept artwork is the signature, with an open poster shelf and compact landscape shelf. Avoid status-card styling and duplicated metadata.

Constraints: all current entries are fictional fixtures; no authorized packages exist. Do not fabricate metadata, releases, popularity, screenshots, transfer state, installation or PS4 support. Original concept art is labeled. No new runtime libraries.

- [x] Inspect current behavior and remote branch stack; create codex/fluid-store-redesign from the current clean branch.
- [x] Generate and inspect visual direction and original hero artwork; record asset provenance.
- [x] Extend the catalog's validated local artwork and optional metadata contract without permitting executable sources.
- [x] Add AppHeader navigation, page routes, distinct Search, Favorites, tracked Library, Downloads and Settings/About.
- [x] Add versioned, validated local collection storage with failure feedback and no installed/downloaded claims.
- [x] Recompose FeaturedHero, ContentShelf and ContentPoster with monochrome tokens and responsive artwork-first layouts.
- [x] Replace Details with data-driven full-page art/metadata/actions, optional genuine gallery and related entries; support browser/Escape back and focus restoration.
- [x] Verify pure catalog/storage/routing logic and browser flows including all detail entries, filters, related entries, persistence, failure recovery, keyboard and responsive behavior.
- [x] Inspect rendered 1920x1080 and small-screen screenshots; correct visual defects and run production checks.
- [ ] Update docs with actual evidence, review diff, commit conventionally, push, verify remote commit and open stacked PR.

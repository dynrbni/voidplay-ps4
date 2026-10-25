# Cinematic store direction

Implements the owner's homepage redesign specification. No reference screenshot files were attached in the accessible conversation; composition was evaluated against the written brief, not a claimed pixel comparison.

Reading this as a TV-first homebrew store, with a cinematic featured view and a denser console catalog. ENERGY 2 / RHYTHM 2 / MOTION 1.

## Decisions

- Near-black #080808 grounds the content like an entertainment library; white and #b5b5b5 secondary text provide hierarchy without panel clutter.
- Amber marks focus and the active destination, not decorative ratings or fabricated status.
- Self-hosted Manrope variable Latin font replaces system/Georgia throughout navigation, hero, catalog and dialogs. Its neutral geometric forms suit a consistent TV interface; system fallbacks cover unsupported scripts/offline font failure.
- A 53vh full-width hero puts artwork behind lower-left copy. Horizontal and bottom gradients protect text and blend the first shelf into the page, rather than enclosing the feature in a card.
- Hero actions are real: View details and browse the featured category. No library, download, installation or controller action is fabricated.
- Three shelves use actual fixture subsets: spotlight, utilities and media. Curated/mock labels replace unsupported popularity, ratings and recency claims.
- Posters are 2:3, with quiet category metadata and one-line title truncation. Browse uses six columns at 1080p; shelves expose a partial next poster to indicate lateral navigation.
- Original locally stored SVG concept art gives each fictional entry a distinct subject, not commercial game imagery. Text explicitly labels concept/mock art; failed/missing artwork gets a title-based fallback.
- Navigation shows only implemented Discover, Browse and Search. Two outline icons identify real Search and Details actions; no console-button hints imply controller integration.
- Spacing, type roles, surfaces, timing and focus are CSS tokens. Restrained transform/color transitions communicate focus without changing layout; reduced-motion removes them.

## Input and state

Presentation is split into AppNavigation, FeaturedHero, ContentShelf and ContentPoster. Existing Zod loader, filtering and native detail dialog remain independent. Shelf left/right movement stays within its row; up/down uses spatial navigation; focused cards scroll into view. Home and Browse remain mounted but hidden to preserve shelf context. Escape from Browse returns to Discover's saved scroll/trigger; modal Close/Escape preserves the invoking card. No hover-only action.

Loading, empty catalog, unmatched search, invalid metadata, network retry, offline hint and image-failure states remain explicit. Browser tests cover these states and production output. No console API or live catalog contract is invented.

# Voidplay V2 design

The supplied brief replaces the previous amber focus and small text dialog with a neutral,
artwork-first store. The existing catalog loader, error boundary, keyboard manager and component
boundaries remain. No runtime dependency is added.

## Composition

Discover opens directly into an edge-to-edge orbital landscape. A quiet overlaid header sits
above a lower-left, widely tracked title. The image supplies color; controls, focus, surfaces and
text are neutral. A white primary action and subdued favorite action lead into a portrait shelf.
Utility/media shelves use wider landscape images for a different rhythm. Selection changes only
on explicit input, never autoplay. Artwork is separate from text and controls.

Browse uses a five-column desktop poster grid, dropping to four and two columns at smaller
widths. Categories, count, search and supported sort are actual catalog operations. Search is
its own destination and keeps independent query/filter state. Favorites and Library have
separate local collections and useful empty states. Downloads has no fabricated transfer UI.
Settings is a simple reading layout with a real reduced-motion checkbox and reload action.

Detail routes use the selected item's large background, portrait cover, full title and actions.
About text and available metadata live in two open columns; related entries open their own
routes. Optional screenshot galleries preserve page context. Current data has no screenshots,
so the gallery is absent. No version, author, license, package size or checksum is fabricated.

## Tokens and interaction

- Background #050505, surface #171717, raised surface #242424, white foreground/focus.
- Secondary #a3a3a3; #737373 is restricted to decorative separators.
- Local variable Manrope; centralized display/page/heading/item/body/caption/navigation sizes.
- 80px desktop gutters at 1920px, 24px mobile gutters, 4px image/control corners.
- Three-pixel white keyboard outline, modest poster lift/scale, fast art fade and shelf movement.
- System reduced motion and a local override stop decorative transitions and smooth scrolling.
- Header gradients retain enough black coverage for neutral navigation text over bright art.

Hash routing works on static hosts. Mounted background store screens retain filters and shelf
offsets. History navigation restores connected trigger elements and scroll position, falling
back to the page focus group when an element disappeared. Search entry focuses the input;
returning from Search details restores the result. Arrow keys leave native inputs/selects alone.

Favorites and tracked Library IDs are stored separately with a versioned, bounded schema.
Storage errors are surfaced and changes remain in memory; no download/install claim is attached
to either collection. Console Gamepad or PS5-specific APIs are not imported.

## References and limits

The written Netflix/Overdrive principles guide composition. Their screenshot attachments were
not available in this session, so a direct pixel comparison was not possible. Original generated
home/detail references were inspected before the visual translation. Final rendered desktop,
laptop and mobile screens were inspected separately; see verification.md and docs/images/.
All current entries are fictional development concepts, clearly identified in the interface.

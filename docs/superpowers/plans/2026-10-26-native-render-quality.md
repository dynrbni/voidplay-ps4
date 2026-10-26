# Native render quality correction 01.04

The owner reports blur and rigid/sluggish motion in 01.03. Keep its working PS4
loader/bootstrap, controller behavior, public catalog and private owner data.

Measured causes: current catalog artwork is 284x351 but was enlarged/cropped into
a full 1920x1080 hero. Assets were baked at 720p/RGB565; small text was resampled
from a 64px atlas at each draw. Every React commit repainted the whole framebuffer,
and the JS fade forced extra full React commits. A fixed sleep added 16ms after
render/presentation, extending each active frame beyond the intended period.

Fix: display-sized native Manrope masks with fractional advances, ARGB8888 local
artwork, bounded bilinear resized-image cache, retained draw commands and clipped
damage rendering. Native cubic easing interpolates compatible geometry/colors;
route changes use a native pixel crossfade. React commits state only, not animation
frames. Frame sleep uses the remaining budget. Preserve reduced-motion preference.
Retina preview uses a real high-DPI drawable instead of OS scaling a low-DPI window.

Artwork policy: no fabricated HD source. Preserve and contain a small poster at
its source size on a native 1080p surface. Landscape artwork is never enlarged;
large sources are downsampled with Lanczos. Record source/output dimensions and
fallback decisions in build/artwork-quality.json. The owner can supply a real
high-resolution hero through the existing catalog sync workflow.

Validate scene no-op/damage/animation/reduced-motion endpoints, subcanvas bounds,
image sampling and existing React/persistence guards under sanitizers. Add quality
regressions for small portraits, 720p and 4K sources. Compare the same 120-action
native Mac CPU workload before/after; never present that as console FPS. Cross-build
and inspect the exact 01.04 PKG, push the existing branch, and keep PS4 acceptance
separate. Console performance logs report measured CPU/present costs on changed
frames, not a fabricated idle frame rate.

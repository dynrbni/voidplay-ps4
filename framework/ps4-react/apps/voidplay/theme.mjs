// SPDX-License-Identifier: GPL-3.0-only
/* Shared design tokens. The web store defines these as CSS custom properties at
   a 1920x1080 viewport, where its clamp() values already sit at their maxima, so
   the numbers below are the same visual values the browser uses. */
export const color = {
  background: '#050505',
  surface: '#171717',
  raised: '#242424',
  line: '#292929',
  secondary: '#B0B0B0',
  muted: '#737373',
  white: '#FFFFFF',
  ink: '#111111',
  headerScrolled: '#050505D6',
  headerTransparent: '#05050500',
  scrim: '#050505D6',
};

export const layout = {
  width: 1920,
  height: 1080,
  gutter: 80,
  gap: 18,
  headerHeight: 76,
  footerHeight: 44,
  heroHeight: 670,
  heroOverlap: 48,
  detailHeroHeight: 700,
  radius: 7,
  focusWidth: 3,
  reveal: 24,
};

export const type = {
  display: { fontSize: 56, lineHeight: 63, fontWeight: 650, letterSpacing: -3 },
  pageTitle: { fontSize: 36, lineHeight: 42, fontWeight: 600, letterSpacing: -1 },
  heading: { fontSize: 23, lineHeight: 30, fontWeight: 650, letterSpacing: -1 },
  subheading: { fontSize: 19, lineHeight: 26, fontWeight: 600 },
  itemTitle: { fontSize: 16, lineHeight: 24, fontWeight: 550 },
  body: { fontSize: 15, lineHeight: 25, fontWeight: 400 },
  lead: { fontSize: 16, lineHeight: 26, fontWeight: 400 },
  secondary: { fontSize: 14, lineHeight: 23, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 18, fontWeight: 400 },
  eyebrow: { fontSize: 12, lineHeight: 20, fontWeight: 500, letterSpacing: 2 },
  nav: { fontSize: 15, lineHeight: 24, fontWeight: 500 },
  wordmark: { fontSize: 25, lineHeight: 30, fontWeight: 800, letterSpacing: -2 },
  badge: { fontSize: 9, lineHeight: 12, fontWeight: 800, letterSpacing: 1 },
  footer: { fontSize: 11, lineHeight: 18, fontWeight: 400 },
};

export const weight = { regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800 };

/* The scrolling page starts behind the floating header (the way the web header
   overlays the hero) and stops above the fixed hint bar. */
export const content = {
  top: 0,
  height: layout.height - layout.footerHeight,
  width: layout.width,
  gutter: layout.gutter,
  inner: layout.width - layout.gutter * 2,
};

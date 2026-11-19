// SPDX-License-Identifier: GPL-3.0-only
/* Deterministic layout for the native renderer.
   Three passes per commit: measure (real text metrics requested from the host),
   place (positions, including scroll offsets revealed from the anchored element)
   and paint (bounded draw commands, each carrying the clip of its container).
   Layout calculation, React reconciliation and drawing stay separate: nothing
   here reads or writes pixels, and presentation stays in the platform layer. */
import coverage from './font-coverage.json' with {type:'json'};
const glyphs = new Set(coverage), missingGlyphs = new Set();
const STYLE_KEYS = new Set([
  'backgroundColor', 'color', 'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'padding', 'gap',
  'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft', 'flexShrink',
  'flexDirection', 'flexGrow', 'alignItems', 'justifyContent', 'overflow',
  'objectFit', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing', 'numberOfLines', 'textAlign',
  'position', 'left', 'top', 'borderRadius', 'borderWidth', 'borderColor',
]);
const NODE_LIMIT = 1024;
const DEPTH_LIMIT = 40;
const REVEAL_MARGIN = 24;
const MAX_SCROLL_KEYS = 32;
export const FONT_FAMILY = 'Manrope';
export const BAKED_WEIGHTS = [400, 500, 550, 600, 650, 700, 750, 800];
const WEIGHT_NAMES = { normal: 400, regular: 400, medium: 500, semibold: 600, demibold: 600, bold: 700, extrabold: 800, heavy: 800 };
const ALIGNMENTS = { 'flex-start': 0, start: 0, center: 1, 'flex-end': 2, end: 2 };

/* A requested weight resolves to a baked atlas. An unsupported request is an
   explicit error instead of a silent fallback to regular text. */
export function resolveWeight(value) {
  if (value === undefined) return 400;
  if (typeof value === 'string') {
    const named = WEIGHT_NAMES[value.trim().toLowerCase()];
    if (named === undefined) throw new Error('Unsupported font weight "' + value + '"');
    return named;
  }
  if (!Number.isFinite(value) || value < 100 || value > 900) throw new Error('Font weight must be a number from 100 to 900');
  return value;
}
export function bakedWeight(value) {
  const wanted = resolveWeight(value);
  let best = BAKED_WEIGHTS[0], distance = Infinity;
  for (const weight of BAKED_WEIGHTS) {
    const difference = Math.abs(weight - wanted);
    if (difference < distance || (difference === distance && weight > best)) { best = weight; distance = difference; }
  }
  return best;
}
export function resolveFontFamily(value) {
  if (value === undefined) return FONT_FAMILY;
  const name = String(value).split(',')[0].trim().replace(/^['"]|['"]$/g, '');
  if (name.toLowerCase() !== FONT_FAMILY.toLowerCase()) throw new Error('Unresolved font family "' + value + '"; only ' + FONT_FAMILY + ' is bundled');
  return FONT_FAMILY;
}
/* Style diagnostics name the offending property, so a bad value points at its
   source instead of at the layout engine. */
const number = (value, fallback, max = 8192, property = 'value') => {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || value < 0 || value > max) throw new Error('Style ' + property + ' must be a number from 0 to ' + max + ', received ' + String(value));
  return Math.round(value);
};
const coordinate = (value, property) => {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || Math.abs(value) > 8192) throw new Error('Style ' + property + ' must be a number within 8192 of the origin, received ' + String(value));
  return Math.round(value);
};
export function color(value, fallback = 0xfff4f4f4) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(value)) throw new Error('Use #RRGGBB or #RRGGBBAA colors');
  if (value.length === 9) return ((parseInt(value.slice(7), 16) << 24) | parseInt(value.slice(1, 7), 16)) >>> 0;
  return (0xff000000 | parseInt(value.slice(1), 16)) >>> 0;
}
function textContent(node) {
  return node.children.map(child => {
    if (child.type === 'raw') return child.text;
    if (child.type === 'Text') return textContent(child);
    throw new Error('Text only accepts text children');
  }).join('');
}
const measureCache = new Map();
function measureText(value, native, metrics, wrap) {
  const key = metrics.size + '|' + metrics.weight + '|' + metrics.lineHeight + '|' + metrics.letterSpacing + '|' + wrap + '|' + value;
  let hit = measureCache.get(key);
  if (hit === undefined) {
    hit = native.measure(value, metrics.size, metrics.weight, wrap, metrics.lineHeight, metrics.letterSpacing);
    if (!Array.isArray(hit) || hit.length !== 2 || !Number.isFinite(hit[0]) || !Number.isFinite(hit[1])) throw new Error('Native text measurement failed');
    if (measureCache.size >= 2048) measureCache.clear();
    measureCache.set(key, hit);
  }
  return hit;
}
function metricsOf(style) {
  const size = number(style.fontSize, 28, 112);
  if (size < 7) throw new Error('Font size must be at least 7');
  const spacing = style.letterSpacing === undefined ? 0 : number(Math.abs(style.letterSpacing), 0, 256);
  return {
    size,
    weight: bakedWeight(style.fontWeight),
    lineHeight: style.lineHeight === undefined ? size + 8 : number(style.lineHeight, size + 8, 1024),
    letterSpacing: style.letterSpacing === undefined || style.letterSpacing >= 0 ? spacing : -spacing,
  };
}
/* Line clamping mirrors the web's line-clamp: shorten the string until it fits
   the requested number of line boxes, then mark the truncation. */
function clampLines(value, native, metrics, wrap, limit) {
  const budget = limit * metrics.lineHeight;
  const candidate = length => length >= value.length ? value : value.slice(0, length).replace(/\s+$/, '') + '...';
  let low = 0, high = value.length, best = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (measureText(candidate(middle), native, metrics, wrap)[1] <= budget) { best = middle; low = middle + 1; }
    else high = middle - 1;
  }
  const text = candidate(best);
  return { text, block: measureText(text, native, metrics, wrap) };
}
const dimension = (value, available, name) => {
  if (typeof value === 'string' && /^\d+(\.\d+)?%$/.test(value)) {
    if (available === undefined) throw new Error('Percentage ' + name + ' requires a definite parent dimension');
    return number(available * parseFloat(value) / 100, 0, 262144, name);
  }
  return value === undefined ? undefined : number(value, 0, 262144, name);
};
function normalizeStyle(style, available, availableHeight) {
  if (style === null || style === undefined) style = {};
  if (typeof style !== 'object') throw new Error('Style must be an object');
  for (const key of Object.keys(style)) if (!STYLE_KEYS.has(key)) throw new Error('Unsupported style property "' + key + '"');
  if (style.flexDirection !== undefined && !['row', 'column'].includes(style.flexDirection)) throw new Error('Unsupported flexDirection');
  if (style.position !== undefined && style.position !== 'absolute') throw new Error('Only absolute positioning is supported');
  if (style.overflow !== undefined && style.overflow !== 'hidden') throw new Error('Only overflow "hidden" is supported');
  if (style.alignItems !== undefined && !(style.alignItems in ALIGNMENTS)) throw new Error('Unsupported alignItems "' + style.alignItems + '"');
  if (style.justifyContent !== undefined && !(style.justifyContent in ALIGNMENTS)) throw new Error('Unsupported justifyContent "' + style.justifyContent + '"');
  if (style.textAlign !== undefined && !(style.textAlign in ALIGNMENTS)) throw new Error('Unsupported textAlign "' + style.textAlign + '"');
  return {
    style,
    available,
    padding: number(style.padding, 0, 512, 'padding'),
    width: dimension(style.width, available, 'width'),
    height: dimension(style.height, availableHeight, 'height'),
    minWidth: dimension(style.minWidth, available, 'minWidth') ?? 0,
    maxWidth: dimension(style.maxWidth, available, 'maxWidth') ?? 262144,
    minHeight: dimension(style.minHeight, availableHeight, 'minHeight') ?? 0,
    maxHeight: dimension(style.maxHeight, availableHeight, 'maxHeight') ?? 262144,
    margin: [style.marginTop, style.marginRight, style.marginBottom, style.marginLeft].map((value,index) => coordinate(value ?? style.margin, 'margin' + index)),
    shrink: number(style.flexShrink, 0, 16, 'flexShrink'),
    grow: number(style.flexGrow, 0, 16, 'flexGrow'),
    row: style.flexDirection === 'row',
    align: ALIGNMENTS[style.alignItems] ?? 0,
    justify: ALIGNMENTS[style.justifyContent] ?? 0,
    textAlign: ALIGNMENTS[style.textAlign] ?? 0,
    gap: number(style.gap, 0, 512, 'gap'),
    radius: number(style.borderRadius, 0, 512, 'borderRadius'),
    border: number(style.borderWidth, 0, 16, 'borderWidth'),
    hidden: style.overflow === 'hidden',
    left: coordinate(style.left, 'left'),
    top: coordinate(style.top, 'top'),
    absolute: style.position === 'absolute',
    family: resolveFontFamily(style.fontFamily),
  };
}
/* Style failures name the node and the value that carries them. */
function boxOf(node, available, availableHeight) {
  try {
    return normalizeStyle(node.props?.style ?? {}, available, availableHeight);
  } catch (error) {
    let detail;
    try { detail = ' ' + JSON.stringify(node.props?.style ?? {}).slice(0, 300); } catch { detail = ''; }
    error.message = error.message + ' on <' + (node?.type ?? 'unknown') + '>' + detail;
    throw error;
  }
}
const scrollOffsets = new Map();
const scrollListeners = new Set();
let lastScrolls = {};
export function resetScrollState() { scrollOffsets.clear(); measureCache.clear(); lastScrolls = {}; }
export function scrollState() { return Object.fromEntries(scrollOffsets); }
/* Screens can react to their own scroll position (a sticky header surface, for
   example) without any screen-specific offset maths of their own. */
export function subscribeScroll(listener) { scrollListeners.add(listener); return () => scrollListeners.delete(listener); }
function publishScrolls(active) {
  const current = Object.fromEntries([...active].map(key => [key, scrollOffsets.get(key) ?? 0]));
  const changed = JSON.stringify(current) !== JSON.stringify(lastScrolls);
  lastScrolls = current;
  if (changed && scrollListeners.size) queueMicrotask(() => { for (const listener of [...scrollListeners]) listener(current); });
}
function rememberScroll(key, offset) {
  scrollOffsets.delete(key);
  scrollOffsets.set(key, offset);
  while (scrollOffsets.size > MAX_SCROLL_KEYS) scrollOffsets.delete(scrollOffsets.keys().next().value);
}
function intersect(a, b) {
  if (!a) return b;
  const left = Math.max(a.x, b.x), top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w), bottom = Math.min(a.y + a.h, b.y + b.h);
  return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) };
}
function measure(node, native, available, depth, assigned, shrink, availableHeight, assignedHeight) {
  if (depth > DEPTH_LIMIT) throw new Error('Component tree limit exceeded');
  const measureKey=[available,assigned,shrink===true,availableHeight,assignedHeight].join('|');
  if(node.__layoutCacheable&&!node.__measureDirty&&node.__measureKey===measureKey&&node.__m)return node.__m;
  node.__measureKey=measureKey;
  node.__measureDirty=false;
  const box = boxOf(node, available, availableHeight);
  if (assigned !== undefined) box.width = assigned;
  if (assignedHeight !== undefined) box.height = assignedHeight;
  if (box.minWidth > box.maxWidth || box.minHeight > box.maxHeight) throw new Error('Minimum dimension exceeds maximum');
  if (box.width !== undefined) box.width = Math.min(box.maxWidth, Math.max(box.minWidth, box.width));
  if (box.height !== undefined) box.height = Math.min(box.maxHeight, Math.max(box.minHeight, box.height));
  shrink = shrink === true;
  if (node.type === 'raw') throw new Error('Strings must be inside Text');
  if (node.type === 'Image') {
    if (box.style.objectFit !== undefined && !['cover','contain','fill'].includes(box.style.objectFit)) throw new Error('Unsupported image objectFit');
    if (typeof node.props.source !== 'string' || !/^[-a-z0-9]{1,80}$/.test(node.props.source)) throw new Error('Image requires a baked asset ID');
    if (box.width === undefined || box.height === undefined) throw new Error('Image requires explicit width and height');
    if (box.width <= 0 || box.height <= 0) throw new Error('Image requires positive dimensions');
    node.__m = { box, width: box.width, height: box.height, wrap: 0, items: [] };
    return node.__m;
  }
  if (node.type === 'Text') {
    const metrics = metricsOf(box.style);
    const raw = textContent(node).normalize('NFC');
    let value = '';
    for (const character of raw) {
      const point = character.codePointAt(0);
      if (point === 10 || glyphs.has(point)) value += character;
      else {
        value += '?';
        if (!missingGlyphs.has(point)) {
          if (missingGlyphs.size < 32) { missingGlyphs.add(point); native.log?.('Missing Manrope glyph U+' + point.toString(16).toUpperCase() + '; rendered ?'); }
        }
      }
    }
    if (value.length > 1024) throw new Error('Text supports at most 1024 characters per node');
    const limit = box.style.numberOfLines === undefined ? 0 : number(box.style.numberOfLines, 0, 64);
    const outer = box.width ?? assigned ?? available;
    const inner = Math.max(0, outer - box.padding * 2);
    let text = value;
    const natural = measureText(value, native, metrics, 0);
    let block = inner > 0 && natural[0] > inner ? measureText(value, native, metrics, inner) : natural;
    let wrap = block === natural ? 0 : inner;
    if (limit > 0 && inner > 0 && block[1] > limit * metrics.lineHeight) {
      const clamped = clampLines(value, native, metrics, inner, limit);
      text = clamped.text; block = clamped.block; wrap = inner;
    }
    const contentWidth = box.width ?? assigned ?? (block[0] > inner && inner > 0 ? inner : block[0]);
    const contentHeight = Math.min(block[1], limit > 0 ? limit * metrics.lineHeight : block[1]);
    node.__m = {
      box, metrics, text, wrap, items: [], textWidth: block[0],
      width: contentWidth,
      height: box.height ?? Math.min(box.maxHeight, Math.max(box.minHeight, contentHeight + box.padding * 2)),
    };
    return node.__m;
  }
  if (node.type !== 'View' && node.type !== 'ScrollView') throw new Error('Only View, Text, Image and ScrollView are supported');
  const scroll = node.type === 'ScrollView';
  if (scroll) {
    if (typeof node.props.scrollKey !== 'string' || !/^[a-z0-9:_-]{1,64}$/.test(node.props.scrollKey)) throw new Error('ScrollView requires a bounded scrollKey');
    if (box.height === undefined) throw new Error('ScrollView requires an explicit viewport height');
    if (node.props.axis !== undefined && !['vertical', 'horizontal'].includes(node.props.axis)) throw new Error('Unsupported ScrollView axis');
    if(node.props.focusAlign!==undefined&&!['nearest','start'].includes(node.props.focusAlign))throw new Error('Unsupported focusAlign');
    /* A horizontal scroll region lays its content out along the horizontal axis
       unless the caller asks for something else explicitly. */
    if (box.style.flexDirection === undefined) box.row = node.props.axis === 'horizontal';
  }
  const explicit = box.width ?? assigned;
  const inner = Math.max(0, (explicit ?? available) - box.padding * 2);
  const innerHeight = box.height === undefined ? undefined : Math.max(0, box.height - box.padding * 2);
  const items = [];
  let flow = 0, growTotal = 0, main = 0, cross = 0;
  for (const child of node.children) {
    const childBox = boxOf(child, inner, innerHeight);
    const item = { child, absolute: childBox.absolute, grow: childBox.absolute ? 0 : childBox.grow, margin: childBox.margin, shrink: childBox.shrink, size: null };
    items.push(item);
    if (item.absolute) continue;
    flow += 1;
    growTotal += item.grow;
  }
  const gaps = Math.max(0, flow - 1) * box.gap;
  /* Row children without an explicit width take their own content width (as a
     flex item does) instead of filling the row. */
  for (const item of items) {
    if (item.absolute) continue;
    item.size = measure(item.child, native, inner, depth + 1, undefined, box.row, innerHeight);
    if (!box.row) item.natural = item.size.width;
  }
  const capacity = box.row ? inner : innerHeight;
  if (capacity !== undefined) {
    let natural = gaps, shrinkTotal = 0;
    for (const item of items) if (!item.absolute) {
      const length = box.row ? item.size.width : item.size.height;
      natural += length + (box.row ? item.margin[1] + item.margin[3] : item.margin[0] + item.margin[2]);
      shrinkTotal += length * item.shrink;
    }
    const slack = capacity - natural;
    for (const item of items) {
      if (item.absolute) continue;
      const length = box.row ? item.size.width : item.size.height;
      const delta = slack > 0 && growTotal > 0 ? slack * item.grow / growTotal : slack < 0 && shrinkTotal > 0 ? slack * length * item.shrink / shrinkTotal : 0;
      if (delta !== 0) item.size = measure(item.child, native, inner, depth + 1,
        box.row ? Math.max(0, Math.round(length + delta)) : undefined, box.row, innerHeight,
        box.row ? undefined : Math.max(0, Math.round(length + delta)));
    }
  }
  for (const item of items) {
    if (item.absolute) { item.size = measure(item.child, native, inner, depth + 1, undefined, false, innerHeight); continue; }
    main += box.row ? item.size.width + item.margin[1] + item.margin[3] : item.size.height + item.margin[0] + item.margin[2];
    cross = Math.max(cross, box.row ? item.size.height + item.margin[0] + item.margin[2] : item.size.width + item.margin[1] + item.margin[3]);
  }
  const contentWidth = box.row ? main + gaps : cross;
  const contentHeight = box.row ? cross : main + gaps;
  const width = Math.min(box.maxWidth, Math.max(box.minWidth, explicit ?? (shrink ? Math.min(available, contentWidth + box.padding * 2) : available)));
  node.__m = {
    box, items, wrap: 0,
    width,
    inner: Math.max(0, width - box.padding * 2),
    contentWidth,
    contentHeight,
    length: main + gaps,
    height: box.height ?? Math.min(box.maxHeight, Math.max(box.minHeight, contentHeight + box.padding * 2)),
  };
  return node.__m;
}
function union(anchor, rect) {
  if (!rect) return anchor;
  if (!anchor) return { ...rect };
  const left = Math.min(anchor.x, rect.x), top = Math.min(anchor.y, rect.y);
  const right = Math.max(anchor.x + anchor.w, rect.x + rect.w), bottom = Math.max(anchor.y + anchor.h, rect.y + rect.h);
  return { x: left, y: top, w: right - left, h: bottom - top };
}
/* The animated element (focused card or action) marks itself with anchor, so a
   scroll container can reveal it without any screen-specific offset maths. */
function anchored(node, x, y, width, height) {
  return node.props?.anchor === true ? { x, y, w: width, h: height } : null;
}
/* Main-axis free space, the way justify-content distributes it when the
   container is larger than its content (a centred label in a fixed pill). */
function start(justify, space, length) {
  if (justify === 1) return Math.max(0, Math.floor((space - length) / 2));
  if (justify === 2) return Math.max(0, space - length);
  return 0;
}
function placeChildren(node, x, y, depth) {
  const record = node.__m;
  const box = record.box;
  const contentX = x + box.padding, contentY = y + box.padding;
  const crossSize = box.row ? Math.max(0, record.height - box.padding * 2) : record.inner;
  let cursor = start(box.justify, box.row ? record.inner : Math.max(0, record.height - box.padding * 2), record.length), anchor = null;
  for (const item of record.items) {
    const size = item.size;
    if (item.absolute) {
      anchor = union(anchor, place(item.child, x + box.padding + size.box.left, y + box.padding + size.box.top, depth + 1));
      continue;
    }
    let cross = 0;
    const itemCross = box.row ? size.height + item.margin[0] + item.margin[2] : size.width + item.margin[1] + item.margin[3];
    if (box.align === 1) cross = Math.max(0, Math.floor((crossSize - itemCross) / 2));
    else if (box.align === 2) cross = Math.max(0, crossSize - itemCross);
    const px = (box.row ? contentX + cursor : contentX + cross) + item.margin[3];
    const py = (box.row ? contentY + cross : contentY + cursor) + item.margin[0];
    anchor = union(anchor, place(item.child, px, py, depth + 1));
    cursor += (box.row ? size.width + item.margin[1] + item.margin[3] : size.height + item.margin[0] + item.margin[2]) + box.gap;
  }
  return anchor;
}
function place(node, x, y, depth) {
  if (depth > DEPTH_LIMIT) throw new Error('Component tree limit exceeded');
  const record = node.__m;
  node.__p = { x, y };
  if (node.type === 'Text' || node.type === 'Image') return anchored(node, x, y, record.width, record.height);
  if (node.type === 'ScrollView') {
    const horizontal = node.props.axis === 'horizontal';
    const key = node.props.scrollKey;
    const viewport = horizontal ? record.width : record.height;
    const previous = Math.max(0, scrollOffsets.get(key) ?? 0);
    const run = offset => {
      const shifted = placeChildren(node, x + (horizontal ? -offset : 0), y + (horizontal ? 0 : -offset), depth);
      return { anchor: shifted, offset };
    };
    let state = run(previous);
    const max = Math.max(0, record.length + record.box.padding * 2 - viewport);
    let offset = Math.max(0, Math.min(previous, max));
    if (offset !== state.offset) state = run(offset);
    if (state.anchor) {
      const low = horizontal ? state.anchor.x : state.anchor.y;
      const size = horizontal ? state.anchor.w : state.anchor.h;
      const insetStart = number(node.props.insetStart, 0, 512, 'insetStart');
      const insetEnd = number(node.props.insetEnd, 0, 512, 'insetEnd');
      const viewLow = (horizontal ? x : y) + insetStart;
      const viewHigh = (horizontal ? x : y) + viewport - insetEnd;
      let next = offset;
      /* Only move when the anchored element is not fully visible: an item that is
         already on screen must not shift the page underneath the user. */
      if (low < viewLow || low + size > viewHigh) {
        if (node.props.focusAlign==='start' || size > viewHigh - viewLow || low < viewLow + REVEAL_MARGIN) next = offset - (viewLow + REVEAL_MARGIN - low);
        else next = offset + (low + size - (viewHigh - REVEAL_MARGIN));
      }
      next = Math.max(0, Math.min(Math.round(next), max));
      if (next !== offset) { offset = next; state = run(offset); }
    }
    rememberScroll(key, offset);
    record.offset = offset;
    record.axis = horizontal ? 'horizontal' : 'vertical';
    record.extent = record.length;
    /* Once this container has revealed the element, what an outer container has
       to reveal is this viewport, not the element inside it. */
    if (!state.anchor) return null;
    return intersect(state.anchor, { x, y, w: record.width, h: record.height });
  }
  return placeChildren(node, x, y, depth) ?? anchored(node, x, y, record.width, record.height);
}
const invisible = value => typeof value === 'string' && value.length === 9 && value.slice(7) === '00';
/* Background first, then the border as a real stroke on top, which is how the
   browser paints a border box: the border never erases its own fill. */
function drawBox(node, x, y, ctx) {
  const record = node.__m, box = record.box, fill = box.style.backgroundColor;
  if (fill && !invisible(fill)) {
    if (box.radius) ctx.native.box(x, y, record.width, record.height, color(fill), box.radius);
    else ctx.native.rect(x, y, record.width, record.height, color(fill));
  }
  if (box.border) ctx.native.stroke(x, y, record.width, record.height, box.border, color(box.style.borderColor), box.radius);
}
function paint(node, ctx) {
  const record = node.__m, box = record.box, x = node.__p.x, y = node.__p.y;
  const visible = !ctx.clip || !(x >= ctx.clip.x + ctx.clip.w || y >= ctx.clip.y + ctx.clip.h || x + record.width <= ctx.clip.x || y + record.height <= ctx.clip.y);
  if (visible) drawBox(node, x, y, ctx);
  if (!visible && (node.type === 'Text' || node.type === 'Image')) return;
  if (node.type === 'Text') {
    const inner = Math.max(0, record.width - box.padding * 2);
    const offset = box.textAlign === 1 ? Math.max(0, Math.floor((inner - record.textWidth) / 2)) : box.textAlign === 2 ? Math.max(0, inner - record.textWidth) : 0;
    ctx.native.text(x + box.padding + offset, y + box.padding, record.text, record.metrics.size, record.metrics.weight, record.wrap, record.metrics.lineHeight, record.metrics.letterSpacing, color(box.style.color));
    return;
  }
  if (node.type === 'Image') {
    if (ctx.native.image(x, y, record.width, record.height, node.props.source,box.style.objectFit==='contain'?1:box.style.objectFit==='fill'?2:0) === false) {
      ctx.native.rect(x,y,record.width,record.height,0xff1c1c1c);
      if(record.width>=120&&record.height>=24)ctx.native.text(x+8,y+4,'Artwork unavailable',12,400,record.width-16,18,0,0xffb0b0b0);
    }
    return;
  }
  const clip = node.type === 'ScrollView' || box.hidden ? intersect(ctx.clip, { x, y, w: record.width, h: record.height }) : ctx.clip;
  if (clip && (clip.w <= 0 || clip.h <= 0)) return;
  const previous = ctx.clip;
  const changed = clip !== previous;
  if (changed && clip) ctx.native.clip(clip.x, clip.y, clip.w, clip.h);
  ctx.clip = clip;
  for (const child of node.children) paint(child, ctx);
  ctx.clip = previous;
  if (changed && clip) { if (previous) ctx.native.clip(previous.x, previous.y, previous.w, previous.h); else ctx.native.clip(); }
}
export function layout(root, native, width = 1920, height = 1080) {
  if (typeof native?.measure !== 'function') throw new Error('The native host must provide measure()');
  const stamp = {};
  let count = 0;
  const counting = (node, depth) => {
    if (!node || typeof node.type !== 'string') throw new Error('Invalid layout node');
    if (depth > DEPTH_LIMIT) throw new Error('Component tree limit exceeded');
    if (node.__stamp === stamp) return;
    node.__stamp = stamp;
    if (++count > NODE_LIMIT) throw new Error('Layout node limit exceeded');
    if (node.type !== 'Text' && node.type !== 'Image') for (const child of node.children ?? []) counting(child, depth + 1);
  };
  for (const child of root.children) counting(child, 0);
  for (const child of root.children) measure(child, native, width, 0, undefined, false);
  for (const child of root.children) place(child, 0, 0, 0);
  const ctx = { native, clip: {x:0,y:0,w:width,h:height} };
  native.clear(0xff101216);
  for (const child of root.children) paint(child, ctx);
  native.commit();
  const active = new Set(), anchors = [];
  const inspect = node => {
    if (node.type === 'ScrollView') active.add(node.props.scrollKey);
    if (node.props?.anchor) anchors.push({x:node.__p.x,y:node.__p.y,w:node.__m.width,h:node.__m.height});
    if (node.type !== 'Text' && node.type !== 'Image') for (const child of node.children) inspect(child);
  };
  for (const child of root.children) inspect(child);
  publishScrolls(active);
  return { nodes: count, width, height, scrolls: Object.fromEntries([...active].map(key => [key,scrollOffsets.get(key)])), anchors };
}

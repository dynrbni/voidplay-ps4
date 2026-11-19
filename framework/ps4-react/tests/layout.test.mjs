// SPDX-License-Identifier: GPL-3.0-only
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { layout, color, resetScrollState, bakedWeight, resolveWeight, resolveFontFamily } from '../packages/core/layout.mjs';
/* Deterministic stand-in for the native measurement call: a fixed advance per
   character, a character-level wrap and CSS-like line boxes. */
function measureText(value, size, weight, wrap, lineHeight) {
  const unit = Math.round(size / 2) + (weight >= 600 ? size : 0);
  let width = 0, lines = 0;
  for (const paragraph of String(value).split('\n')) {
    let column = 0;
    if (!paragraph.length) { lines += 1; continue; }
    for (let index = 0; index < paragraph.length; ++index) {
      if (wrap > 0 && column + unit > wrap) { width = Math.max(width, column); column = 0; lines += 1; }
      column += unit;
    }
    width = Math.max(width, column);
    lines += 1;
  }
  return [width, Math.max(1, lines) * (lineHeight || size + 8)];
}
function canvas() {
  const commands = [];
  const stub = {
    commands,
    measure: (value, size, weight, wrap, lineHeight) => measureText(value, size, weight, wrap, lineHeight),
    rect: (...args) => commands.push(['rect', ...args]),
    text: (...args) => commands.push(['text', ...args]),
    image: (...args) => commands.push(['image', ...args]),
    box: (...args) => commands.push(['box', ...args]),
    stroke: (...args) => commands.push(['stroke', ...args]),
    clear: (...args) => commands.push(['clear', ...args]),
    commit: () => commands.push(['commit']),
    clip: (...args) => commands.push(['clip', ...args]),
    diagnostics: () => 'stub host',
  };
  return stub;
}
const text = (value, style = {}) => ({ type: 'Text', props: { style }, children: [{ type: 'raw', text: value }] });
const view = (style = {}, children = [], props = {}) => ({ type: 'View', props: { ...props, style }, children });
const image = (source, style) => ({ type: 'Image', props: { source, style }, children: [] });
const scroll = (props, children) => ({ type: 'ScrollView', props, children });
const rows = (count, height, anchorIndex) => Array.from({ length: count }, (_, index) => view({ width: 800, height, backgroundColor: '#171717' }, [], { anchor: index === anchorIndex }));
const yOfRects = (native, height) => native.commands.filter(command => command[0] === 'rect' && command[4] === height).map(command => command[2]);

beforeEach(() => resetScrollState());

test('typography resolves requested weights to baked atlases instead of silently falling back', () => {
  assert.equal(bakedWeight(400), 400);
  assert.equal(bakedWeight(500), 500);
  assert.equal(bakedWeight(550), 550);
  assert.equal(bakedWeight(600), 600);
  assert.equal(bakedWeight(650), 650);
  assert.equal(bakedWeight(700), 700);
  assert.equal(bakedWeight(900), 800);
  assert.equal(resolveWeight('semibold'), 600);
  assert.equal(resolveWeight('bold'), 700);
  for (const invalid of ['heavyish', 50, 1000, NaN]) assert.throws(() => resolveWeight(invalid), /weight/);
  assert.equal(resolveFontFamily('Manrope'), 'Manrope');
  assert.equal(resolveFontFamily('Manrope, sans-serif'), 'Manrope');
  assert.throws(() => resolveFontFamily('Comic Sans'), /Unresolved font family/);
  const native = canvas();
  layout({ children: [text('Weighted', { fontSize: 24, fontWeight: 550, lineHeight: 32 })] }, native);
  assert.deepEqual(native.commands.find(command => command[0] === 'text').slice(1), [0, 0, 'Weighted', 24, 550, 0, 32, 0, color(undefined)]);
});

test('column padding, spacing, text and clearing produce a deterministic frame', () => {
  const native = canvas(), root = { children: [view({ padding: 20, gap: 10, backgroundColor: '#101216' }, [text('PS4 React'), text('Hello World')])] };
  const result = layout(root, native, 640, 360);
  assert.equal(result.nodes, 3);
  assert.deepEqual(native.commands.filter(command => command[0] === 'text').map(command => command.slice(1, 4)), [[20, 20, 'PS4 React'], [20, 66, 'Hello World']]);
  assert.equal(native.commands[0][0], 'clear');
  assert.equal(native.commands.at(-1)[0], 'commit');
  const again = canvas();
  layout(root, again, 640, 360);
  assert.deepEqual(native.commands, again.commands);
});

test('text measurement wraps to the available width and reports its real block height', () => {
  const native = canvas();
  const result = layout({ children: [view({ width: 280 }, [text('alpha beta gamma delta epsilon', { fontSize: 20, lineHeight: 28 })])] }, native);
  assert.equal(result.nodes, 2);
  const drawn = native.commands.find(command => command[0] === 'text');
  assert.equal(drawn[6], 280, 'the drawn wrap width matches the measured width');
  assert.equal(drawn[7], 28);
  const expected = measureText('alpha beta gamma delta epsilon', 20, 400, 280, 28)[1];
  assert.equal(expected, 56, 'a long label occupies two measured line boxes');
  const box = native.commands.find(command => command[0] === 'rect' && command[5] === color('#171717'));
  assert.equal(box, undefined, 'no background means no rectangle');
  assert.equal(native.commands.filter(command => command[0] === 'text').length, 1);
  const wide = canvas();
  layout({ children: [view({ width: 280 }, [text('short', { fontSize: 20, lineHeight: 28 })])] }, wide);
  assert.equal(wide.commands.find(command => command[0] === 'text')[6], 0, 'text that fits keeps natural spacing without wrapping');
});

test('line clamping truncates a long label to the requested number of line boxes', () => {
  const native = canvas();
  layout({ children: [view({ width: 200 }, [text('alpha beta gamma delta epsilon zeta eta theta', { fontSize: 20, lineHeight: 28, numberOfLines: 2 })])] }, native);
  const drawn = native.commands.find(command => command[0] === 'text');
  assert.ok(drawn[3].endsWith('...'));
  assert.ok(measureText(drawn[3], 20, 400, 200, 28)[1] <= 56);
});

test('row layout uses measured text widths, alignment and flex growth', () => {
  const native = canvas();
  layout({ children: [view({ flexDirection: 'row', gap: 8, alignItems: 'center', width: 400 }, [text('ABC', { fontSize: 14 }), view({ width: 50, height: 20, backgroundColor: '#FFFFFF' })])] }, native);
  assert.deepEqual(native.commands.find(command => command[0] === 'rect').slice(1, 5), [29, 1, 50, 20]);
  const grown = canvas();
  layout({ children: [view({ flexDirection: 'row', gap: 10, width: 400 }, [text('Title', { fontSize: 16 }), view({ flexGrow: 1, height: 20, backgroundColor: '#111111' }), view({ width: 60, height: 20, backgroundColor: '#222222' })])] }, grown);
  const boxes = grown.commands.filter(command => command[0] === 'rect');
  assert.deepEqual(boxes[0].slice(1, 5), [50, 0, 280, 20]);
  assert.deepEqual(boxes[1].slice(1, 5), [340, 0, 60, 20]);
});

test('nested flex layouts keep padding, gap and absolute children consistent', () => {
  const native = canvas();
  layout({ children: [view({ padding: 50, gap: 20, width: 900, backgroundColor: '#050505' }, [
    view({ height: 100, flexDirection: 'row', padding: 10, gap: 10 }, [view({ width: 200, height: 80, backgroundColor: '#111111' }), view({ width: 300, height: 80, backgroundColor: '#222222' })]),
    view({ height: 40, backgroundColor: '#333333' }, [image('backdrop', { position: 'absolute', left: 5, top: 5, width: 20, height: 20 })]),
  ])] }, native);
  assert.deepEqual(native.commands.filter(command => command[0] === 'rect' && command[4] === 80).map(command => command.slice(1, 5)), [[60, 60, 200, 80], [270, 60, 300, 80]]);
  assert.deepEqual(native.commands.filter(command => command[0] === 'rect' && command[4] === 40).map(command => command.slice(1, 5)), [[50, 170, 800, 40]]);
  assert.deepEqual(native.commands.find(command => command[0] === 'image').slice(1), [55, 175, 20, 20, 'backdrop', 0]);
});

test('unsupported DOM nodes, styles, values and oversized trees fail clearly', () => {
  for (const node of [{ type: 'div', props: {}, children: [] }, text('ok', { fontSize: 0 }), text('ok', { width: NaN }), text('ok', { position: 'sticky' }), text('ok', { fontWeight: 950 }), text('ok', { fontFamily: 'Inter' }), text('ok', { overflow: 'visible' }), text('x'.repeat(2049)), { type: 'raw', text: 'outside' }])
    assert.throws(() => layout({ children: [node] }, canvas()));
  assert.throws(() => color('red'));
  assert.equal(color('#AABBCC'), 0xffaabbcc);
  let node = text('deep');
  for (let index = 0; index < 45; ++index) node = view({}, [node]);
  assert.throws(() => layout({ children: [node] }, canvas()), /limit/);
  const wide = { children: Array.from({ length: 1100 }, () => view({ width: 1, height: 1 })) };
  assert.throws(() => layout(wide, canvas()), /node limit/);
});

test('absolute artwork uses baked IDs and does not displace flow siblings', () => {
  const native = canvas();
  layout({ children: [view({}, [text('Before'), image('cover', { position: 'absolute', left: 80, top: 40, width: 200, height: 250 }), text('Next')])] }, native);
  assert.deepEqual(native.commands.find(command => command[0] === 'image'), ['image', 80, 40, 200, 250, 'cover', 0]);
  assert.deepEqual(native.commands.filter(command => command[0] === 'text').map(command => command.slice(1, 3)), [[0, 0], [0, 36]]);
  assert.throws(() => layout({ children: [image('https://example.com/image.png', { width: 10, height: 10 })] }, native), /asset ID/);
});

test('rounded translucent surfaces keep their fill and draw the border as a stroke', () => {
  const native = canvas();
  layout({ children: [view({ width: 100, height: 60, borderRadius: 20, borderWidth: 2, borderColor: '#FFFFFF', backgroundColor: '#05050580' })] }, native);
  assert.deepEqual(native.commands.filter(command => command[0] === 'box'), [['box', 0, 0, 100, 60, 0x80050505, 20]]);
  assert.deepEqual(native.commands.filter(command => command[0] === 'stroke'), [['stroke', 0, 0, 100, 60, 2, 0xffffffff, 20]]);
  assert.equal(color('#FFFFFF00'), 0x00ffffff);
});

test('a fully transparent background draws nothing while its outline still paints', () => {
  const native = canvas();
  layout({ children: [view({ width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#05050500' })] }, native);
  assert.equal(native.commands.filter(command => command[0] === 'rect' || command[0] === 'box').length, 0);
  assert.deepEqual(native.commands.filter(command => command[0] === 'stroke'), [['stroke', 0, 0, 40, 40, 3, 0xffffffff, 20]]);
});

test('justifyContent centres content on the main axis and textAlign centres text', () => {
  const native = canvas();
  layout({ children: [view({ width: 200, height: 100, justifyContent: 'center', alignItems: 'center' }, [text('Centred', { fontSize: 20, lineHeight: 24, textAlign: 'center', width: 200 })])] }, native);
  const drawn = native.commands.find(command => command[0] === 'text');
  assert.equal(drawn[2], 38, 'vertical centring offsets the single line inside the box');
  assert.equal(drawn[1], Math.floor((200 - measureText('Centred', 20, 400, 200, 24)[0]) / 2), 'horizontal centring offsets the text inside its box');
  const row = canvas();
  layout({ children: [view({ width: 300, height: 40, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' }, [view({ width: 50, height: 40, backgroundColor: '#111111' }), view({ width: 50, height: 40, backgroundColor: '#222222' })])] }, row);
  assert.deepEqual(row.commands.filter(command => command[0] === 'rect').map(command => command[1]), [190, 250]);
  assert.throws(() => layout({ children: [view({ justifyContent: 'space-between' })] }, canvas()), /justifyContent/);
  assert.throws(() => layout({ children: [text('x', { textAlign: 'justify' })] }, canvas()), /textAlign/);
});

test('a page taller than its viewport scrolls to the anchored element and stays there', () => {
  const native = canvas();
  const first = layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 0))] }, native, 1920, 1080);
  assert.equal(first.scrolls.page, 0);
  assert.deepEqual(yOfRects(native, 200), [0, 200]);
  const bottom = canvas();
  const fourth = layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 3))] }, bottom, 1920, 1080);
  assert.equal(fourth.scrolls.page, 424);
  assert.deepEqual(yOfRects(bottom, 200), [-24, 176, 376]);
  const again = canvas();
  assert.equal(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 3))] }, again, 1920, 1080).scrolls.page, 424, 'an already visible anchor does not jump');
  const back = canvas();
  assert.equal(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 0))] }, back, 1920, 1080).scrolls.page, 0, 'returning to the first item scrolls back');
  const last = canvas();
  assert.equal(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 9))] }, last, 1920, 1080).scrolls.page, 1600, 'the last item is reachable and clamped to the content end');
});

test('scroll offsets are clamped when the content shrinks and reset with the session', () => {
  const native = canvas();
  assert.equal(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(10, 200, 9))] }, native).scrolls.page, 1600);
  assert.equal(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(2, 200, -1))] }, native).scrolls.page, 0);
  resetScrollState();
  assert.deepEqual(layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(4, 200, 3))] }, canvas()).scrolls.page, 400);
});

test('a horizontal shelf scrolls independently of the vertical page', () => {
  const shelf = (anchorIndex, height) => scroll({ scrollKey: 'shelf', axis: 'horizontal', style: { width: 400, height } }, Array.from({ length: 6 }, (_, index) => view({ width: 200, height, backgroundColor: '#171717' }, [], { anchor: index === anchorIndex })));
  assert.ok(shelf(0, 120).children.length === 6, 'each shelf renders its own cards');
  const page = (anchorIndex, shelfAnchor) => ({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, [view({ width: 800, height: 200, backgroundColor: '#101010' }, [], { anchor: anchorIndex === 0 }), view({ width: 800, height: 60, backgroundColor: '#202020' }, [], { anchor: anchorIndex === 1 }), shelf(shelfAnchor, 120), view({ width: 800, height: 400, backgroundColor: '#303030' }, [], { anchor: anchorIndex === 2 })])] });
  const native = canvas();
  const result = layout(page(-1, 4), native, 1920, 1080);
  assert.equal(result.scrolls.page, 0, 'horizontal movement never moves the page');
  assert.equal(result.scrolls.shelf, 624);
  const vertical = layout(page(2, 4), canvas(), 1920, 1080);
  assert.equal(vertical.scrolls.shelf, 624, 'vertical movement never moves the shelf');
  assert.ok(vertical.scrolls.page > 0, 'the offscreen section is revealed');
  resetScrollState();
  assert.equal(layout(page(-1, 4), canvas(), 1920, 1080).scrolls.shelf, 624);
  const left = layout(page(-1, 0), canvas(), 1920, 1080);
  assert.equal(left.scrolls.shelf, 0, 'moving back to the first card scrolls the shelf back');
  assert.equal(left.scrolls.page, 0, 'the shelf keeps its place while only the horizontal offset changes');
});

test('scrolled content is clipped to its viewport and re-clipped on exit', () => {
  const native = canvas();
  layout({ children: [scroll({ scrollKey: 'page', style: { width: 800, height: 400 } }, rows(4, 200, 2)), view({ width: 100, height: 100, backgroundColor: '#FFFFFF' })] }, native);
  assert.deepEqual(native.commands.filter(command => command[0] === 'clip').map(command => command.slice(1)), [[0, 0, 800, 400], [0, 0, 1920, 1080]]);
  const clipAt = native.commands.findIndex(command => command[0] === 'clip');
  const reset = native.commands.findLastIndex(command => command[0] === 'clip');
  const inside = native.commands.slice(clipAt, reset);
  assert.ok(inside.every(command => command[0] !== 'rect' || command[3] <= 800));
  assert.deepEqual(native.commands.slice(reset).find(command => command[0] === 'rect').slice(1, 5), [0, 0, 100, 100]);
});

test('overflow hidden clips a plain view without a scroll container', () => {
  const native = canvas();
  layout({ children: [view({ width: 200, height: 100, overflow: 'hidden' }, [view({ width: 400, height: 400, backgroundColor: '#123456' })])] }, native);
  assert.deepEqual(native.commands.filter(command => command[0] === 'clip').map(command => command.slice(1)), [[0, 0, 200, 100], [0, 0, 1920, 1080]]);
  assert.deepEqual(native.commands.find(command => command[0] === 'rect').slice(1, 5), [0, 0, 400, 400]);
});

test('repeated layout passes over the same tree stay deterministic', () => {
  const build = () => ({ children: [view({ padding: 40, gap: 12 }, [text('Stable', { fontSize: 22, fontWeight: 600 }), view({ flexDirection: 'row', gap: 6 }, [text('one', { fontSize: 14 }), text('two', { fontSize: 14 })])])] });
  const first = canvas(), second = canvas();
  const a = layout(build(), first), b = layout(build(), second);
  assert.deepEqual(first.commands, second.commands);
  assert.deepEqual(a.scrolls, b.scrolls);
  assert.equal(a.nodes, b.nodes);
});


test('percentage bounds, flex shrink, vertical growth and negative overlap use shared layout', () => {
  const native=canvas();
  layout({children:[view({width:400,height:200,flexDirection:'row'},[
    view({width:300,flexShrink:1,height:'100%',backgroundColor:'#111111'}),
    view({width:300,flexShrink:1,maxWidth:240,height:80,backgroundColor:'#222222'}),
  ])]},native);
  const boxes=native.commands.filter(c=>c[0]==='rect');
  assert.deepEqual(boxes.map(c=>c.slice(1,5)),[[0,0,222,200],[222,0,178,80]]);
  const column=canvas();
  layout({children:[view({width:400,height:200},[view({height:40}),view({flexGrow:1,backgroundColor:'#111111'}),view({height:50,marginTop:-10,backgroundColor:'#222222'})])]},column);
  assert.deepEqual(column.commands.filter(c=>c[0]==='rect').map(c=>c.slice(1,5)),[[0,40,400,120],[0,150,400,50]]);
});

test('nested scroll clips restore the parent before painting a following sibling', () => {
  const native=canvas();
  layout({children:[scroll({scrollKey:'outer',style:{width:800,height:400}},[
    scroll({scrollKey:'inner',axis:'horizontal',style:{width:500,height:100}},rows(3,80,-1)),
    view({width:800,height:300,backgroundColor:'#123456'}),
  ])]},native);
  assert.deepEqual(native.commands.filter(c=>c[0]==='clip').map(c=>c.slice(1)),[[0,0,800,400],[0,0,500,100],[0,0,800,400],[0,0,1920,1080]]);
});

test('focus reveal respects sticky rails and unrelated updates keep its offset', () => {
  const build=()=>({children:[scroll({scrollKey:'page',insetStart:92,style:{width:800,height:400}},rows(8,100,5))]});
  const first=layout(build(),canvas());
  assert.equal(first.scrolls.page,224);
  const same=layout(build(),canvas());assert.equal(same.scrolls.page,224);
  const anchors=same.anchors;assert.ok(anchors.every(a=>a.y>=92&&a.y+a.h<=400));
});

test('bundled Unicode survives measurement; missing glyphs report a bounded fallback', () => {
  const native=canvas(),warnings=[];native.log=message=>warnings.push(message);
  layout({children:[text('Café · “Voidplay” — €', {fontSize:12}),text('Unavailable ☃',{fontSize:12})]},native);
  const values=native.commands.filter(c=>c[0]==='text').map(c=>c[3]);
  assert.equal(values[0],'Café · “Voidplay” — €');assert.equal(values[1],'Unavailable ?');assert.ok(warnings.some(s=>s.includes('2603')));
});


test('image fit modes and missing artwork are explicit and preserve following content',()=>{
 const native=canvas();native.image=(...args)=>{native.commands.push(['image',...args]);return false;};
 layout({children:[image('missing',{width:300,height:180,objectFit:'contain'}),text('Still works')]},native);
 assert.equal(native.commands.find(c=>c[0]==='image').at(-1),1);
 assert.ok(native.commands.some(c=>c[0]==='text'&&c[3]==='Artwork unavailable'));
 assert.ok(native.commands.some(c=>c[0]==='text'&&c[3]==='Still works'));
 assert.throws(()=>layout({children:[image('bad',{width:10,height:10,objectFit:'unknown'})]},canvas()),/objectFit/);
});


test('start-aligned reveal brings a newly reached information section below the sticky rail',()=>{
 const native=canvas();
 const result=layout({children:[scroll({scrollKey:'detail',focusAlign:'start',insetStart:92,style:{width:800,height:400}},rows(10,100,6))]},native);
 assert.equal(result.anchors[0].y,116);assert.equal(result.scrolls.detail,484);
});

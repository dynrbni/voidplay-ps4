// SPDX-License-Identifier: GPL-3.0-only
const supported = new Set(['backgroundColor','color','width','height','padding','gap','flexDirection','fontSize','position','left','top']);
const number = (value, fallback, max = 8192) => {
  if(value === undefined) return fallback;
  if(!Number.isFinite(value) || value < 0 || value > max) throw new Error('Style dimension out of range');
  return Math.round(value);
};
export function color(value, fallback = 0xfff4f4f4) {
  if(value === undefined) return fallback;
  if(typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Use #RRGGBB colors');
  return (0xff000000 | parseInt(value.slice(1),16)) >>> 0;
}
function content(node) {
  if(node.type === 'raw') return node.text;
  return node.children.map(child => { if(child.type !== 'raw' && child.type !== 'Text') throw new Error('Text only accepts text children'); return content(child); }).join('');
}
export function layout(root, native, width=1920,height=1080) {
  let count=0;
  function visit(node,x,y,available,depth=0) {
    if(++count>512 || depth>32) throw new Error('Component tree limit exceeded');
    if(node.type === 'raw') throw new Error('Strings must be inside Text');
    const style = node.props.style ?? {};
    if(Object.keys(style).some(key=>!supported.has(key))) throw new Error('Unsupported style property');
    if(style.flexDirection && !['row','column'].includes(style.flexDirection)) throw new Error('Unsupported flexDirection');
    if(style.position!==undefined&&style.position!=='absolute')throw new Error('Only absolute positioning is supported');
    x+=number(style.left,0);y+=number(style.top,0);
    const w=number(style.width,available),padding=number(style.padding,0,512),gap=number(style.gap,0,512);
    const size=number(style.fontSize,28,112);
    if(node.type==='Image'){
      if(typeof node.props.source!=='string'||!/^[-a-z0-9]{1,80}$/.test(node.props.source))throw new Error('Image requires a baked asset ID');
      const h=number(style.height,0);
      return{w,h,paint(){native.image(x,y,w,h,node.props.source);}};
    }
    if(node.type==='Text') {
      if(size<7) throw new Error('Font size must be at least 7');
      const value=content(node);
      if(value.length>2048 || /[^\x20-\x7e\n]/.test(value)) throw new Error('Text supports printable ASCII and newline, max 2048 characters');
      const h=number(style.height,value.split('\n').length*(size+8)+padding*2);
      const measured=Math.min(w,Math.max(...value.split('\n').map(line=>line.length))*6*Math.floor(size/7)+padding*2);
      return {w:style.width===undefined?measured:w,h,paint(){if(style.backgroundColor)native.rect(x,y,w,h,color(style.backgroundColor));native.text(x+padding,y+padding,value,size,color(style.color));}};
    }
    if(node.type!=='View') throw new Error('Only View, Text and Image are supported');
    const row=style.flexDirection==='row';let cursor=0,maxCross=0;
    const children=node.children.map(child=>{
      const absolute=child.props?.style?.position==='absolute';
      const item=visit(child,x+padding+(!absolute&&row?cursor:0),y+padding+(!absolute&&!row?cursor:0),Math.max(0,w-padding*2),depth+1);
      if(!absolute){cursor+=(row?item.w:item.h)+gap;maxCross=Math.max(maxCross,row?item.h:item.w);}return item;
    });
    const h=number(style.height,(row?maxCross:Math.max(0,cursor-gap))+padding*2);
    return {w,h,paint(){if(style.backgroundColor)native.rect(x,y,w,h,color(style.backgroundColor));for(const child of children)child.paint();}};
  }
  const frames=root.children.map(node=>visit(node,0,0,width));
  native.clear(0xff101216);for(const frame of frames)frame.paint();native.commit();
  return {nodes:count,width,height};
}

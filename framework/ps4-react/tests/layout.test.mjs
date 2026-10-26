// SPDX-License-Identifier: GPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, color } from '../packages/core/layout.mjs';
function canvas(){const commands=[];return {commands,rect:(...args)=>commands.push(['rect',...args]),text:(...args)=>commands.push(['text',...args]),clear:(...args)=>commands.push(['clear',...args]),commit:()=>commands.push(['commit'])};}
const text=(value,style={})=>({type:'Text',props:{style},children:[{type:'raw',text:value}]});
test('column padding, spacing, text and clearing produce a deterministic frame',()=>{
 const native=canvas(),root={children:[{type:'View',props:{style:{padding:20,gap:10,backgroundColor:'#101216'}},children:[text('PS4 React'),text('Hello World')]}]};
 const result=layout(root,native,640,360);assert.equal(result.nodes,3);
 assert.deepEqual(native.commands.filter(c=>c[0]==='text').map(c=>c.slice(1,4)),[[20,20,'PS4 React'],[20,66,'Hello World']]);
 assert.equal(native.commands[0][0],'clear');assert.equal(native.commands.at(-1)[0],'commit');
 const again=canvas();layout(root,again,640,360);assert.deepEqual(native.commands,again.commands);
});
test('row layout uses measured text widths and explicit rectangle dimensions',()=>{
 const native=canvas();layout({children:[{type:'View',props:{style:{flexDirection:'row',gap:8}},children:[text('ABC',{fontSize:14}),{type:'View',props:{style:{width:50,height:20,backgroundColor:'#FFFFFF'}},children:[]}]}]},native);
 assert.deepEqual(native.commands.find(c=>c[0]==='rect').slice(1,5),[44,0,50,20]);
});
test('unsupported DOM, styles, invalid colors/dimensions/text and oversized trees fail clearly',()=>{
 for(const node of [{type:'div',props:{},children:[]},text('ok',{fontSize:0}),text('ok',{width:NaN}),text('ok',{position:'absolute'}),text('non ASCII ☃'),text('x'.repeat(2049)),{type:'raw',text:'outside'}])assert.throws(()=>layout({children:[node]},canvas()));
 assert.throws(()=>color('red'));assert.equal(color('#AABBCC'),0xffaabbcc);
 let node=text('deep');for(let i=0;i<40;i++)node={type:'View',props:{},children:[node]};assert.throws(()=>layout({children:[node]},canvas()),/limit/);
});

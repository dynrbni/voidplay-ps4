// SPDX-License-Identifier: GPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,reduce,visible,catalog,tabs,keys} from '../apps/voidplay/model.mjs';
test('Cross opens detail, Circle restores route/focus, collections toggle without duplicates',()=>{
 let state=initial();state=reduce(state,'confirm');assert.equal(state.screen,'details');
 const id=state.detailId;state=reduce(state,'confirm');assert.deepEqual(state.favorites,[id]);
 state=reduce(state,'confirm');assert.deepEqual(state.favorites,[]);
 state=reduce(state,'right');state=reduce(state,'confirm');assert.deepEqual(state.library,[id]);
 state=reduce(state,'back');assert.equal(state.screen,'discover');assert.equal(state.zone,'content');
 assert.equal(visible({...state,screen:'library'}).length,1);
});
test('every header destination opens, boundaries hold, Circle never quits the console app',()=>{
 for(let i=0;i<tabs.length;i++){
  let state={...initial(),zone:'header',tab:i};state=reduce(state,'confirm');assert.equal(state.screen,tabs[i]);
  state=reduce(state,'back');assert.equal(state.zone,'header');state=reduce(state,'back');assert.equal(state.screen,'discover');
 }
 let state={...initial(),zone:'header',tab:0};assert.equal(reduce(state,'left').tab,0);
 state={...state,tab:tabs.length-1};assert.equal(reduce(state,'right').tab,tabs.length-1);
 assert.equal(reduce(initial(),'left').index,0);
});
test('search edits on-screen keys, filters real metadata, clears and enters results',()=>{
 let state={...initial(),screen:'search',zone:'keyboard',key:keys.indexOf('Z')};
 state=reduce(state,'confirm');assert.equal(state.query,'Z');
 state={...state,key:keys.indexOf('DEL')};state=reduce(state,'confirm');assert.equal(state.query,'');
 assert.equal(visible(state).length,catalog.length);
 state={...state,key:keys.indexOf('DONE')};state=reduce(state,'confirm');assert.equal(state.zone,'content');
 state=reduce(state,'confirm');assert.equal(state.screen,'details');state=reduce(state,'back');assert.equal(state.screen,'search');
 assert.deepEqual(visible({...state,query:'NO MATCH 99999'}),[]);
});
test('download/trailer information closes with Circle and never creates a transfer',()=>{
 let state=reduce(initial(),'confirm');state={...state,button:2};state=reduce(state,'confirm');assert.equal(state.modal,'download');
 state=reduce(state,'back');assert.equal(state.modal,'');assert.equal(state.screen,'details');
});

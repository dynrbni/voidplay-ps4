// SPDX-License-Identifier: GPL-3.0-only
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initial,reduce,visible,catalog,tabs,keys,related} from '../apps/voidplay/model.mjs';
import {parsePreferences,serializePreferences} from '../apps/voidplay/persistence.mjs';
import {detailLines} from '../apps/voidplay/detail-data.mjs';
const apply=(state,...actions)=>actions.reduce(reduce,state);
test('Cross opens native details; favorite/library stay separate; Circle restores hero focus',()=>{
 let state=apply(initial(),'confirm');assert.equal(state.screen,'details');
 state=apply(state,'right','confirm');assert.deepEqual(state.favorites,[catalog[0].id]);assert.deepEqual(state.library,[]);
 state=apply(state,'right','right','confirm');assert.deepEqual(state.library,[catalog[0].id]);
 state=apply(state,'back');assert.equal(state.screen,'discover');assert.equal(state.zone,'hero');
 state=apply(state,'down','favorite');assert.deepEqual(state.favorites,[]);assert.equal(state.library.length,1);
});
test('all header routes work, bounds hold, Circle never exits the PS4 app',()=>{
 for(let tab=0;tab<tabs.length;tab++){
  let state=reduce({...initial(),zone:'header',tab},'confirm');assert.equal(state.screen,tabs[tab]);
  state=apply(state,'back','back');assert.equal(state.screen,'discover');assert.equal(state.zone,'hero');
 }
 assert.equal(reduce({...initial(),zone:'header'},'left').tab,0);
 assert.equal(reduce({...initial(),zone:'header',tab:6},'right').tab,6);
});
test('filters search title, genre and description; sort is stable and does not mutate catalog',()=>{
 const entries=[{id:'b',title:'Beta',description:'Video tool',category:'Media',genres:[]},{id:'a',title:'Alpha',description:'Game',category:'Games',genres:['Racing']}];
 assert.deepEqual(visible({...initial(),screen:'browse',query:'racing'},entries).map(item=>item.id),['a']);
 assert.deepEqual(visible({...initial(),screen:'search',query:'video',category:'Games'},entries),[]);
 assert.deepEqual(visible({...initial(),screen:'browse',sort:'title'},entries).map(item=>item.id),['a','b']);assert.equal(entries[0].id,'b');
 let state={...initial(),screen:'browse',zone:'filters',filter:2};state=reduce(state,'confirm');assert.equal(state.sort,'title');
 state=reduce({...state,filter:3,query:'missing',category:'Games'},'confirm');assert.equal(state.query,'');assert.equal(state.category,'All');
});
test('controller keyboard edits bounded queries and returns to results without losing route',()=>{
 let state=apply({...initial(),screen:'search',zone:'filters'},'confirm');assert.equal(state.zone,'keyboard');
 state=reduce({...state,key:keys.indexOf('Z')},'confirm');assert.equal(state.query,'Z');
 state=reduce({...state,key:keys.indexOf('DEL')},'confirm');assert.equal(state.query,'');
 state=reduce({...state,key:keys.indexOf('DONE')},'confirm');assert.equal(state.zone,'content');
 state=apply(state,'confirm','back');assert.equal(state.screen,'search');assert.equal(state.zone,'content');
});
test('every detail section works with absent metadata, source/trailer actions cannot install',()=>{
 let state=apply(initial(),'confirm','up');assert.equal(state.zone,'detailtabs');
 for(let page=1;page<7;page++){state=reduce(state,'right');assert.equal(state.detailPage,page);assert.ok(detailLines(catalog[0],page));}
 state=apply(state,'back');assert.equal(state.detailPage,0);
 state=apply(state,'confirm');assert.equal(state.detailPage,3);assert.equal(state.jobs.length,0);
 state=apply(state,'down','confirm');assert.equal(state.modal,'source');state=reduce(state,'back');assert.equal(state.modal,'');
 assert.deepEqual(related(catalog[0]),[]);
});
test('explicit simulation supports pause/resume/cancel/retry/clear and never adds an installed item',()=>{
 let state=reduce({...initial(),screen:'downloads',zone:'content'},'confirm');assert.equal(state.jobs[0].status,'queued');
 state=reduce(state,{type:'tick'});assert.equal(state.jobs[0].status,'downloading');assert.ok(state.jobs[0].received>0);
 state=reduce(state,'confirm');assert.equal(state.jobs[0].status,'paused');const received=state.jobs[0].received;
 state=reduce(state,{type:'tick'});assert.equal(state.jobs[0].received,received);
 state=reduce(state,'confirm');assert.equal(state.jobs[0].status,'queued');
 state=apply(state,'right','confirm');assert.equal(state.jobs[0].status,'cancelled');
 state=apply(state,'left','confirm');assert.equal(state.jobs[0].received,0);
 for(let i=0;i<16;i++)state=reduce(state,{type:'tick'});
 assert.equal(state.jobs[0].status,'completed');assert.equal(state.library.length,0);
 state=apply(state,'down','confirm');assert.equal(state.jobs.length,0);
});
test('preferences round trip collections/motion, reject malformed data and never persist demo jobs',()=>{
 const saved=parsePreferences(serializePreferences({...initial(),favorites:['my-home'],reduceMotion:true}));assert.deepEqual(saved,{favorites:['my-home'],library:[],reduceMotion:true});
 for(const raw of ['{','{}','{"version":1,"favorites":["../etc"],"library":[],"reduceMotion":false}'])assert.throws(()=>parsePreferences(raw));
 assert.equal('jobs' in saved,false);
 const state=reduce({...initial(),screen:'settings',zone:'content'},'confirm');assert.equal(state.reduceMotion,true);
});

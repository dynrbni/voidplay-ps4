// SPDX-License-Identifier: GPL-3.0-only
import snapshot from './catalog.json' with { type: 'json' };
export const catalog=snapshot.entries;
export const revision=snapshot.revision;
export const tabs=['discover','browse','downloads','library','favorites','search','settings'];
export const keys=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','SPACE','DEL','CLEAR','DONE'];
export const initial=()=>({screen:'discover',zone:'content',tab:0,index:0,button:0,key:0,query:'',favorites:[],library:[],modal:'',returnScreen:'discover',detailId:''});
const clamp=(value,max)=>Math.max(0,Math.min(value,Math.max(0,max)));
export function visible(state){
 let entries=catalog;
 if(state.screen==='favorites')entries=entries.filter(entry=>state.favorites.includes(entry.id));
 if(state.screen==='library')entries=entries.filter(entry=>state.library.includes(entry.id));
 if(state.screen==='search')entries=entries.filter(entry=>(entry.title+' '+entry.genres.join(' ')).toLowerCase().includes(state.query.toLowerCase()));
 return entries;
}
export function reduce(state,action){
 if(!['left','right','up','down','confirm','back'].includes(action))return state;
 if(state.modal)return action==='back'||action==='confirm'?{...state,modal:''}:state;
 if(state.screen==='details'){
  if(action==='back')return{...state,screen:state.returnScreen,zone:'content',index:clamp(state.index,visible({...state,screen:state.returnScreen}).length-1)};
  if(action==='left'||action==='right')return{...state,button:clamp(state.button+(action==='left'?-1:1),3)};
  if(action==='confirm'){
   if(state.button<2){const key=state.button===0?'favorites':'library';return{...state,[key]:state[key].includes(state.detailId)?state[key].filter(id=>id!==state.detailId):[...state[key],state.detailId]};}
   return{...state,modal:state.button===2?'download':'trailer'};
  }return state;
 }
 if(action==='back')return state.zone==='header'?{...state,screen:'discover',tab:0,zone:'content',index:0}:{...state,zone:'header'};
 if(state.zone==='header'){
  if(action==='left'||action==='right')return{...state,tab:clamp(state.tab+(action==='left'?-1:1),tabs.length-1)};
  if(action==='confirm')return{...state,screen:tabs[state.tab],zone:tabs[state.tab]==='search'?'keyboard':'content',index:0};
  if(action==='down')return{...state,zone:state.screen==='search'?'keyboard':'content'};
  return state;
 }
 if(state.screen==='settings'){
  if(action==='up'&&state.index===0)return{...state,zone:'header'};
  if(action==='up'||action==='down')return{...state,index:clamp(state.index+(action==='up'?-1:1),2)};
  if(action==='confirm')return{...state,modal:['catalog','controls','about'][state.index]};
  return state;
 }
 if(state.screen==='downloads')return action==='up'?{...state,zone:'header'}:state;
 if(state.zone==='keyboard'){
  if(action==='up'&&state.key<10)return{...state,zone:'header'};
  if(action==='down'&&state.key>=30)return{...state,zone:'content',index:0};
  if(action==='left'||action==='right')return{...state,key:Math.floor(state.key/10)*10+clamp(state.key%10+(action==='left'?-1:1),9)};
  if(action==='up'||action==='down')return{...state,key:clamp(state.key+(action==='up'?-10:10),39)};
  if(action==='confirm'){
   const key=keys[state.key];
   if(key==='DONE')return{...state,zone:'content',index:0};
   return{...state,query:key==='DEL'?state.query.slice(0,-1):key==='CLEAR'?'':(state.query+(key==='SPACE'?' ':key)).slice(0,40),index:0};
  }return state;
 }
 const entries=visible(state),columns=state.screen==='discover'?6:state.screen==='search'?3:5;
 if(action==='up'&&state.index<columns)return{...state,zone:state.screen==='search'?'keyboard':'header'};
 if(action==='confirm'&&entries[state.index])return{...state,screen:'details',returnScreen:state.screen,detailId:entries[state.index].id,button:0};
 const movement={left:-1,right:1,up:-columns,down:columns}[action];
 return movement?{...state,index:clamp(state.index+movement,entries.length-1)}:state;
}

// SPDX-License-Identifier: GPL-3.0-only
import snapshot from './catalog.json' with { type: 'json' };
import {startDemo,advance,command} from './transfers.mjs';
import {detailLines} from './detail-data.mjs';
export const catalog=snapshot.entries;
export const revision=snapshot.revision;
export const tabs=['discover','browse','downloads','library','favorites','search','settings'];
export const categories=['All',...new Set(catalog.map(entry=>entry.category))];
export const detailTabs=['Overview','About','Information','Sources','Screenshots','Trailer','Related'];
export const keys=[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789','SPACE','DEL','CLEAR','DONE'];
export const initial=(saved={})=>({screen:'discover',zone:'hero',tab:0,index:0,button:0,key:0,query:'',category:'All',sort:'curated',filter:0,shelf:0,featuredId:catalog[0]?.id??'',favorites:[],library:[],reduceMotion:false,modal:'',returnScreen:'discover',returnZone:'hero',detailId:'',detailPage:0,scroll:0,jobs:[],jobButton:0,notice:'',...saved});
const clamp=(value,max)=>Math.max(0,Math.min(value,Math.max(0,max)));
export function visible(state,entries=catalog){
 if(state.screen==='favorites')entries=entries.filter(entry=>state.favorites.includes(entry.id));
 if(state.screen==='library')entries=entries.filter(entry=>state.library.includes(entry.id));
 if(state.screen==='discover'&&state.shelf>0)entries=entries.filter(entry=>entry.category===(state.shelf===1?'Utilities':'Media'));
 if(state.screen==='browse'||state.screen==='search'){
  const query=state.query.trim().toLowerCase();
  entries=entries.filter(entry=>(state.category==='All'||entry.category===state.category)&&[entry.title,entry.description,entry.category,...entry.genres].join(' ').toLowerCase().includes(query));
  if(state.sort==='title')entries=[...entries].sort((a,b)=>a.title.toLowerCase()<b.title.toLowerCase()?-1:a.title.toLowerCase()>b.title.toLowerCase()?1:0);
 }
 return entries;
}
export function related(entry,entries=catalog){const rest=entries.filter(item=>item.id!==entry?.id);const same=rest.filter(item=>item.category===entry?.category);return same.length?same:rest;}
export function openDetail(state,entry){return entry?{...state,screen:'details',returnScreen:state.screen,returnZone:state.zone,detailId:entry.id,button:0,detailPage:0,scroll:0,zone:'detail'}:state;}
function route(state,tab){return{...state,screen:tabs[tab],tab,zone:tab===0?'hero':tab===1||tab===5?'filters':'content',index:0,button:0,scroll:0};}
function toggle(state,key,id){return{...state,[key]:state[key].includes(id)?state[key].filter(value=>value!==id):[...state[key],id]};}
export function reduce(state,action){
 if(typeof action==='object'){
  if(action.type==='notice')return{...state,notice:action.message};
  if(action.type==='tick'){const jobs=advance(state.jobs);return jobs===state.jobs?state:{...state,jobs};}
  return state;
 }
 if(!['left','right','up','down','confirm','back','favorite'].includes(action))return state;
 if(state.modal){
  if(action==='left'||action==='right')return{...state,scroll:clamp(state.scroll+(action==='left'?-1:1),50)};
  return action==='back'||action==='confirm'?{...state,modal:'',scroll:0}:state;
 }
 if(state.zone==='keyboard'){
  if(action==='back')return{...state,zone:'filters'};
  if(action==='up'||action==='down')return{...state,key:clamp(state.key+(action==='up'?-10:10),39)};
  if(action==='left'||action==='right')return{...state,key:Math.floor(state.key/10)*10+clamp(state.key%10+(action==='left'?-1:1),9)};
  if(action==='confirm'){
   const key=keys[state.key];if(key==='DONE')return{...state,zone:'content',index:0};
   return{...state,query:key==='DEL'?state.query.slice(0,-1):key==='CLEAR'?'':(state.query+(key==='SPACE'?' ':key)).slice(0,40),index:0};
  }return state;
 }
 if(state.screen==='details'){
  const entry=catalog.find(item=>item.id===state.detailId);
  if(action==='back')return state.detailPage?{...state,detailPage:0,zone:'detail',scroll:0}:{...state,screen:state.returnScreen,zone:state.returnZone,index:clamp(state.index,visible({...state,screen:state.returnScreen}).length-1)};
  if(state.zone==='detailtabs'){
   if(action==='left'||action==='right')return{...state,detailPage:clamp(state.detailPage+(action==='left'?-1:1),detailTabs.length-1),scroll:0};
   if(action==='confirm'||action==='down')return{...state,zone:'detail',scroll:0};
   return state;
  }
  if(action==='up'&&state.scroll===0)return{...state,zone:'detailtabs'};
  if(state.detailPage===0){
   if(action==='left'||action==='right')return{...state,button:clamp(state.button+(action==='left'?-1:1),3)};
   if(action==='down')return{...state,detailPage:1,zone:'detailtabs',scroll:0};
   if(action==='confirm'){
    if(state.button===1)return toggle(state,'favorites',entry.id);
    if(state.button===3)return toggle(state,'library',entry.id);
    if(state.button===2)return{...state,detailPage:1,zone:'detailtabs'};
    return{...state,detailPage:3,zone:'detailtabs',scroll:0};
   }return state;
  }
  if(state.detailPage===6){
   const list=related(entry);
   if(action==='favorite'&&list[state.scroll])return toggle(state,'favorites',list[state.scroll].id);
   if(action==='left'||action==='right')return{...state,scroll:clamp(state.scroll+(action==='left'?-1:1),list.length-1)};
   if(action==='confirm'&&list[state.scroll])return{...state,detailId:list[state.scroll].id,detailPage:0,scroll:0};
  }else if(state.detailPage===4){
   if(action==='left'||action==='right')return{...state,scroll:clamp(state.scroll+(action==='left'?-1:1),(entry.screenshots?.length??0)-1)};
  }else if(action==='up'||action==='down')return{...state,scroll:clamp(state.scroll+(action==='up'?-1:1),detailLines(entry,state.detailPage).length-16)};
  if(action==='confirm'&&state.detailPage===3)return{...state,modal:'source',scroll:0};
  if(action==='confirm'&&state.detailPage===5)return{...state,modal:'trailer',scroll:0};
  return state;
 }
 if(action==='back')return state.zone==='header'?route(state,0):{...state,zone:'header'};
 if(state.zone==='header'){
  if(action==='left'||action==='right')return{...state,tab:clamp(state.tab+(action==='left'?-1:1),6)};
  if(action==='confirm')return route(state,state.tab);
  if(action==='down')return{...state,zone:state.screen==='discover'?'hero':['browse','search'].includes(state.screen)?'filters':'content'};
  return state;
 }
 if(state.screen==='settings'){
  if(action==='up'&&state.index===0)return{...state,zone:'header'};
  if(action==='up'||action==='down')return{...state,index:clamp(state.index+(action==='up'?-1:1),6)};
  if(action==='confirm'){
   if(state.index===6&&catalog[0])return{...route(state,2),jobs:startDemo(state.jobs,catalog[0].id)};
   return state.index===0?{...state,reduceMotion:!state.reduceMotion}:{...state,modal:['','catalog','collections','storage','controls','about'][state.index]};
  }
  return state;
 }
 if(state.screen==='downloads'){
  const finished=state.jobs.some(job=>['completed','cancelled'].includes(job.status));
  if(action==='up'&&state.index===0)return{...state,zone:'header'};
  if(action==='up'||action==='down')return{...state,index:clamp(state.index+(action==='up'?-1:1),state.jobs.length-(finished?0:1))};
  if(action==='left'||action==='right')return{...state,jobButton:clamp(state.jobButton+(action==='left'?-1:1),2)};
  if(action==='confirm'){
   if(state.jobs.length===0&&catalog[0])return{...state,jobs:startDemo(state.jobs,catalog[0].id)};
   if(state.index===state.jobs.length)return{...state,jobs:state.jobs.filter(job=>!['completed','cancelled'].includes(job.status)),index:0};
   const job=state.jobs[state.index];if(!job)return state;
   if(state.jobButton===1&&['completed','cancelled'].includes(job.status))return{...state,jobs:state.jobs.filter(value=>value.id!==job.id),index:0};
   if(state.jobButton===2)return openDetail(state,catalog.find(entry=>entry.id===job.id));
   return{...state,jobs:command(state.jobs,job.id,state.jobButton===1?'cancel':job.status==='paused'?'resume':['completed','cancelled'].includes(job.status)?'retry':'pause')};
  }return state;
 }
 if(state.zone==='filters'){
  if(action==='up')return{...state,zone:'header'};
  if(action==='down')return{...state,zone:'content',index:0};
  if(action==='left'||action==='right')return{...state,filter:clamp(state.filter+(action==='left'?-1:1),3)};
  if(action==='confirm'){
   if(state.filter===0)return{...state,zone:'keyboard',key:0};
   if(state.filter===1)return{...state,category:categories[(categories.indexOf(state.category)+1)%categories.length],index:0};
   if(state.filter===2)return{...state,sort:state.sort==='curated'?'title':'curated',index:0};
   return{...state,query:'',category:'All',sort:'curated',index:0};
  }return state;
 }
 if(state.screen==='discover'&&state.zone==='hero'){
  if(action==='up')return{...state,zone:'header'};
  if(action==='down')return{...state,zone:'content',shelf:0,index:0};
  if(action==='left'||action==='right')return{...state,button:action==='left'?0:1};
  if(action==='confirm')return state.button===1?toggle(state,'favorites',state.featuredId):openDetail(state,catalog.find(entry=>entry.id===state.featuredId));
  return state;
 }
 const entries=visible(state);
 if(action==='favorite'&&entries[state.index])return toggle(state,'favorites',entries[state.index].id);
 if(state.screen==='discover'){
  if(action==='up')return state.shelf===0?{...state,zone:'hero',button:0}:{...state,shelf:state.shelf-1,index:0};
  if(action==='down')return{...state,shelf:clamp(state.shelf+1,2),index:0};
 }else if(action==='up'&&state.index<6)return{...state,zone:['browse','search'].includes(state.screen)?'filters':'header'};
 if(action==='confirm')return entries[state.index]?openDetail(state,entries[state.index]):state.screen==='favorites'||state.screen==='library'?route(state,1):{...state,zone:'filters'};
 const movement={left:-1,right:1,up:-6,down:6}[action];
 if(!movement)return state;
 const index=clamp(state.index+movement,entries.length-1);
 return{...state,index,...(state.screen==='discover'&&entries[index]?{featuredId:entries[index].id}:{})};
}

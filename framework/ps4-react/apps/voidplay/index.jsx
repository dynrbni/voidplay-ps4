// SPDX-License-Identifier: GPL-3.0-only
import {useEffect,useReducer,useRef,useState} from 'react';
import {AppRegistry,View,Controller,Preferences} from '@ps4-react/core';
import {initial,reduce} from './model.mjs';
import {parsePreferences,serializePreferences} from './persistence.mjs';
import {Header,Home,Catalog,Details,Downloads,Settings,Keyboard,Modal,Background} from './screens.jsx';
import {Box,Label,muted} from './ui.jsx';
function restore(){try{return initial(parsePreferences(Preferences.load()));}catch(error){return initial({notice:error.message,canPersist:false});}}
function App(){
 const[state,dispatch]=useReducer(reduce,undefined,restore);
 const saved=serializePreferences(state),lastSaved=useRef(saved);
 const[shade,setShade]=useState(0);
 useEffect(()=>Controller.subscribe(action=>dispatch(action)),[]);
 useEffect(()=>{
  if(lastSaved.current===saved||state.canPersist===false)return;
  lastSaved.current=saved;
  try{Preferences.save(saved);}catch(error){dispatch({type:'notice',message:error.message});}
 },[saved,state.canPersist]);
 const active=state.jobs.some(job=>job.status==='queued'||job.status==='downloading');
 useEffect(()=>{if(!active)return;let timer;const tick=()=>{dispatch({type:'tick'});timer=setTimeout(tick,1000);};timer=setTimeout(tick,1000);return()=>clearTimeout(timer);},[active]);
 useEffect(()=>{
  if(state.reduceMotion){setShade(0);return;}
  setShade(80);const first=setTimeout(()=>setShade(36),65),last=setTimeout(()=>setShade(0),130);
  return()=>{clearTimeout(first);clearTimeout(last);};
 },[state.screen,state.detailPage,state.featuredId,state.reduceMotion]);
 return <View style={{width:1920,height:1080,backgroundColor:'#050505'}}>
  <Background state={state}/>
  {state.screen==='discover'?<Home state={state}/>:state.screen==='details'?<Details state={state}/>:state.screen==='downloads'?<Downloads state={state}/>:state.screen==='settings'?<Settings state={state}/>:<Catalog state={state}/>}
  {shade>0&&<Box w={1920} h={1080} color={'#050505'+shade.toString(16).padStart(2,'0')}/>}
  <Header state={state}/>
  <Box y={1040} w={1920} h={40} color="#050505EB"><Label x={80} y={10} size={17} color={muted}>X Select / O Back / D-pad or left stick Move / Triangle Favorite</Label><Label x={1510} y={10} size={17} w={350} color={muted}>VOIDPLAY [BETA] / 01.03</Label></Box>
  {state.notice&&<Box x={80} y={1005} w={1740} h={32} color="#343434"><Label x={12} y={7} size={17}>{state.notice.slice(0,140)}</Label></Box>}
  {state.zone==='keyboard'&&<Keyboard state={state}/>}
  {state.modal&&<Modal state={state}/>}
 </View>;
}
AppRegistry.registerComponent('voidplay',()=>App);

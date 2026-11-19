// SPDX-License-Identifier: GPL-3.0-only
import {useEffect,useReducer,useRef} from 'react';
import {AppRegistry,View,Controller,Preferences,Motion,Scroll,Diagnostics} from '@ps4-react/core';
import {initial,reduce} from './model.mjs';
import {parsePreferences,serializePreferences} from './persistence.mjs';
import {Header,Footer,Page,Background,Discover,Catalog,Details,Downloads,Settings,Keyboard,Modal} from './screens.jsx';
import {Label,Row,at} from './ui.jsx';
import {color,layout,content} from './theme.mjs';

function restore(){
  try{return initial(parsePreferences(Preferences.load()));}
  catch(error){return initial({notice:error.message,canPersist:false});}
}
function Screen({state}){
  if(state.screen==='discover')return <Discover state={state}/>;
  if(state.screen==='details')return <Details state={state}/>;
  if(state.screen==='downloads')return <Downloads state={state}/>;
  if(state.screen==='settings')return <Settings state={state}/>;
  return <Catalog state={state}/>;
}
function App(){
  const [state,dispatch]=useReducer(reduce,undefined,restore);
  const saved=serializePreferences(state),lastSaved=useRef(saved);
  useEffect(()=>Controller.subscribe(action=>dispatch(action)),[]);
  /* The page owns its scroll position, so the header reacts to the framework's
     reported offset instead of repeating that arithmetic per screen. */
  useEffect(()=>Scroll.subscribe(offsets=>{
    const page=Object.keys(offsets).filter(key=>key.indexOf('page:')===0);
    if(!page.length)return;
    const lowest=offsets[page[0]];
    dispatch({type:'scrolled',value:lowest>24});
  }),[]);
  useEffect(()=>{
    if(lastSaved.current===saved||state.canPersist===false)return;
    lastSaved.current=saved;
    try{Preferences.save(saved);}catch(error){dispatch({type:'notice',message:error.message});}
  },[saved,state.canPersist]);
  const active=state.jobs.some(job=>job.status==='queued'||job.status==='downloading');
  useEffect(()=>{if(!active)return;let timer;const tick=()=>{dispatch({type:'tick'});timer=setTimeout(tick,1000);};timer=setTimeout(tick,1000);return()=>clearTimeout(timer);},[active]);
  useEffect(()=>Motion.setEnabled(!state.reduceMotion),[state.reduceMotion]);
  useEffect(()=>{console.log('renderer '+Diagnostics.report());},[]);
  const transfers=state.jobs.filter(job=>job.status==='downloading'||job.status==='queued').length;
  return <View style={{width:layout.width,height:layout.height,backgroundColor:color.background}}>
    <Background state={state}/>
    <Page state={state}><Screen state={state}/></Page>
    <Header state={state} counts={{transfers}}/>
    <Footer/>
    {state.notice?<View style={at(content.gutter,layout.height-layout.footerHeight-42,content.inner,34,{backgroundColor:'#343434'})}>
      <Row x={12} y={8} w={content.inner-24} gap={0}>
        <Label style={{fontSize:16,lineHeight:18,fontWeight:400}} w={content.inner-24} h={18}>{state.notice.slice(0,150)}</Label>
      </Row>
    </View>:null}
    {state.zone==='keyboard'?<Keyboard state={state}/>:null}
    {state.modal?<Modal state={state}/>:null}
  </View>;
}
AppRegistry.registerComponent('voidplay',()=>App);

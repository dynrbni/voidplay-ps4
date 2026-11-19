// SPDX-License-Identifier: GPL-3.0-only
// Test-only overflow data; neither this fixture nor its entries ship in a PKG.
import {useEffect,useReducer} from 'react';
import {AppRegistry,Controller,Motion,View} from '@ps4-react/core';
import {Discover,Page,Header} from '../../apps/voidplay/screens.jsx';
import {initial,reduceCatalog,catalog} from '../../apps/voidplay/model.mjs';
const entries=Array.from({length:60},(_,index)=>({...catalog[0],id:'fixture-'+index,title:'TEST ONLY '+index,category:index%2?'Media':'Utilities'}));
function App(){
 const[state,dispatch]=useReducer((state,action)=>reduceCatalog(state,action,entries),initial());
 useEffect(()=>Controller.subscribe(dispatch),[]);
 useEffect(()=>Motion.setEnabled(false),[]);
 return <View style={{width:1920,height:1080,backgroundColor:'#050505'}}><Page state={state}><Discover state={state} entries={entries}/></Page><Header state={state} counts={{transfers:0}}/></View>;
}
AppRegistry.registerComponent('parity-test',()=>App);

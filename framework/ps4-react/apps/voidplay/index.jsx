// SPDX-License-Identifier: GPL-3.0-only
import { useEffect, useReducer } from 'react';
import { AppRegistry, View, Text, Image, Controller } from '@ps4-react/core';
import { catalog, revision, tabs, keys, initial, reduce, visible } from './model.mjs';
import artwork from './assets/manifest.json';

const white='#FFFFFF',muted='#B4B8C0';
const ascii=value=>Array.isArray(value)?value.map(ascii).join(''):String(value??'').normalize('NFKD').replace(/[^\x20-\x7e\n]/g,'');
const cut=(value,max)=>ascii(value).slice(0,max)+(ascii(value).length>max?'...':'');
function wrap(value,width,maxLines=5){const words=ascii(value).split(/\s+/);let lines=[''];for(const word of words){if((lines.at(-1)+' '+word).trim().length>width)lines.push(word);else lines[lines.length-1]=(lines.at(-1)+' '+word).trim();}return lines.slice(0,maxLines).join('\n');}
const at=(x,y,w,h,extra={})=>({position:'absolute',left:x,top:y,width:w,height:h,...extra});
function Label({x,y,w=1700,size=28,color=white,children}){return <Text style={at(x,y,w,Math.ceil(size*1.6)*6,{fontSize:size,color})}>{ascii(children)}</Text>;}
function Box({x,y,w,h,color='#181C23',children}){return <View style={at(x,y,w,h,{backgroundColor:color})}>{children}</View>;}
function Button({x,y,w=280,label,focused=false}){return <Box x={x} y={y} w={w} h={68} color={focused?white:'#20252D'}><Label x={22} y={19} w={w-30} size={25} color={focused?'#08090B':white}>{label}</Label></Box>;}
function Cover({entry,x,y,w,h}){const asset=artwork.covers[entry.id]?.asset;return asset?<Image source={asset} style={at(x,y,w,h)}/>:<Box x={x} y={y} w={w} h={h}><Label x={20} y={50} w={w-40} size={25}>{wrap(entry.title||entry.id,16)}</Label></Box>;}
function Header({state}){
 const positions=[380,550,710,940,1210,1450,1640],labels=['Discover','Browse','Downloads','Library','Favorites','Search','Settings'];
 return <>
  <Label x={72} y={45} w={255} size={48}>voidplay.</Label><Box x={275} y={48} w={72} h={32} color={white}><Label x={10} y={8} w={65} size={16} color="#08090B">BETA</Label></Box>
  {tabs.map((tab,i)=><View key={tab} style={at(positions[i],40,i===2?215:170,55,{backgroundColor:state.zone==='header'&&state.tab===i?white:state.screen===tab?'#252A32':'#0D1117'})}><Label x={18} y={16} w={205} size={25} color={state.zone==='header'&&state.tab===i?'#08090B':state.screen===tab?white:muted}>{labels[i]}</Label></View>)}
 </>;
}
function Cards({entries,state,y=275}){
 const columns=state.screen==='discover'?6:5,pageSize=columns*(state.screen==='discover'?1:2),page=Math.floor(state.index/pageSize),start=page*pageSize;
 return entries.slice(start,start+pageSize).map((entry,i)=>{
  const index=start+i,x=76+(i%columns)*(state.screen==='discover'?290:350),top=y+Math.floor(i/columns)*340;
  const focused=state.zone==='content'&&state.index===index,w=state.screen==='discover'?246:296,h=state.screen==='discover'?240:260;
  return <View key={entry.id} style={at(x,top,w+12,h+74)}>
   <Box x={0} y={0} w={w+12} h={h+12} color={focused?white:'#222831'}/><Cover entry={entry} x={6} y={6} w={w} h={h}/>
   <Label x={0} y={h+28} w={w+15} size={23} color={focused?white:muted}>{cut(entry.title||entry.id,23)}</Label>
   {state.favorites.includes(entry.id)&&<Label x={w-30} y={20} w={40} size={28}>+</Label>}
  </View>;
 });
}
function Empty({title,message}){return <><Label x={80} y={300} size={54}>{title}</Label><Label x={80} y={390} size={29} color={muted}>{wrap(message,80)}</Label></>;}
function Details({state}){
 const entry=catalog.find(value=>value.id===state.detailId);if(!entry)return null;
 const favorite=state.favorites.includes(entry.id),saved=state.library.includes(entry.id);
 return <>
  <Label x={80} y={160} size={20} color={muted}>CATALOG / {entry.category.toUpperCase()}</Label>
  <Label x={80} y={215} w={1050} size={70}>{wrap(entry.title||entry.id,28,2)}</Label>
  <Label x={80} y={425} w={1000} size={29} color={muted}>{wrap(entry.description||entry.summary||'No description has been published for this entry.',62,4)}</Label>
  <Cover entry={entry} x={1370} y={190} w={390} h={488}/>
  <Label x={80} y={635} size={25}>{[entry.category,entry.author,entry.version&&'Version '+entry.version].filter(Boolean).join('  /  ')}</Label>
  <Label x={80} y={685} size={23} color={muted}>{cut(entry.genres.join(' / ')||'Genre not supplied',100)}</Label>
  <Label x={80} y={730} size={22} color={muted}>Metadata from your catalog. Package compatibility is not checked by this build.</Label>
  {[favorite?'Remove favorite':'Add favorite',saved?'Remove from library':'Save to library','Download info','Trailer info'].map((label,i)=><Button key={label} x={80+i*365} y={850} w={340} label={label} focused={state.button===i}/>)}
 </>;
}
function Body({state}){
 const entries=visible(state),hero=catalog[0];
 if(state.screen==='details')return <Details state={state}/>;
 if(state.screen==='discover')return hero?<>
  <Label x={80} y={165} size={22} color={muted}>DISCOVER ON VOIDPLAY</Label>
  <Label x={80} y={220} w={1070} size={72}>{wrap(hero.title||hero.id,28,2)}</Label>
  <Label x={80} y={420} w={1050} size={28} color={muted}>{wrap(hero.summary||hero.description||'Explore your published catalog.',60,2)}</Label>
  <Button x={80} y={535} label="X   View game" focused={false}/>
  <Cover entry={hero} x={1370} y={165} w={300} h={375}/>
  <Label x={80} y={650} size={32}>Your catalog</Label><Label x={1450} y={660} w={400} size={21} color={muted}>{catalog.length} published / revision {revision}</Label>
  <Cards entries={entries} state={state} y={710}/>
 </>:<Empty title="Your catalog is empty" message="Publish a game or app in the owner dashboard, then rebuild this offline console package."/>;
 if(state.screen==='downloads')return <Empty title="No downloads yet" message="You can browse this native beta. File downloads and installation are not enabled in this build."/>;
 if(state.screen==='settings')return <>
  <Label x={80} y={180} size={60}>Settings</Label><Label x={80} y={280} size={28} color={muted}>Voidplay [BETA] / Native console preview 01.02</Label>
  {['Catalog snapshot','Controller guide','About Voidplay'].map((label,i)=><Button key={label} x={80} y={380+i*110} w={680} label={label} focused={state.zone==='content'&&state.index===i}/>)}
  <Label x={80} y={805} size={24} color={muted}>Favorites and Library are kept for this session. Console storage is not queried.</Label>
 </>;
 if(state.screen==='search')return <>
  <Label x={80} y={155} size={48}>Search</Label><Box x={80} y={235} w={1720} h={75}><Label x={22} y={20} size={30}>{state.query||'Enter a title or genre using the keyboard below'}</Label></Box>
  {keys.map((key,i)=><Button key={key} x={80+i%10*170} y={345+Math.floor(i/10)*82} w={153} label={key} focused={state.zone==='keyboard'&&state.key===i}/>)}
  <Label x={80} y={710} size={24} color={muted}>{entries.length} results / Down from the last keyboard row to browse results</Label>
  {entries.slice(Math.floor(state.index/3)*3,Math.floor(state.index/3)*3+3).map((entry,i)=><Box key={entry.id} x={80+i*575} y={785} w={540} h={120} color={state.zone==='content'&&state.index%3===i?white:'#20252D'}><Label x={20} y={30} w={500} size={27} color={state.zone==='content'&&state.index%3===i?'#08090B':white}>{cut(entry.title||entry.id,32)}</Label></Box>)}
 </>;
 return <>
  <Label x={80} y={165} size={58}>{state.screen==='browse'?'Browse':state.screen==='library'?'Library':'Favorites'}</Label>
  <Label x={80} y={250} size={25} color={muted}>{entries.length} {entries.length===1?'title':'titles'} / {state.screen==='browse'?'Published games and apps':'Saved for this session'}</Label>
  {entries.length?<Cards entries={entries} state={state} y={320}/>:<Empty title={state.screen==='favorites'?'No favorites yet':'Your library is empty'} message="Open a game or app and use its favorite or library action to save it here."/>}
 </>;
}
function Modal({state}){
 const entry=catalog.find(value=>value.id===state.detailId);
 const messages={download:'Native downloads are not enabled in this beta. No package was downloaded or installed.',trailer:entry?.trailerUrl?'Trailer saved in the catalog. Native YouTube playback is not available yet.':'No trailer has been published for this entry.',catalog:`Offline published catalog revision ${revision}. Rebuild the PKG to refresh it. The console does not fetch the catalog yet.`,controls:'X opens or confirms. O goes back. D-pad and the LEFT analog stick move focus. Up from the first item selects the header. Close the app using the PS menu.',about:'Voidplay [BETA] 01.02. Native React / QuickJS / OpenOrbis. The 01.01 startup was confirmed by the owner; this larger build needs its own console check.'};
 return <Box x={340} y={300} w={1240} h={460} color="#20252D"><Label x={55} y={55} w={1120} size={44}>{state.modal==='download'?'Download information':state.modal==='trailer'?'Trailer':state.modal==='controls'?'Controller guide':state.modal==='catalog'?'Catalog snapshot':'About Voidplay'}</Label><Label x={55} y={155} w={1120} size={29} color={muted}>{wrap(messages[state.modal],72)}</Label><Label x={55} y={365} size={24}>O   Back       X   Close</Label></Box>;
}
function App(){
 const[state,dispatch]=useReducer(reduce,undefined,initial);
 useEffect(()=>Controller.subscribe(action=>dispatch(action)),[]);
 return <View style={{width:1920,height:1080,backgroundColor:'#090B0F'}}>
  <Image source="backdrop" style={at(0,0,1920,1080)}/>
  <Header state={state}/><Body state={state}/>
  <Box x={0} y={1020} w={1920} h={60} color="#090B0F"><Label x={80} y={18} size={22} color={muted}>X   Open / Select      O   Back      D-pad / Left stick   Move</Label><Label x={1460} y={18} w={420} size={20} color={muted}>VOIDPLAY [BETA]  /  01.02</Label></Box>
  {state.modal&&<Modal state={state}/>}
 </View>;
}
AppRegistry.registerComponent('voidplay',()=>App);

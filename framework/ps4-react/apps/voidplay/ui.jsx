// SPDX-License-Identifier: GPL-3.0-only
import {View,Text,Image} from '@ps4-react/core';
import {ascii,cut,wrap} from './format.mjs';
import artwork from './assets/manifest.json';
export const white='#FFFFFF',muted='#B0B0B0';
export const at=(x,y,w,h,extra={})=>({position:'absolute',left:x,top:y,width:w,height:h,...extra});
export function Label({x,y,w=1740,size=26,color=white,children}){return <Text style={at(x,y,w,200,{fontSize:size,color})}>{ascii(children)}</Text>;}
export function Box({x=0,y=0,w,h,color='#171717',radius=0,border=0,borderColor=white,children}){return <View style={at(x,y,w,h,{backgroundColor:color,borderRadius:radius,borderWidth:border,borderColor})}>{children}</View>;}
export function Icon({name,x,y,size=28}){return <Image source={'icon-'+name} style={at(x,y,size,size)}/>;}
export function Button({x,y,w=280,h=60,label,focused=false,primary=false,icon}){
 return <Box x={x} y={y} w={w} h={h} radius={primary?30:8} border={focused?3:1} borderColor={focused?white:'#FFFFFF40'} color={primary?'#FFFFFF':'#242424'}>
  {icon&&<Icon name={icon} x={20} y={Math.floor((h-26)/2)} size={26}/>}
  <Label x={icon?60:22} y={Math.floor((h-26)/2)} w={w-35} size={24} color={primary?'#101010':white}>{label}</Label>
 </Box>;
}
export function Round({x,y,name,focused=false,filled=false}){return <Box x={x} y={y} w={60} h={60} radius={30} border={focused?3:1} borderColor={focused?white:'#FFFFFF70'} color={focused?'#FFFFFF24':'#05050570'}><Icon name={filled?'heart-filled':name} x={16} y={16}/></Box>;}
export const binding=entry=>artwork.covers[entry?.id];
export function Cover({entry,x,y,w,h}){const asset=binding(entry)?.asset;return asset?<Image source={asset} style={at(x,y,w,h)}/>:<Box x={x} y={y} w={w} h={h}><Label x={20} y={40} w={w-40} size={25}>{wrap(entry?.title||entry?.id||'Artwork unavailable',18,4)}</Label></Box>;}
export function HeroArt({entry}){return <Image source={binding(entry)?.asset?binding(entry).asset+'-hero':'backdrop'} style={at(0,0,1920,1080)}/>;}
export function Cards({entries,state,y=415,index=state.index,columns=6,limit=12}){
 const start=Math.floor(index/limit)*limit;
 return entries.slice(start,start+limit).map((entry,i)=>{
  const x=80+i%columns*296,top=y+Math.floor(i/columns)*330,focused=state.zone==='content'&&index===start+i,w=264,h=264,lift=focused&&!state.reduceMotion?4:0;
  return <View key={entry.id} style={at(x,top-lift,w,322)}>
   <Box x={-9} y={-9} w={w+18} h={h+18} radius={14} color={focused?'#FFFFFF18':'#FFFFFF00'}/>
   <Box x={-4} y={-4} w={w+8} h={h+8} radius={10} color={focused?white:'#292929'}/><Cover entry={entry} x={0} y={0} w={w} h={h}/>
   <Label x={0} y={h+14} w={w-25} size={21}>{cut(entry.title||entry.id,23)}</Label>
   <Label x={0} y={h+44} w={w-30} size={18} color={muted}>{cut(entry.category,25)}</Label>
   <Icon name={state.favorites.includes(entry.id)?'heart-filled':'heart'} x={w-27} y={h+19} size={22}/>
  </View>;
 });
}
export function Empty({title,message,button='Browse applications',focused=true}){return <><Icon name="search" x={80} y={360} size={44}/><Label x={80} y={440} size={44}>{title}</Label><Label x={80} y={520} size={26} color={muted}>{wrap(message,90,3)}</Label><Button x={80} y={675} label={button} w={330} focused={focused} primary/></>;}

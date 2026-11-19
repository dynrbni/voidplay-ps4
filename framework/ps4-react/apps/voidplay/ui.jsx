// SPDX-License-Identifier: GPL-3.0-only
import {View,Text,Image,ScrollView} from '@ps4-react/core';
import {ascii,cut} from './format.mjs';
import {color,type,layout,weight as fontWeight,content} from './theme.mjs';
import artwork from './assets/manifest.json';

/* Absolute helpers stay available for overlays and full-bleed artwork; page
   content uses the flow containers below so heights come from measurement. */
export const at=(x,y,w,h,extra={})=>({position:'absolute',left:x,top:y,width:w,height:h,...extra});
export const join=(...values)=>values.filter(Boolean).map(ascii).join(' ');
/* Flow containers are the default: inside a centred page they inherit their
   horizontal position from the page, so no screen repeats the gutter maths. */
export function Column({x,y,w,h,gap=0,pad=0,align,justify,children,anchor}){
  return <View anchor={anchor} style={{...(x===undefined&&y===undefined?{}:{position:'absolute',left:x??0,top:y??0}),width:w,height:h,padding:pad,gap,alignItems:align,justifyContent:justify,flexDirection:'column'}}>{children}</View>;
}
export function Row({x,y,w,h,gap=0,align='flex-start',justify,children,anchor}){
  return <View anchor={anchor} style={{...(x===undefined&&y===undefined?{}:{position:'absolute',left:x??0,top:y??0}),width:w,height:h,gap,alignItems:align,justifyContent:justify,flexDirection:'row'}}>{children}</View>;
}
export function Spacer({h}){return <View style={{height:h}}/>;}
/* Passing x/y pins a label like the absolute helpers, so text can sit on the
   fixed rails as well as in the measured page flow. */
export function Label({children,style=type.body,w,h,lines,x,y,align,color:ink=color.white,anchor}){
  const place=x===undefined&&y===undefined?{}:at(x??0,y??0,w,h);
  return <Text anchor={anchor} style={{...style,...place,width:w,height:h,color:ink,numberOfLines:lines,textAlign:align}}>{ascii(children)}</Text>;
}
export function Body({children,w,lines,style=type.body,color:ink=color.secondary,anchor}){
  return <Label style={style} w={w} h={undefined} lines={lines} color={ink} anchor={anchor}>{children}</Label>;
}
export function Rule({w=content.inner,color:ink=color.line}){return <View style={{width:w,height:1,backgroundColor:ink}}/>;}
export function Surface({x,y,w,h,radius=layout.radius,tone=color.surface,borderWidth=0,borderColor=color.white,align,justify,children,anchor}){
  return <View anchor={anchor} style={{...(x===undefined&&y===undefined?{}:{position:'absolute',left:x??0,top:y??0}),width:w,height:h,backgroundColor:tone,borderRadius:radius,borderWidth,borderColor,alignItems:align,justifyContent:justify}}>{children}</View>;
}
/* Focus ring mirrors the web's 3px white outline around the focused control. */
export function Ring({x,y,w,h,radius=layout.radius,visible}){
  if(!visible)return null;
  return <View style={at(x-4,y-4,w+8,h+8,{borderRadius:radius+4,borderWidth:layout.focusWidth,borderColor:color.white})}/>;
}
export function Icon({name,x,y,size=20,filled=false}){
  const source='icon-'+(name==='heart'&&filled?'heart-filled':name);
  if(x===undefined&&y===undefined)return <View style={{width:size,height:size}}><Image source={source} style={{width:size,height:size}}/></View>;
  return <Image source={source} style={at(x,y,size,size)}/>;
}
export function Button({w=280,h=46,label,icon,focused=false,primary=false,chip=false,transparent=false,textStyle,anchor}){
  const tone=transparent?'#00000000':primary?color.white:color.raised, ink=primary?color.ink:color.white;
  return <View anchor={anchor} style={{width:w,height:h}}>
    <Surface w={w} h={h} radius={chip?20:primary?h/2:layout.radius} tone={tone} borderWidth={focused||primary||chip||transparent?0:1} borderColor="#FFFFFF29"
      align='center' justify='center'>
      {icon?<Icon name={icon} x={primary?22:18} y={Math.floor((h-20)/2)} size={20}/>:null}
      <Label style={textStyle??{...type.nav,fontWeight:primary?550:fontWeight.medium}} w={w} align='center'
        color={ink}>{label}</Label>
    </Surface>
    {focused?<Ring x={0} y={0} w={w} h={h} radius={chip?20:primary?h/2:layout.radius} visible/>:null}
  </View>;
}
export function Round({size=44,name,focused=false,filled=false,subtle=false,anchor}){
  return <View anchor={anchor} style={{width:size,height:size}}>
    <Surface w={size} h={size} radius={size/2} tone={subtle?'#00000000':'#05050566'} borderWidth={subtle?0:1} borderColor="#FFFFFF70">
      <Icon name={name} x={Math.floor((size-20)/2)} y={Math.floor((size-20)/2)} size={20} filled={filled}/>
    </Surface>
    {focused?<Ring x={0} y={0} w={size} h={size} radius={size/2} visible/>:null}
  </View>;
}
export function Progress({w,value}){
  return <View style={{width:w,height:4}}>
    <Surface w={w} h={4} radius={2} tone="#303030"/>
    <View style={at(0,0,Math.max(4,Math.round(w*Math.max(0,Math.min(1,value)))),4)}>
      <Surface w={Math.max(4,Math.round(w*Math.max(0,Math.min(1,value))))} h={4} radius={2} tone={color.white}/>
    </View>
  </View>;
}
export const binding=entry=>artwork.covers[entry?.id];
export function Cover({entry,x=0,y=0,w,h}){
  const asset=binding(entry)?.asset;
  return asset
    ? <Image source={asset} style={at(x,y,w,h)}/>
    : <Surface x={x} y={y} w={w} h={h} radius={layout.radius} tone="#1C1C1C">
        <Column w={w-40} x={20} y={20} gap={10}>
          <Label style={{fontSize:22,lineHeight:30,fontWeight:fontWeight.medium}} w={w-40} h={30}>{cut(entry?.title||entry?.id||'Artwork unavailable',22)}</Label>
          <Body w={w-40} lines={3}>Artwork unavailable for this listing.</Body>
        </Column>
      </Surface>;
}
export function HeroArt({entry}){return <Image source={binding(entry)?.asset?binding(entry).asset+'-hero':'backdrop'} style={at(0,0,layout.width,layout.height)}/>;}
/* The focused cover carries the same inset 3px white border as the web card. */
export function Poster({entry,w,h=w,focused=false,favorite=false,anchor}){
  const inset=focused?layout.focusWidth:1;
  return <View anchor={anchor} style={{width:w,height:h+58,gap:0}}>
    {[12,9,6,3].map((spread,index)=><View key={spread} style={at(-spread,-spread,w+spread*2,h+spread*2,{borderRadius:layout.radius+spread,borderWidth:3,borderColor:focused?['#FFFFFF05','#FFFFFF09','#FFFFFF10','#FFFFFF19'][index]:'#FFFFFF00'})}/>)}
    <Surface w={w} h={h} tone={color.surface} radius={layout.radius} borderWidth={inset} borderColor={focused?color.white:'#FFFFFF16'}>
      <Cover entry={entry} x={inset} y={inset} w={w-inset*2} h={h-inset*2}/>
    </Surface>
    <Spacer h={10}/>
    <Label style={type.itemTitle} w={w-42} h={24} lines={1}>{entry.title||entry.id}</Label>
    <Label style={type.caption} w={w-42} h={18} color={color.secondary}>{cut([entry.category,entry.version].filter(Boolean).join(' / '),28)}</Label>
    <Icon name="heart" x={w-26} y={h+16} size={16} filled={favorite}/>
  </View>;
}
/* A shelf owns a heading row and its own horizontal scroll region: the page
   keeps scrolling vertically while the row moves sideways on its own. */
export function Shelf({title,entries,index,format='poster',focused,favorite,focusItem,action=-1}){
  /* Mirrors the web grid: 5.9 poster columns and 4.1 landscape columns stay
     partially visible at the row edge, which is also the shelf's scroll cue. */
  const width=format==='landscape'?Math.floor((content.inner-3*layout.gap)/4.1):Math.floor((content.inner-5*layout.gap)/5.9);
  const height=format==='landscape'?Math.round(width*9/16):width;
  const start=Math.max(0,(focusItem>0?focusItem-1:0)-7),end=Math.min(entries.length,start+16);
  return <Column w={content.inner} gap={0}>
    <Row w={content.inner} h={44} gap={18} align='center'>
      <Label style={type.heading} w={content.inner-240} h={30}>{title}</Label>
      <Button w={118} h={36} label="View all" transparent focused={action===0} anchor={action===0}/>
      <Round size={36} name="left" subtle focused={action===1} anchor={action===1}/>
      <Round size={36} name="right" subtle focused={action===2} anchor={action===2}/>
    </Row>
    <Spacer h={15}/>
    <ScrollView scrollKey={'shelf:'+index} axis='horizontal' style={{width:content.inner+40,height:height+58+36,padding:16,gap:layout.gap,marginTop:-16,marginLeft:-16}}>
      {start>0?<View style={{width:start*(width+layout.gap)-layout.gap,height}}/>:null}
      {entries.slice(start,end).map((entry,offset)=>{const position=start+offset;return <Poster key={entry.id} entry={entry} w={width} h={height}
        focused={focused&&focusItem===position+1} favorite={favorite(entry)} anchor={focused&&focusItem===position+1}/>;})}
      {end<entries.length?<View style={{width:(entries.length-end)*(width+layout.gap)-layout.gap,height}}/>:null}
    </ScrollView>
  </Column>;
}
export function PageHeading({eyebrow,title,count,countLabel}){
  return <View style={{width:content.inner,height:92}}>
    <Label style={type.eyebrow} w={900} h={18} color={color.muted}>{ascii(eyebrow).toUpperCase()}</Label>
    <Spacer h={12}/>
    <Label style={type.pageTitle} w={1150} h={42}>{ascii(title)}</Label>
    {count!==undefined?<Column x={content.inner-420} y={18} w={420} gap={4} align='flex-end'>
      <Label style={{fontSize:23,lineHeight:28,fontWeight:fontWeight.medium}} w={420} h={28} align="flex-end">{String(count)}</Label>
      <Label style={type.caption} w={420} h={18} align="flex-end" color={color.secondary}>{countLabel}</Label>
    </Column>:null}
  </View>;
}
export function Notice({children,w=content.inner}){
  return <Surface w={w} h={46} tone={color.raised} radius={layout.radius} align='center' justify='center'>
    <Column w={w-48} gap={2}>
      <Label style={type.secondary}>{ascii(children)}</Label>
    </Column>
  </Surface>;
}
export function Empty({title,message,action,focused,actionWidth=340}){
  return <Column w={650} gap={0}>
    <Icon name="info" size={40}/>
    <Spacer h={22}/>
    <Label style={type.pageTitle} w={650} h={42}>{ascii(title)}</Label>
    <Spacer h={15}/>
    <Body w={650} lines={5} style={{fontSize:15,lineHeight:26,fontWeight:fontWeight.regular}}>{message}</Body>
    <Spacer h={24}/>
    {action?<Button w={actionWidth} label={action} focused={focused} primary anchor={focused}/>:null}
  </Column>;
}

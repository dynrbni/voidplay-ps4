// SPDX-License-Identifier: GPL-3.0-only
import {View,Image} from '@ps4-react/core';
import {catalog,revision,tabs,keys,visible,related,detailTabs} from './model.mjs';
import {Box,Label,Button,Round,Icon,Cards,Empty,HeroArt,binding,at,muted} from './ui.jsx';
import {cut,wrap} from './format.mjs';
import {detailLines} from './detail-data.mjs';
import {bytes} from './transfers.mjs';
export function Header({state}){
 const positions=[390,565,735,945,1570,1650,1730];
 return <>
  {(state.screen!=='discover'&&!(state.screen==='details'&&state.detailPage===0))&&<Box w={1920} h={108} color="#050505EB"/>}
  <Image source="wordmark" style={at(80,31,184,48)}/><Box x={270} y={41} w={60} h={28} radius={3} color="#FFFFFF"><Label x={11} y={6} size={16} color="#101010" w={50}>BETA</Label></Box>
  {tabs.slice(0,4).map((tab,i)=><View key={tab} style={at(positions[i],27,i===2?200:165,58)}>
   <Box w={i===2?200:165} h={58} radius={29} border={2} borderColor={state.zone==='header'&&state.tab===i?'#FFFFFF':'#FFFFFF00'} color={state.zone==='header'&&state.tab===i||state.screen===tab?'#FFFFFF1A':'#FFFFFF00'}/>
   <Label x={20} y={16} w={190} size={24}>{tab[0].toUpperCase()+tab.slice(1)}</Label>
  </View>)}
  {['heart','search','settings'].map((name,i)=><Round key={name} x={positions[i+4]} y={27} name={name} focused={state.zone==='header'&&state.tab===i+4} filled={i===0&&state.screen==='favorites'}/>)}
  {state.zone==='header'&&state.tab>=4&&<Label x={1480} y={94} w={360} size={18}>{tabs[state.tab]}</Label>}
 </>;
}
function Heading({eyebrow,title,count}){return <><Label x={80} y={151} size={18} color={muted}>{eyebrow}</Label><Label x={80} y={195} size={48}>{title}</Label>{count!==undefined&&<Label x={1620} y={215} size={25} w={250}>{count} entries</Label>}</>;}
export function Home({state}){
 const hero=catalog.find(entry=>entry.id===state.featuredId)||catalog[0];
 if(!hero)return <Empty title="No applications yet" message="Publish catalog entries in the owner studio, then sync and rebuild this native package." button="Browse catalog"/>;
 const names=['Discover on Voidplay','Tools & utilities','Picture & sound'],entries=visible(state);
 return <>
  <Label x={80} y={145} size={19} color={muted}>DISCOVER</Label><Label x={80} y={195} w={950} size={60}>{wrap(hero.title||hero.id,28,2)}</Label>
  <Label x={80} y={350} w={900} size={26} color="#DDDDDD">{wrap(hero.summary||hero.description||'Explore the published collection.',60,2)}</Label>
  <Button x={80} y={445} w={280} label="View application" primary focused={state.zone==='hero'&&state.button===0}/><Round x={382} y={445} name="heart" focused={state.zone==='hero'&&state.button===1} filled={state.favorites.includes(hero.id)}/>
  <Label x={80} y={525} size={18} color={muted}>{cut([hero.author,hero.version&&'Version '+hero.version].filter(Boolean).join(' / '),100)}</Label>
  <Label x={80} y={600} size={30}>{names[state.shelf]}</Label><Label x={1340} y={610} w={500} size={19} color={muted}>{state.shelf+1} / 3 shelves    Down: next shelf</Label>
  {entries.length?<Cards entries={entries} state={state} y={655} limit={6}/>:<Label x={80} y={740} size={27} color={muted}>No published entries in this category yet.</Label>}
 </>;
}
export function Catalog({state}){
 const entries=visible(state),isCollection=['library','favorites'].includes(state.screen),isSearch=state.screen==='search';
 return <>
  <Heading eyebrow={isCollection?'YOUR COLLECTION':'THE VOIDPLAY COLLECTION'} title={isCollection?state.screen==='library'?'Your library.':'Your favorites.':isSearch?'What are you looking for?':'Find your next discovery.'} count={entries.length}/>
  {isCollection?<Label x={80} y={290} size={24} color={muted}>Saved listings. These do not represent downloaded or installed applications.</Label>:<>
   <Button x={80} y={292} w={850} label={cut(state.query||'Search titles, tools, and possibilities',60)} focused={state.zone==='filters'&&state.filter===0} icon="search"/>
   <Button x={955} y={292} w={300} label={state.category==='All'?'All applications':state.category} focused={state.zone==='filters'&&state.filter===1}/>
   <Button x={1280} y={292} w={290} label={state.sort==='title'?'Title A-Z':'Curated order'} focused={state.zone==='filters'&&state.filter===2}/>
   <Button x={1590} y={292} w={245} label="Clear filters" focused={state.zone==='filters'&&state.filter===3}/>
  </>}
  {entries.length?<Cards entries={entries} state={state} y={380}/>:<Empty title={isCollection?'Nothing saved here yet.':'No matching applications'} message={isCollection?'Open a listing and use its favorite or library action to save it here.':'Try another title or category. Choose Clear filters to see all entries.'} button={isCollection?'Browse applications':'Edit filters'} focused={state.zone==='content'}/>}
 </>;
}
export function Details({state}){
 const entry=catalog.find(item=>item.id===state.detailId);if(!entry)return null;
 const focused=state.zone==='detail';
 return <>
  {detailTabs.map((label,i)=><Box key={label} x={80+i*250} y={132} w={235} h={49} color={state.detailPage===i?'#FFFFFF24':'#050505A0'} radius={8} border={state.zone==='detailtabs'&&state.detailPage===i?2:0}><Label x={16} y={13} size={21} w={225}>{label}</Label></Box>)}
  {state.detailPage===0?<>
   <Label x={80} y={245} size={19} color={muted}>{entry.category.toUpperCase()} / PUBLISHED ENTRY</Label>
   <Label x={80} y={297} w={1150} size={66}>{wrap(entry.title||entry.id,32,2)}</Label>
   <Label x={80} y={485} w={1080} size={29} color="#DDDDDD">{wrap(entry.summary||entry.description||'No summary added yet.',65,3)}</Label>
   <Label x={80} y={655} size={24} color={muted}>{cut([entry.author,entry.version&&'Version '+entry.version,bytes(entry.fileSize)].filter(Boolean).join(' / '),110)}</Label>
   <Button x={80} y={820} w={380} label="PS4 transfer unavailable" icon="download" focused={focused&&state.button===0}/>
   <Round x={485} y={820} name="heart" filled={state.favorites.includes(entry.id)} focused={focused&&state.button===1}/>
   <Round x={565} y={820} name="info" focused={focused&&state.button===2}/>
   <Button x={655} y={820} w={310} label={state.library.includes(entry.id)?'In your library':'Add to library'} icon={state.library.includes(entry.id)?'check':'library'} focused={focused&&state.button===3}/>
   <Label x={80} y={915} size={21} color={muted}>Source links and compatibility are catalog metadata. No package is installed.</Label>
  </>:state.detailPage===4?<Gallery entry={entry} state={state}/>:state.detailPage===6?<>
   <Label x={80} y={245} size={42}>More to explore</Label>
   {related(entry).length?<Cards entries={related(entry)} state={{...state,zone:focused?'content':state.zone}} index={state.scroll} y={390} limit={6}/>:<Label x={80} y={400} size={28} color={muted}>No related listings have been published yet.</Label>}
  </>:<>
   <Label x={80} y={238} size={40}>{detailTabs[state.detailPage]}</Label>
   {detailLines(entry,state.detailPage).slice(state.scroll,state.scroll+16).map((line,i)=><Label key={i} x={80} y={325+i*37} size={25} color={line===line.toUpperCase()?'#FFFFFF':muted}>{line}</Label>)}
   <Label x={80} y={968} size={19} color={muted}>Up / Down: read more    Up at top: section tabs    O: overview</Label>
  </>}
 </>;
}
function Gallery({entry,state}){
 const shot=entry.screenshots?.[state.scroll],assets=binding(entry),available=assets?.screenshots?.[state.scroll];
 return <>
  <Label x={80} y={225} size={42}>Screenshots {shot?`${state.scroll+1} / ${entry.screenshots.length}`:''}</Label>
  {available?<Image source={assets.asset+'-shot-'+state.scroll} style={at(300,315,1280,620)}/>:<Box x={80} y={325} w={1740} h={540} radius={12}><Icon name="info" x={50} y={50} size={44}/><Label x={50} y={140} size={32}>{shot?'Screenshot not bundled':'No screenshots published'}</Label><Label x={50} y={225} size={24} color={muted}>{wrap(shot?.url||'Add screenshots in the owner catalog, then sync the native artwork before building.',95,4)}</Label></Box>}
  <Label x={80} y={945} size={24} color={muted}>{cut(shot?.description||'Left / Right: previous or next screenshot. O: overview.',115)}</Label>
 </>;
}
export function Downloads({state}){
 const active=state.jobs.find(job=>job.status==='downloading'),start=Math.floor(state.index/3)*3;
 return <>
  <Heading eyebrow="KEEP EVERYTHING IN VIEW" title="Downloads" count={state.jobs.filter(job=>['queued','downloading','paused'].includes(job.status)).length}/>
  <Box x={80} y={290} w={1740} h={92} color="#242424" radius={8}><Label x={24} y={16} size={22}>REAL CONSOLE TRANSFERS UNAVAILABLE</Label><Label x={24} y={51} size={21} color={muted}>Testing queue below is simulated. No files, network speed or installation are measured.</Label></Box>
  <Label x={80} y={410} size={28}>Demo speed: {active?bytes(active.speed)+'/s':'Idle'}</Label>
  {state.jobs.length?state.jobs.slice(start,start+3).map((job,i)=>{
   const entry=catalog.find(item=>item.id===job.id),selected=state.index===start+i;
   return <Box key={job.id} x={80} y={480+i*145} w={1740} h={125} radius={8} color="#171717">
    <Label x={24} y={18} size={25}>{cut(entry?.title||job.id,60)} / {job.status.toUpperCase()} / DEMO</Label>
    <Box x={24} y={66} w={880} h={6} radius={3} color="#404040"/><Box x={24} y={66} w={Math.max(1,880*job.received/job.total)} h={6} radius={3} color="#FFFFFF"/>
    <Label x={24} y={84} size={18} color={muted}>{Math.floor(job.received/job.total*100)}% / {job.received?bytes(job.received):'0 bytes'} of {bytes(job.total)} simulated</Label>
    {[job.status==='paused'?'Resume':['completed','cancelled'].includes(job.status)?'Retry':'Pause',['completed','cancelled'].includes(job.status)?'Remove':'Cancel','Details'].map((label,j)=><Button key={label} x={980+j*245} y={35} w={225} h={56} label={label} focused={state.zone==='content'&&selected&&state.jobButton===j}/>)}
   </Box>;
  }):<><Label x={80} y={535} size={40}>Nothing in the queue.</Label><Label x={80} y={615} size={25} color={muted}>Settings includes an opt-in transfer simulation for testing queue controls.</Label></>}
  {(!state.jobs.length||state.jobs.some(job=>['completed','cancelled'].includes(job.status)))&&<Button x={80} y={945} w={state.jobs.length?320:420} h={50} label={state.jobs.length?'Clear finished demos':'Start transfer simulation'} focused={state.zone==='content'&&state.index===state.jobs.length}/>}
 </>;
}
export function Settings({state}){
 const labels=[`Reduce motion: ${state.reduceMotion?'On':'Off'}`,'Catalog snapshot','Your collections','Storage status','Controller guide','About Voidplay','Start transfer simulation'];
 const descriptions=['Keep artwork transitions still.',`${catalog.length} published entries / revision ${revision} / bundled offline`,'Favorites and Library are separate saved listings.','Console capacity has not been measured.','X opens / O returns / D-pad and left stick move.','Independent by nature. Open to possibility.','Test queue controls only. No file download or installation.'];
 return <>
  <Heading eyebrow="MAKE YOURSELF AT HOME" title="Settings & about."/>
  {labels.map((label,i)=><Box key={i} x={80} y={300+i*94} w={1740} h={80} radius={8} border={state.zone==='content'&&state.index===i?2:0} borderColor="#FFFFFF" color="#171717"><Label x={24} y={13} size={25}>{label}</Label><Label x={24} y={49} size={19} color={muted}>{descriptions[i]}</Label></Box>)}
 </>;
}
export function Keyboard({state}){return <Box x={180} y={255} w={1560} h={665} radius={18} border={2} color="#171717">
 <Label x={45} y={35} size={30}>{cut(state.query||'Search applications',70)}</Label>
 {keys.map((key,i)=><Button key={key} x={40+i%10*149} y={130+Math.floor(i/10)*100} w={135} h={78} label={key} focused={state.key===i}/>)}
 <Label x={45} y={565} size={23} color={muted}>X types / DONE shows results / O closes keyboard</Label>
 </Box>;}
export function Modal({state}){
 const entry=catalog.find(item=>item.id===state.detailId);
 const messages={catalog:`Published catalog revision ${revision}, ${catalog.length} entries. This package loads its validated bundled snapshot. Online refresh is not connected. Use the native sync command and rebuild to update.`,collections:'Favorites and Library are stored separately in one application preferences file. Saved listings are not installed packages. Saving failures appear as a banner and keep session changes usable.',storage:'Storage unavailable. This build does not query PS4 internal capacity. No browser quota or mock number is presented as console storage.',controls:'X opens or confirms. O returns. D-pad and LEFT analog stick move focus. Up from the first item selects the header. Details have section tabs; Down reads the selected section. Triangle toggles a focused listing favorite. Use the PS menu to close.',about:'Voidplay [BETA] 01.03. Native React / QuickJS / OpenOrbis. Manrope: SIL Open Font License. Public web store views are adapted for controller navigation; the owner admin remains separate.',source:entry?.sources.map((source,i)=>`${i+1}. ${source.provider}: ${source.url}`).join('\n')||'No source links configured. Real downloads and installation are unavailable.',trailer:entry?.trailerUrl||'No trailer URL published. Native YouTube playback is not available.'};
 return <Box x={290} y={315} w={1340} h={480} radius={18} border={1} borderColor="#555555" color="#242424"><Label x={50} y={45} size={38}>{state.modal[0].toUpperCase()+state.modal.slice(1)}</Label><Label x={50} y={130} size={27} color={muted}>{wrap(messages[state.modal],78,7)}</Label><Label x={50} y={420} size={22}>O Back / X Close</Label></Box>;
}
export function Background({state}){const entry=catalog.find(item=>item.id===(state.screen==='details'?state.detailId:state.featuredId));return state.screen==='discover'||state.screen==='details'&&state.detailPage===0?<HeroArt entry={entry}/>:<Box w={1920} h={1080} color="#050505"/>;}

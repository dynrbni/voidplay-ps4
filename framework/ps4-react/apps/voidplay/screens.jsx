// SPDX-License-Identifier: GPL-3.0-only
import {View,Image,ScrollView} from '@ps4-react/core';
import {catalog,revision,previewMode,tabs,keys,visible,shelves,detailSections,jobActions,GRID_COLUMNS} from './model.mjs';
import {color,type,layout,weight as fontWeight,content} from './theme.mjs';
import {Shelf,Poster,Cover,Row,Column,Label,Body,Spacer,Button,Round,Icon,Rule,Surface,Progress,PageHeading,Empty,Notice,binding,at,HeroArt} from './ui.jsx';
import {cut} from './format.mjs';
import {paragraphs,metadataRows} from './content-blocks.mjs';
import {bytes} from './transfers.mjs';

const heroCopy=590;

/* Fixed rails: the header floats over the artwork like the web header and gets
   its dark surface once the page has scrolled past the hero. */
export function Header({state,counts}){
  const widths=[103,89,121,88],transparent=!state.scrolled;
  return <View style={at(0,0,layout.width,layout.headerHeight,{backgroundColor:transparent?color.headerTransparent:color.headerScrolled})}>
    <Row x={content.gutter} y={16} w={144} h={44} gap={12} align='center'>
      <Label style={type.wordmark} w={100} h={30}>voidplay.</Label>
      <Surface w={41} h={19} radius={3} tone={color.white} align='center' justify='center'>
        <Label style={type.badge} w={41} align='center' color={color.ink}>BETA</Label>
      </Surface>
    </Row>
    <Row x={content.gutter+204} y={16} w={450} h={44} gap={8} align='center'>
      {tabs.slice(0,4).map((tab,index)=><Button key={tab} w={widths[index]} h={44} chip transparent={state.screen!==tab} label={tab[0].toUpperCase()+tab.slice(1)} focused={state.zone==='header'&&state.tab===index}/>)}
    </Row>
    <Row x={layout.width-content.gutter-144} y={16} w={144} gap={6} align='center'>
      {['heart','search','settings'].map((name,index)=><Round key={name} size={44} name={name} filled={name==='heart'&&state.screen==='favorites'} focused={state.zone==='header'&&state.tab===index+4}/>)}
    </Row>
    {counts.transfers>0?<Label style={type.badge} w={24} h={16} x={content.gutter+520} y={20}>{String(counts.transfers)}</Label>:null}
  </View>;
}
export function Footer(){
  return <View style={at(0,layout.height-layout.footerHeight,layout.width,layout.footerHeight,{backgroundColor:color.headerScrolled})}>
    <Label style={type.footer} w={1100} h={18} color={color.secondary} x={content.gutter} y={14}>Cross Select / Circle Back / D-pad or left stick Move / Triangle Favorite</Label>
    <Label style={type.footer} w={300} h={18} color={color.secondary} x={layout.width-content.gutter-300} y={14}>Voidplay [BETA] / 01.05</Label>
  </View>;
}
function DocumentFooter({focused}){
  return <Column w={content.inner} gap={18} anchor={focused}>
    <Rule/>
    <Row w={content.inner} gap={100} align='center'>
      <Column w={750} gap={4}>
        <Label style={{fontSize:18,lineHeight:24,fontWeight:750,letterSpacing:-1}}>voidplay.</Label>
        <Body style={type.footer}>Independent by nature. Open to possibility.</Body>
      </Column>
      <Column w={900} gap={4}>
        <Body style={type.footer}>Beta / Authorized catalog / Console transfer unavailable</Body>
        <Body style={type.footer}>Native services remain subject to individual console verification.</Body>
      </Column>
    </Row>
    <Spacer h={24}/>
  </Column>;
}
/* Every screen renders inside one vertical ScrollView; the fixed rails sit above
   it, so page scrolling never moves the header or the hint bar. Page children are
   centred on the content column, which is why no screen repeats the gutter. */
export function Page({state,children}){
  return <ScrollView scrollKey={'page:'+state.screen+(state.screen==='details'?':'+state.detailId:'')} axis='vertical' insetStart={layout.headerHeight+16} focusAlign={state.screen==='details'?'start':'nearest'}
    style={{width:layout.width,height:content.height,alignItems:'center'}}>{children}<DocumentFooter focused={state.zone==='footer'}/></ScrollView>;
}
/* Hero copy mirrors the web featured block: the title is line-clamped instead of
   occupying a reserved two-line box, so one-line titles do not open a gap. */
function Hero({state,hero}){
  const focused=state.section===0&&state.zone==='content';
  return <View style={{width:layout.width,height:layout.heroHeight}}>
    <HeroArt entry={hero}/>
    <Column x={content.gutter} y={162} w={heroCopy} gap={0}>
      <Label style={type.eyebrow} w={heroCopy} color="#D4D4D4">{'Discover'}</Label>
      <Spacer h={20}/>
      <Label style={type.display} w={450} lines={2}>{cut(hero.title||hero.id,60)}</Label>
      <Spacer h={24}/>
      <Body w={560} lines={2} style={type.lead} color="#DDDDDD">{cut(hero.summary||hero.description||'Explore the published collection.',150)}</Body>
      <Spacer h={18}/>
      <Row w={560} gap={14} align='center'>
        <Button w={175} h={46} textStyle={{fontSize:14,lineHeight:23,fontWeight:550}} label="View application" primary focused={focused&&state.item===0} anchor={focused&&state.item===0}/>
        <Round size={44} name="heart" filled={state.favorites.includes(hero.id)} focused={focused&&state.item===1} anchor={focused&&state.item===1}/>
      </Row>
      <Spacer h={14}/>
      <Label style={{fontSize:11,lineHeight:16,fontWeight:fontWeight.regular}} w={700} color="#BABABA">{cut([hero.author,hero.version,previewMode?'Concept preview':'PS4 runtime unverified'].filter(Boolean).join(' · '),110)}</Label>
    </Column>
  </View>;
}
export function Discover({state,entries=catalog}){
  const hero=entries.find(entry=>entry.id===state.featuredId)||entries[0],list=shelves(entries);
  if(!hero)return <Column w={content.inner} pad={0} gap={0}><Spacer h={170}/><Empty title="No applications yet" message="The published catalog is empty. Sync the catalog and rebuild this package after entries are added." action="Browse catalog" focused={state.zone==='content'}/></Column>;
  return <View style={{width:layout.width,alignItems:'center'}}>
    <Hero state={state} hero={hero}/>
    <View style={{width:content.inner,gap:36,marginTop:-layout.heroOverlap}}>
      {list.map((shelf,index)=><Shelf key={shelf.title} title={shelf.title} entries={shelf.entries} index={index} format={shelf.format}
        focused={state.zone==='content'&&state.section===index+1}
        focusItem={state.section===index+1?state.item:-1}
        action={state.zone==='shelfactions'&&state.section===index+1?state.shelfAction:-1}
        favorite={entry=>state.favorites.includes(entry.id)}/>)}
    </View>
    <Spacer h={40}/>
  </View>;
}
export function Grid({entries,state,focused,format='poster'}){
  const width=Math.floor((content.inner-(GRID_COLUMNS-1)*layout.gap)/GRID_COLUMNS);
  const height=format==='landscape'?Math.round(width*9/16):width;
  const rows=Math.ceil(entries.length/GRID_COLUMNS);
  const start=Math.max(0,Math.floor(state.index/GRID_COLUMNS)-2),end=Math.min(rows,start+5);
  return <Column w={content.inner} gap={25}>
    {start>0?<Spacer h={start*(height+58+25)-25}/>:null}
    {Array.from({length:Math.max(0,end-start)},(_,offset)=>{const row=start+offset;return <Row key={row} w={content.inner} gap={layout.gap} align='flex-start'>
      {entries.slice(row*GRID_COLUMNS,(row+1)*GRID_COLUMNS).map((entry,column)=>{
        const index=row*GRID_COLUMNS+column,isFocused=focused&&state.zone==='content'&&state.index===index;
        return <Poster key={entry.id} entry={entry} w={width} h={height} focused={isFocused} favorite={state.favorites.includes(entry.id)} anchor={isFocused}/>;
      })}
    </Row>;})}
    {end<rows?<Spacer h={(rows-end)*(height+58+25)-25}/>:null}
  </Column>;
}
export function Catalog({state}){
  const entries=visible(state),collection=['library','favorites'].includes(state.screen),search=state.screen==='search';
  return <View style={{width:layout.width,alignItems:'center'}}>
    <Column w={content.inner} gap={0}>
      <Spacer h={layout.headerHeight+38}/>
      <PageHeading eyebrow={search?'Search the collection':'The Voidplay collection'}
        title={collection?(state.screen==='library'?'Your library.':'Worth coming back to.'):search?'What are you looking for?':'Find your next discovery.'}
        count={entries.length} countLabel={collection?(entries.length===1?'saved entry':'saved entries'):'of '+catalog.length+' entries'}/>
      <Spacer h={22}/>
      {collection
        ? <Body w={content.inner} lines={2} style={type.secondary}>Listings you keep here are saved separately from favorites and demo downloads. Nothing is installed.</Body>
        : <Column w={content.inner} gap={18}>
            <Row w={content.inner} gap={20} align='center'>
              <Button w={820} h={46} label={cut(state.query||'Search titles, tools, and possibilities',60)} icon="search" focused={state.zone==='filters'&&state.filter===0}/>
              <Button w={300} h={46} label={state.category==='All'?'All applications':state.category} focused={state.zone==='filters'&&state.filter===1}/>
              <Button w={300} h={46} label={state.sort==='title'?'Title A-Z':'Curated order'} focused={state.zone==='filters'&&state.filter===2}/>
              <Button w={280} h={46} label="Clear filters" focused={state.zone==='filters'&&state.filter===3}/>
            </Row>
            <Row w={content.inner} gap={28} align='center'>
              {['All',...new Set(catalog.map(entry=>entry.category))].map(category=>
                <Label key={category} style={{...type.secondary,fontWeight:fontWeight.medium}} w={category==='All'?200:180} h={38}
                  color={state.category===category?color.white:color.secondary}>{category==='All'?'All applications':category}</Label>)}
            </Row>
            <Rule/>
          </Column>}
      <Spacer h={26}/>
      {entries.length?<Grid entries={entries} state={state} focused/>
        :<Empty title={collection?'Your next favorite is out there.':'No matching applications'}
          message={collection?'Open a listing and use its favorite or library action to save it here.':'Try a different title or explore another category.'}
          action={collection?'Explore the collection':'Clear filters'} focused={state.zone==='content'}/>}
      <Spacer h={40}/>
    </Column>
  </View>;
}
function Metadata({entry,state,selected,w}){
  const rows=metadataRows(entry),cell=Math.floor((w-28)/2);
  return <Column w={w} gap={22}>
    {Array.from({length:Math.ceil(rows.length/2)},(_,row)=><Row key={row} w={w} gap={28}>
      {rows.slice(row*2,row*2+2).map(([label,value],column)=><Column key={label} w={cell} gap={7} anchor={selected&&state.detailItem===row*2+column}>
        <Label style={type.caption} w={cell} color={color.secondary}>{label}</Label>
        <Body w={cell} style={type.secondary} color="#DDDDDD">{value}</Body>
      </Column>)}
    </Row>)}
  </Column>;
}
function SourceBlock({entry,state,sectionNumber}){
  if(!entry.sources.length)return <Body w={900} lines={2} style={type.secondary}>No download links have been added for this listing.</Body>;
  return <Column w={content.inner} gap={22}>
    {entry.sources.map((source,index)=>{
      const selected=state.zone==='detailbody'&&state.detailSection===sectionNumber&&state.detailItem===index;
      return <View key={source.id||String(index)} anchor={selected} style={{width:content.inner,gap:3,padding:16,borderWidth:selected?2:0,borderRadius:7,borderColor:color.white}}>
        <Label style={type.subheading} w={900} h={26}>{cut(source.provider||source.url,60)}</Label>
        <Body w={1100} lines={2} style={type.secondary}>{cut(source.url,120)}</Body>
        <Body w={1100} lines={2} style={type.caption}>{cut('Expected size '+bytes(source.expectedSize)+' / '+(source.authentication?.required?'Authentication required':'No authentication required'),120)}</Body>
        <Body w={1100} lines={2} style={{...type.caption,fontSize:12,lineHeight:16}}>{cut('SHA-256 '+(source.sha256||'not provided'),90)}</Body>
        {source.authentication?.required?<Body w={1100} lines={8} style={type.caption}>{source.authentication.instructions||'Authentication is required by the provider.'}</Body>:null}
      </View>;
    })}
  </Column>;
}
function Screenshots({entry,state,selected}){
  const shots=entry.screenshots||[],index=state.detailItem,shot=shots[index],assets=binding(entry),available=assets?.screenshots?.[index];
  if(!shot)return <Body w={900} lines={2} style={type.secondary}>No screenshots have been published for this listing.</Body>;
  return <Column w={content.inner} gap={14} anchor={selected}>
    {available?<Image source={assets.asset+'-shot-'+index} style={{width:1280,height:720,objectFit:'contain'}}/>
      :<Surface w={1280} h={200} tone={color.surface}>
        <Column x={40} y={40} w={1200} gap={10}>
          <Label style={type.subheading} w={1200} h={26}>{'Screenshot not bundled'}</Label>
          <Body w={1200} lines={3}>{cut(shot.url||'Add screenshots in the owner catalog, then sync the native artwork before building.',160)}</Body>
        </Column>
      </Surface>}
    <Label style={type.caption} w={1280} h={18} color={color.secondary}>{cut((index+1)+' / '+shots.length+'  '+(shot.description||''),150)}</Label>
  </Column>;
}
function SectionBody({entry,section,state,selected,number,w=content.inner}){
  if(section.key==='about'){
    const copy=paragraphs(entry.description||'No description added yet.'),notes=entry.releaseNotes?paragraphs(entry.releaseNotes):[];
    return <>
      <Label style={type.subheading} w={w} anchor={selected&&state.detailItem===0}>{section.title}</Label>
      {copy.map((value,index)=><Body key={index} w={w} style={type.body} color="#C4C4C4" anchor={selected&&state.detailItem===index}>{value}</Body>)}
      <Button w={280} h={44} label={state.library.includes(entry.id)?'In your library':'Add to library'} icon={state.library.includes(entry.id)?'check':'library'} focused={selected&&state.detailItem===copy.length} anchor={selected&&state.detailItem===copy.length}/>
      <Body w={w} style={type.caption}>Library tracks the listing separately from favorites. No application is installed.</Body>
      {notes.length?<Label style={type.subheading} w={w}>Release notes</Label>:null}
      {notes.map((value,index)=><Body key={index} w={w} style={type.secondary} anchor={selected&&state.detailItem===copy.length+1+index}>{value}</Body>)}
    </>;
  }
  if(section.key==='information')return <><Label style={type.subheading} w={w} anchor={selected&&state.detailItem===0}>{section.title}</Label><Metadata entry={entry} state={state} selected={selected} w={w}/></>;
  if(section.key==='sources')return <>
    <Label style={type.subheading} w={900} h={26} anchor={selected&&state.detailItem===0}>{section.title}</Label>
    <Body w={1000} lines={2} style={type.secondary}>{'Configured source links are catalog metadata. Opening one does not transfer to or install on a PS4.'}</Body>
    <SourceBlock entry={entry} state={state} sectionNumber={number}/>
  </>;
  if(section.key==='screenshots')return <><Label style={type.subheading} w={900} h={26} anchor={selected&&state.detailItem===0}>{section.title}</Label><Screenshots entry={entry} state={state} selected={selected}/></>;
  if(section.key==='trailer')return <>
    <Label style={type.subheading} w={900} h={26} anchor={selected&&state.detailItem===0}>{section.title}</Label>
    <Body w={1000} lines={3} style={type.secondary}>{cut(entry.trailerUrl||'No trailer URL published. Native YouTube playback is not available.',160)}</Body>
    <Button w={300} h={44} label="Trailer details" focused={selected&&state.detailItem===0} anchor={selected&&state.detailItem===0}/>
  </>;
  return <>
    <Label style={type.subheading} w={900} h={26} anchor={selected&&state.detailItem===0}>{section.title}</Label>
    <Shelf title={section.title} entries={section.entries} index={'related'} format='landscape' focused={selected}
      focusItem={selected?state.detailItem+1:-1} favorite={item=>state.favorites.includes(item.id)}/>
  </>;
}
export function Details({state}){
  const entry=catalog.find(item=>item.id===state.detailId);
  if(!entry)return <Column w={content.inner} pad={56} gap={0}><Empty title="That discovery is not here." message="This address does not match a listing in the bundled catalog." action="Back to Discover" focused/></Column>;
  const sections=detailSections(entry),focusedBody=state.zone==='detailbody';
  const heroHeight=layout.height;
  return <View style={{width:layout.width,alignItems:'center'}}>
    <View style={{width:layout.width,height:heroHeight}}>
      <HeroArt entry={entry}/>
      <Column x={content.gutter} y={205} w={650} gap={0}>
        <Label style={type.eyebrow} w={650} color="#D5D5D5">{entry.category.toUpperCase()+' / '+(previewMode?'CONCEPT PREVIEW':'PUBLISHED ENTRY')}</Label>
        <Spacer h={17}/>
        <Label style={type.display} w={650} lines={3}>{cut(entry.title||entry.id,80)}</Label>
        <Spacer h={22}/>
        <Body w={650} lines={3} style={{fontSize:17,lineHeight:28,fontWeight:fontWeight.regular}} color="#EEEEEE">{cut(entry.summary||entry.description||'No summary added yet.',200)}</Body>
        <Spacer h={20}/>
        <Body w={620} lines={3} style={type.body}>{cut([entry.author,entry.version&&'Version '+entry.version].filter(Boolean).join(' / '),140)}</Body>
      </Column>
      <Row x={content.gutter} y={heroHeight-186} w={780} gap={14} align='center'>
        <Button w={300} h={52} label="PS4 transfer unavailable" icon="download" focused={state.zone==='detail'&&state.detailItem===0} anchor={state.zone==='detail'&&state.detailItem===0}/>
        <Round size={52} name="heart" filled={state.favorites.includes(entry.id)} focused={state.zone==='detail'&&state.detailItem===1} anchor={state.zone==='detail'&&state.detailItem===1}/>
        <Round size={52} name="info" focused={state.zone==='detail'&&state.detailItem===2} anchor={state.zone==='detail'&&state.detailItem===2}/>
      </Row>
      <Label style={{fontSize:11,lineHeight:16,fontWeight:fontWeight.regular}} w={780} color="#BABABA" x={content.gutter} y={heroHeight-110}>{'Console receiver, compatibility and installation have not been verified.'}</Label>
      <Surface x={content.gutter} y={layout.headerHeight+16} w={150} h={40} radius={20} tone="#FFFFFF12" align='center' justify='center'>
        <Row w={118} gap={8} align='center'><Icon name="left" size={18}/><Label style={{...type.secondary,fontWeight:fontWeight.medium}} w={60}>{'Back'}</Label></Row>
      </Surface>
    </View>
    <Column w={content.inner} gap={44}>
      <Spacer h={0}/>
      <Row w={content.inner} gap={140} align='flex-start'>
        {sections.slice(0,2).map((section,index)=><Column key={section.key} w={index===0?866:754} gap={16}>
          <SectionBody entry={entry} section={section} state={state} selected={focusedBody&&state.detailSection===index+1} number={index+1} w={index===0?866:754}/>
        </Column>)}
      </Row>
      {sections.slice(2).map((section,index)=>{
        const number=index+3,selected=focusedBody&&state.detailSection===number;
        return <Column key={section.key} w={content.inner} gap={16}>
          <SectionBody entry={entry} section={section} state={state} selected={selected} number={number}/>
        </Column>;
      })}
      <Spacer h={40}/>
    </Column>
  </View>;
}
export function Downloads({state}){
  const active=state.jobs.find(job=>job.status==='downloading');
  const pending=state.jobs.filter(job=>['downloading','queued','paused'].includes(job.status));
  const finished=state.jobs.filter(job=>['completed','cancelled'].includes(job.status));
  const labels={downloading:'Downloading / Demo',queued:'Queued',paused:'Paused',completed:'Demo complete',cancelled:'Cancelled'};
  return <View style={{width:layout.width,alignItems:'center'}}>
    <Column w={content.inner} gap={0}>
      <Spacer h={layout.headerHeight+38}/>
      <PageHeading eyebrow="Keep everything in view" title="Downloads" count={pending.length} countLabel="in queue"/>
      <Spacer h={22}/>
      <Notice>Simulated transfers for the beta preview. Progress, sizes and speeds are demo values. No files are downloaded or sent to a PS4.</Notice>
      <Spacer h={26}/>
      {state.jobs.length?<>
        <Row w={content.inner} gap={130} align='flex-start'>
          {[['Demo speed',active?bytes(active.speed)+'/s':'Idle'],['Active',active?'1 transfer':'None'],['Completed demos',String(state.jobs.filter(job=>job.status==='completed').length)]].map(([label,value])=>
            <Column key={label} w={260} gap={4}>
              <Label style={type.caption} w={260} h={18} color={color.secondary}>{label}</Label>
              <Label style={{fontSize:26,lineHeight:32,fontWeight:fontWeight.medium}} w={260} h={32}>{value}</Label>
            </Column>)}
        </Row>
        <Spacer h={30}/>
        {state.jobs.map((job,index)=>{
          const entry=catalog.find(item=>item.id===job.id),selected=state.zone==='content'&&state.index===index,actions=jobActions(job);
          const percent=Math.floor(job.received/job.total*100);
          return <Column key={job.id} w={content.inner} gap={12} anchor={selected}>
            <Rule/>
            <Spacer h={12}/>
            <Row w={content.inner} gap={24} align='center'>
              <View style={{width:105,height:105}}><Cover entry={entry} w={105} h={105}/></View>
              <Column w={1080} gap={8}>
                <Row w={1080} gap={20} align='center'>
                  <Label style={{fontSize:17,lineHeight:24,fontWeight:fontWeight.semibold}} w={760} h={24}>{cut(entry?.title||job.id,60)}</Label>
                  <Label style={type.caption} w={280} h={18} color="#D0D0D0">{labels[job.status]}</Label>
                </Row>
                <Progress w={1050} value={job.received/job.total}/>
                <Label style={type.caption} w={1050} h={18} color="#C4C4C4">{percent+'% / '+bytes(job.received)+' of '+bytes(job.total)+' simulated'}</Label>
              </Column>
              <Row w={240} gap={10} align='center'>
                {actions.map((action,position)=><Round key={action} size={44} name={action==='pause'?'pause':action==='resume'?'play':action==='cancel'?'close':'retry'}
                  focused={selected&&state.jobButton===position}/>)}
              </Row>
            </Row>
            <Spacer h={16}/>
          </Column>;
        })}
        <Spacer h={16}/>
      </>:<><Spacer h={30}/><Empty title="Nothing in the queue." message="Use Start transfer simulation below to test queue controls. Library listings remain separate." action="Browse applications" focused={state.zone==='content'&&state.index===0}/></>}
      {(state.jobs.length===0||finished.length>0)?<><Spacer h={20}/><Button w={state.jobs.length?320:420} h={50} label={state.jobs.length?'Clear finished demos':'Start transfer simulation'} focused={state.zone==='content'&&state.index===(state.jobs.length||1)} anchor={state.zone==='content'&&state.index===(state.jobs.length||1)}/></>:null}
      <Spacer h={40}/>
    </Column>
  </View>;
}
export function Settings({state}){
  const labels=['Reduce motion','Catalog snapshot','Your collections','Storage status','Controller guide','About Voidplay','Start transfer simulation'];
  const descriptions=['Keep focus movement and artwork transitions still.',catalog.length+' published entries / revision '+revision+' / bundled offline',
    'Favorites and library listings are stored in one application preferences file.','Console capacity has not been measured by this build.',
    'Cross opens / Circle returns / D-pad and left stick move / Triangle favorites.','Independent by nature. Open to possibility.','Test queue controls only. No file download or installation.'];
  return <View style={{width:layout.width,alignItems:'center'}}>
    <Column w={content.inner} gap={0}>
      <Spacer h={layout.headerHeight+38}/>
      <PageHeading eyebrow="Make yourself at home" title="Settings & about."/>
      <Spacer h={30}/>
      {labels.map((label,index)=>{
        const selected=state.zone==='content'&&state.index===index;
        return <View key={label} style={{height:94}}>
          <Surface y={0} w={1000} h={80} radius={layout.radius} tone={color.headerTransparent} borderWidth={selected?2:0} borderColor={color.white} anchor={selected}>
            <Column x={24} y={13} w={content.inner-48} gap={2}>
              <Label style={{fontSize:15,lineHeight:25,fontWeight:550}} w={952} h={25}>{label+(index===0?': '+(state.reduceMotion?'On':'Off'):'')}</Label>
              <Label style={{fontSize:13,lineHeight:21,fontWeight:400}} w={952} h={42} color={color.secondary}>{descriptions[index]}</Label>
            </Column>
          </Surface>
        </View>;
      })}
      <Spacer h={40}/>
    </Column>
  </View>;
}
export function Keyboard({state}){
  return <View style={at(180,255,1560,665,{backgroundColor:color.surface,borderRadius:18,borderWidth:2,borderColor:color.white})}>
    <Label style={{fontSize:30,lineHeight:38,fontWeight:fontWeight.semibold}} w={1470} h={38} x={40} y={40}>{cut(state.query||'Search applications',70)}</Label>
    <Column x={40} y={130} w={1480} gap={22}>
      {[0,1,2,3].map(row=><Row key={row} w={1480} gap={14}>
        {keys.slice(row*10,row*10+10).map((key,column)=>{
          const index=row*10+column;
          return <Surface key={key} w={135} h={78} radius={layout.radius} tone={color.raised} borderWidth={state.key===index?layout.focusWidth:0} borderColor={color.white}>
            <Label style={type.nav} w={135} h={78}>{key}</Label>
          </Surface>;
        })}
      </Row>)}
    </Column>
    <Label style={type.caption} w={1200} h={18} color={color.secondary} x={40} y={620}>{'Cross types / DONE shows results / Circle closes the keyboard'}</Label>
  </View>;
}
export function Modal({state}){
  const entry=catalog.find(item=>item.id===state.detailId);
  const messages={
    catalog:'Published catalog revision '+revision+', '+catalog.length+' entries. This package loads its validated bundled snapshot. Online refresh is not connected; use the native sync command and rebuild to update.',
    collections:'Favorites and library listings are stored separately in one application preferences file. Saved listings are not installed packages. A failed save keeps session changes usable and shows a notice.',
    storage:'Storage unavailable. This build does not query PS4 internal capacity, so no number is presented as console storage.',
    controls:'Cross opens or confirms. Circle returns. D-pad and the left analog stick move focus. Up from the first card selects the shelf action. Triangle toggles a favorite. The PS menu closes the application.',
    about:'Voidplay [BETA] 01.05. Native React / QuickJS / OpenOrbis with bundled Manrope. Public web store views are adapted for controller navigation; the owner studio stays on web.',
    source:entry?.sources?.map((source,index)=>(index+1)+'. '+(source.provider||'Provider')+': '+source.url).join('   ')||'No source links configured. Real downloads and installation are unavailable.',
    trailer:entry?.trailerUrl||'No trailer URL published. Native YouTube playback is not available.',
    transfer:'Real console transfers are unavailable in this build. Downloads uses an explicitly labelled simulation for its queue controls; no file, network speed or installation is measured.',
    screenshot:(entry?.screenshots?.[state.detailItem]?.description)||'No screenshot description published.',
  };
  return <View style={at(290,315,1340,480,{backgroundColor:color.raised,borderRadius:18,borderWidth:1,borderColor:'#555555'})}>
    <Column x={50} y={45} w={1240} gap={20}>
      <Label style={{fontSize:38,lineHeight:46,fontWeight:fontWeight.semibold}} w={1240} h={46}>{state.modal[0].toUpperCase()+state.modal.slice(1)}</Label>
      <Body w={1240} lines={9} style={{fontSize:24,lineHeight:34,fontWeight:fontWeight.regular}}>{cut(messages[state.modal]||'',900)}</Body>
      <Label style={type.caption} w={1240} h={18} color={color.secondary}>{'Circle back / Cross close'}</Label>
    </Column>
  </View>;
}
export function Background(){return <View style={at(0,0,layout.width,layout.height,{backgroundColor:color.background})}/>;}

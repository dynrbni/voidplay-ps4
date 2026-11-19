// SPDX-License-Identifier: GPL-3.0-only
/* Controller focus model.
   Discover is one vertically scrolling page: section 0 is the hero and sections
   1..n are the shelves. Inside a shelf, item 0 is that shelf's "View all" action
   and items 1..n are its cards, so the D-pad keeps a stable column while the page
   and the shelf row scroll independently. */
import snapshot from './catalog.json' with { type: 'json' };
import {paragraphs,metadataRows} from './content-blocks.mjs';
import { startDemo, advance, command } from './transfers.mjs';

export const catalog = snapshot.entries;
export const revision = snapshot.revision;
export const previewMode = snapshot.previewMode;
export const tabs = ['discover', 'browse', 'downloads', 'library', 'favorites', 'search', 'settings'];
export const categories = ['All', ...new Set(catalog.map(entry => entry.category))];
export const keys = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 'SPACE', 'DEL', 'CLEAR', 'DONE'];
export const GRID_COLUMNS = 6;

export function shelves(entries = catalog) {
  return [
    { title: 'Discover on Voidplay', format: 'poster', entries },
    { title: 'Tools & utilities', format: 'landscape', entries: entries.filter(entry => entry.category === 'Utilities') },
    { title: 'Picture & sound', format: 'landscape', entries: entries.filter(entry => entry.category === 'Media') },
  ].filter(shelf => shelf.entries.length > 0);
}
export function related(entry, entries = catalog) {
  if (!entry) return [];
  const rest = entries.filter(item => item.id !== entry.id);
  const same = rest.filter(item => item.category === entry.category);
  return (same.length ? same : rest).slice(0, 24);
}
export function relatedTitle(entry, entries = catalog) {
  const same = entries.some(item => item.id !== entry?.id && item.category === entry?.category);
  return same ? 'More in ' + String(entry?.category ?? '').toLowerCase() : 'More to explore';
}
export function detailSections(entry, entries = catalog) {
  if (!entry) return [];
  const sections = [
    { key: 'about', title: 'About this application', items: paragraphs(entry.description).length+1+(entry.releaseNotes?paragraphs(entry.releaseNotes).length:0) },
    { key: 'information', title: 'Application information', items: metadataRows(entry).length },
    { key: 'sources', title: 'Download sources', items: entry.sources?.length ?? 0 },
  ];
  if (entry.screenshots?.length) sections.push({ key: 'screenshots', title: 'Screenshots', items: entry.screenshots.length });
  if (entry.trailerUrl) sections.push({ key: 'trailer', title: 'Trailer', items: 1 });
  const more = related(entry,entries);
  if (more.length) sections.push({ key: 'related', title: relatedTitle(entry), items: more.length, entries: more });
  return sections;
}
export function visible(state, entries = catalog) {
  if (state.screen === 'favorites') entries = entries.filter(entry => state.favorites.includes(entry.id));
  if (state.screen === 'library') entries = entries.filter(entry => state.library.includes(entry.id));
  if (state.screen === 'browse' || state.screen === 'search') {
    const query = state.query.trim().toLowerCase();
    entries = entries.filter(entry => (state.category === 'All' || entry.category === state.category) &&
      [entry.title, entry.description, entry.summary, entry.category, ...entry.genres].join(' ').toLowerCase().includes(query));
    if (state.sort === 'title') entries = [...entries].sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 : a.title.toLowerCase() > b.title.toLowerCase() ? 1 : 0);
  }
  return entries;
}
export function jobActions(job) {
  if (!job) return [];
  if (job.status === 'paused') return ['resume', 'cancel'];
  if (job.status === 'completed' || job.status === 'cancelled') return ['retry'];
  return ['pause', 'cancel'];
}
export function gridRows(count) { return Math.max(1, Math.ceil(count / GRID_COLUMNS)); }

export const initial = (saved = {}) => ({
  screen: 'discover', zone: 'content', tab: 0,
  section: 0, item: 0, shelfAction: 0,
  index: 0, filter: 0, jobButton: 0,
  detailId: '', detailSection: 1, detailItem: 0, returnScreen: 'discover', returnSection: 1, returnItem: 1,
  query: '', category: 'All', sort: 'curated',
  featuredId: catalog[0]?.id ?? '',
  favorites: [], library: [], reduceMotion: false, scrolled: false,
  modal: '', key: 0, notice: '', jobs: [],
  ...saved,
});
const toFooter=state=>({...state,zone:'footer',footerReturn:state.zone});
const clamp = (value, max) => Math.max(0, Math.min(value, Math.max(0, max)));
const toggle = (state, key, id) => ({ ...state, [key]: state[key].includes(id) ? state[key].filter(value => value !== id) : [...state[key], id] });
function sectionCount(section, entries = catalog) {
  if (section === 0) return 2;
  const shelf = shelves(entries)[section - 1];
  return shelf ? shelf.entries.length + 1 : 0;
}
const focusItem = (section, item, entries = catalog) => clamp(item, sectionCount(section,entries) - 1);
function route(state, tab) {
  const screen = tabs[tab];
  return {
    ...state, screen, tab, zone: 'header', index: 0, section: 1, item: 1, filter: 0, jobButton: 0,
    detailSection: 1, detailItem: 0, modal: '',
  };
}
export function openDetail(state, entry) {
  if (!entry) return state;
  return {
    ...state, screen: 'details', modal: '', detailId: entry.id, detailSection: 1, detailItem: 0,
    returnScreen: state.screen, returnSection: state.section, returnItem: state.item,
    returnIndex: state.index, returnZone:state.zone, zone: 'detail',
  };
}
function moveDiscover(state, action, entries) {
  const list = shelves(visible(state,entries));
  const last = Math.max(0, list.length);
  if (action === 'left' || action === 'right') {
    if (state.section === 0) return { ...state, item: state.item === 0 ? 1 : 0 };
    if (state.item === 0) return { ...state, item: 1 };
    const count = sectionCount(state.section,entries);
    return { ...state, item: Math.max(1, clamp(state.item + (action === 'left' ? -1 : 1), count - 1)) };
  }
  if (action === 'up') {
    if(state.section>0)return {...state,zone:'shelfactions',shelfAction:0};
    if (state.section === 0) return { ...state, zone: 'header' };
    if (state.item === 0) return state.section === 1 ? { ...state, section: 0, item: 0 } : { ...state, section: state.section - 1, item: 0 };
    if (state.item === 1) return { ...state, item: 0 };
    return state.section === 1 ? { ...state, section: 0, item: 0 } : { ...state, section: state.section - 1, item: focusItem(state.section - 1, state.item,entries) };
  }
  if (action === 'down') {
    if (state.section === 0) return last > 0 ? { ...state, section: 1, item: 1 } : state;
    if (state.item === 0) return { ...state, item: 1 };
    if (state.section < last) return { ...state, section: state.section + 1, item: Math.max(1, focusItem(state.section + 1, state.item,entries)) };
    return toFooter(state);
  }
  if (action === 'confirm') {
    if (state.section === 0) {
      const hero = entries.find(entry => entry.id === state.featuredId) ?? entries[0];
      if (!hero) return route(state,1);
      return state.item === 1 ? toggle(state, 'favorites', hero.id) : openDetail(state, hero);
    }
    const shelf = list[state.section - 1];
    if (!shelf) return state;
    if (state.item === 0) return route({ ...state, category: 'All' }, 1);
    const entry = shelf.entries[state.item - 1];
    return entry ? openDetail(state, entry) : state;
  }
  return state;
}
function moveGrid(state, action, entries) {
  const count = entries.length;
  if (action === 'left' || action === 'right') return { ...state, index: clamp(state.index + (action === 'left' ? -1 : 1), count - 1) };
  if (action === 'up') {
    if (state.index < GRID_COLUMNS) return { ...state, zone: state.screen === 'browse' || state.screen === 'search' ? 'filters' : 'header' };
    return { ...state, index: clamp(state.index - GRID_COLUMNS, count - 1) };
  }
  if (action === 'down') {
    const next = state.index + GRID_COLUMNS;
    if (next < count) return { ...state, index: next };
    return toFooter(state);
  }
  return state;
}
export function reduce(state,action){return reduceCatalog(state,action,catalog);}
export function reduceCatalog(state, action, entries) {
  if (typeof action === 'object') {
    if (action.type === 'notice') return { ...state, notice: action.message };
    if (action.type === 'scrolled') return state.scrolled === action.value ? state : { ...state, scrolled: action.value };
    if (action.type === 'tick') { const jobs = advance(state.jobs); return jobs === state.jobs ? state : { ...state, jobs }; }
    return state;
  }
  if (!['left', 'right', 'up', 'down', 'confirm', 'back', 'favorite'].includes(action)) return state;
  if (state.modal) {
    if (action === 'confirm' || action === 'back') return { ...state, modal: '' };
    return state;
  }
  if (state.zone === 'keyboard') {
    if (action === 'back') return { ...state, zone: 'filters' };
    if (action === 'up' || action === 'down') return { ...state, key: clamp(state.key + (action === 'up' ? -10 : 10), 39) };
    if (action === 'left' || action === 'right') return { ...state, key: Math.floor(state.key / 10) * 10 + clamp(state.key % 10 + (action === 'left' ? -1 : 1), 9) };
    if (action === 'confirm') {
      const key = keys[state.key];
      if (key === 'DONE') return { ...state, zone: 'content', index: 0 };
      const typed = key === 'DEL' ? state.query.slice(0, -1) : key === 'CLEAR' ? '' : (state.query + (key === 'SPACE' ? ' ' : key)).slice(0, 40);
      return { ...state, query: typed, index: 0 };
    }
    return state;
  }
  if(state.zone==='footer')return action==='up'||action==='back'?{...state,zone:state.footerReturn??'content'}:state;
  if (state.screen === 'details' && state.zone !== 'header') return moveDetails(state, action,entries);
  if (action === 'back') return state.screen === 'details' ? {...state,zone:'detail'} : state.zone === 'header' ? route(state, 0) : { ...state, zone: 'header' };
  if (state.zone === 'header') {
    if (action === 'left' || action === 'right') return { ...state, tab: clamp(state.tab + (action === 'left' ? -1 : 1), tabs.length - 1) };
    if (action === 'confirm') return route(state, state.tab);
    if (action === 'down') {
      if (state.screen === 'details') return {...state,zone:'detail',detailItem:0};
      if (state.screen === 'discover') return { ...state, zone: 'content', section: 0, item: 0 };
      return { ...state, zone: state.screen === 'browse' || state.screen === 'search' ? 'filters' : 'content', index: 0 };
    }
    return state;
  }
  if (state.screen === 'discover') {
    if(state.zone==='shelfactions'){
      if(action==='left'||action==='right')return {...state,shelfAction:clamp(state.shelfAction+(action==='left'?-1:1),2)};
      if(action==='down')return {...state,zone:'content',item:Math.max(1,state.item)};
      if(action==='up')return {...state,zone:'content',section:Math.max(0,state.section-1),item:state.section===1?0:Math.max(1,focusItem(state.section-1,state.item,entries))};
      if(action==='confirm'){
        if(state.shelfAction===0){const shelf=shelves(entries)[state.section-1];return route({...state,category:state.section===1?'All':shelf?.entries[0]?.category??'All'},1);}
        return {...state,zone:'content',item:Math.max(1,focusItem(state.section,state.item+(state.shelfAction===1?-1:1),entries))};
      }
      return state;
    }
    if (action === 'favorite') {
      const list = shelves(visible(state,entries));
      const hero = entries.find(entry => entry.id === state.featuredId) ?? entries[0];
      if (state.section === 0) return hero ? toggle(state, 'favorites', hero.id) : state;
      const entry = list[state.section - 1]?.entries[state.item - 1];
      return entry ? toggle(state, 'favorites', entry.id) : state;
    }
    return moveDiscover(state, action,entries);
  }
  if (state.screen === 'settings') {
    if (action === 'up') return state.index === 0 ? { ...state, zone: 'header' } : { ...state, index: state.index - 1 };
    if (action === 'down') return state.index===6?toFooter(state):{ ...state, index:state.index+1 };
    if (action === 'confirm') {
      if (state.index === 6) return catalog[0] ? { ...route(state, 2), jobs: startDemo(state.jobs, catalog[0].id) } : state;
      if (state.index === 0) return { ...state, reduceMotion: !state.reduceMotion };
      return { ...state, modal: ['', 'catalog', 'collections', 'storage', 'controls', 'about'][state.index] };
    }
    return state;
  }
  if (state.screen === 'downloads') {
    if(!state.jobs.length){
      if(action==='up')return state.index===0?{...state,zone:'header'}:{...state,index:0};
      if(action==='down')return state.index===0?{...state,index:1}:toFooter(state);
      if(action==='confirm')return state.index===0?route(state,1):entries[0]?{...state,index:0,jobs:startDemo([],entries[0].id)}:state;
      return state;
    }
    const finished = state.jobs.some(job => ['completed', 'cancelled'].includes(job.status));
    const last = state.jobs.length - (finished ? 0 : 1);
    if (action === 'up') return state.index === 0 ? { ...state, zone: 'header' } : { ...state, index: Math.max(0, state.index - 1), jobButton: 0 };
    if (action === 'down') return { ...state, index: clamp(state.index + 1, Math.max(0, last)), jobButton: 0 };
    if (action === 'left' || action === 'right') {
      const job = state.jobs[state.index];
      const actions = jobActions(job);
      return actions.length ? { ...state, jobButton: clamp(state.jobButton + (action === 'left' ? -1 : 1), actions.length - 1) } : state;
    }
    if (action === 'confirm') {
      if (!state.jobs.length) return catalog[0] ? { ...state, jobs: startDemo(state.jobs, catalog[0].id) } : state;
      if (state.index === state.jobs.length) return { ...state, jobs: state.jobs.filter(job => !['completed', 'cancelled'].includes(job.status)), index: 0 };
      const job = state.jobs[state.index];
      if (!job) return state;
      const actions = jobActions(job);
      const chosen = actions[state.jobButton] ?? actions[0];
      return chosen ? { ...state, jobs: command(state.jobs, job.id, chosen) } : state;
    }
    return state;
  }
  const filtered = visible(state,entries);
  if (state.zone === 'filters') {
    if (action === 'up') return { ...state, zone: 'header' };
    if (action === 'down') return { ...state, zone: 'content', index: 0 };
    if (action === 'left' || action === 'right') return { ...state, filter: clamp(state.filter + (action === 'left' ? -1 : 1), 3) };
    if (action === 'confirm') {
      if (state.filter === 0) return { ...state, zone: 'keyboard', key: 0 };
      if (state.filter === 1) return { ...state, category: categories[(categories.indexOf(state.category) + 1) % categories.length], index: 0 };
      if (state.filter === 2) return { ...state, sort: state.sort === 'curated' ? 'title' : 'curated', index: 0 };
      return { ...state, query: '', category: 'All', sort: 'curated', index: 0 };
    }
    return state;
  }
  if (action === 'favorite') {
    const entry = filtered[state.index];
    return entry ? toggle(state, 'favorites', entry.id) : state;
  }
  if (action === 'confirm') {
    const entry = filtered[state.index];
    if (entry) return openDetail(state, entry);
    return state.screen === 'favorites' || state.screen === 'library' ? route(state, 1) : { ...state, zone: 'filters' };
  }
  return moveGrid(state, action, filtered);
}
function moveDetails(state, action,entries) {
  const entry = entries.find(item => item.id === state.detailId);
  const sections = detailSections(entry,entries);
  if (action === 'back') {
    if (state.zone === 'detailbody') return { ...state, zone: 'detail', detailSection: 1, detailItem: 0 };
    return { ...state, screen: state.returnScreen, zone: state.returnZone ?? 'content', section: state.returnSection ?? 1, item: state.returnItem ?? 1, index: state.returnIndex ?? 0 };
  }
  if (action === 'favorite') return entry ? toggle(state, 'favorites', entry.id) : state;
  if (state.zone === 'detail') {
    if (action === 'left' || action === 'right') return { ...state, detailItem: clamp(state.detailItem + (action === 'left' ? -1 : 1), 2) };
    if (action === 'up') return { ...state, zone: 'header', tab: 0 };
    if (action === 'down') return { ...state, zone: 'detailbody', detailSection: 1, detailItem: 0 };
    if (action === 'confirm') {
      if (!entry) return state;
      if (state.detailItem === 1) return toggle(state, 'favorites', entry.id);
      if (state.detailItem === 2) return { ...state, zone: 'detailbody', detailSection: 1, detailItem: 0 };
      return { ...state, modal: 'transfer' };
    }
    return state;
  }
  const section = sections[state.detailSection - 1];
  const items = section?.items ?? 0;
  if (action === 'left' || action === 'right') {
    if (!section || items === 0 || !['screenshots','related'].includes(section.key)) return state;
    return { ...state, detailItem: clamp(state.detailItem + (action === 'left' ? -1 : 1), items - 1) };
  }
  if (action === 'up') {
    if(section&&['about','information','sources'].includes(section.key)&&state.detailItem>0)return {...state,detailItem:state.detailItem-1};
    if (state.detailSection <= 1) return { ...state, zone: 'detail', detailItem: 0 };
    return { ...state, detailSection: state.detailSection - 1, detailItem: 0 };
  }
  if (action === 'down') {
    if(section&&['about','information','sources'].includes(section.key)&&state.detailItem+1<items)return {...state,detailItem:state.detailItem+1};
    if (state.detailSection >= sections.length) return toFooter(state);
    return { ...state, detailSection: state.detailSection + 1, detailItem: 0 };
  }
  if (action === 'confirm') {
    if (!entry || !section) return state;
    if (section.key === 'about') return state.detailItem===paragraphs(entry.description).length?toggle(state, 'library', entry.id):state;
    if (section.key === 'sources') return { ...state, modal: 'source' };
    if (section.key === 'trailer') return { ...state, modal: 'trailer' };
    if (section.key === 'related') { const next = related(entry,entries)[state.detailItem]; return next ? openDetail(state, next) : state; }
    if (section.key === 'screenshots') return { ...state, modal: 'screenshot' };
    return state;
  }
  return state;
}

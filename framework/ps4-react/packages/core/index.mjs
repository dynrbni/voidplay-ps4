// SPDX-License-Identifier: GPL-3.0-only
import React from 'react';
import Reconciler from 'react-reconciler';
import { layout } from './layout.mjs';
import { subscribeScroll } from './layout.mjs';
export { resolveWeight, bakedWeight, resolveFontFamily, resetScrollState, scrollState, FONT_FAMILY, BAKED_WEIGHTS } from './layout.mjs';
const native=globalThis.__ps4Native;
if(!native)throw new Error('PS4 React requires a native host');
let timers=new Map(),nextTimer=1,microtasks=[],listeners=new Set();
globalThis.performance={now:()=>native.now()};
globalThis.setTimeout=(fn,delay=0,...args)=>{if(timers.size>=256)throw new Error('Timer limit exceeded');const id=nextTimer++;timers.set(id,{at:native.now()+Math.max(0,Math.min(Number(delay)||0,60000)),fn:()=>fn(...args)});return id;};
globalThis.clearTimeout=id=>timers.delete(id);
globalThis.queueMicrotask=fn=>{if(microtasks.length>=256)throw new Error('Microtask limit exceeded');microtasks.push(fn);};
globalThis.console={log:(...args)=>native.log(args.join(' ')),warn:(...args)=>native.log(args.join(' ')),error:(...args)=>native.log(args.join(' '))};
export const View='View',Text='Text',Image='Image',ScrollView='ScrollView';
const hostTypes=['View','Text','Image','ScrollView'];
export const Preferences=Object.freeze({load:()=>native.loadPreferences(),save:value=>native.savePreferences(value)});
export const Motion=Object.freeze({setEnabled:value=>native.motion(Boolean(value))});
export const Diagnostics=Object.freeze({report:()=>native.diagnostics()});
export const Scroll=Object.freeze({subscribe(listener){return subscribeScroll(listener);}});
export const Controller=Object.freeze({subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}});
let latestLayout=null;
const container={children:[]};
globalThis.__ps4Inspect=()=>JSON.stringify(latestLayout);
function invalidate(node){for(let at=node;at;at=at.parent)at.__measureDirty=true;}
function append(parent,child){remove(parent,child);child.parent=parent;parent.children.push(child);invalidate(parent);}
function remove(parent,child){const i=parent.children.indexOf(child);if(i>=0){parent.children.splice(i,1);child.parent=null;invalidate(parent);}}
function insert(parent,child,before){remove(parent,child);const at=parent.children.indexOf(before);if(at<0)throw new Error('Missing insertion target');child.parent=parent;parent.children.splice(at,0,child);invalidate(parent);}
const renderer=Reconciler({
  now:()=>native.now(),supportsMutation:true,isPrimaryRenderer:true,supportsPersistence:false,supportsHydration:false,
  getRootHostContext:()=>null,getChildHostContext:()=>null,getPublicInstance:instance=>instance,
  prepareForCommit:()=>null,resetAfterCommit:()=>{latestLayout=layout(container,native);},createInstance(type,props){if(!hostTypes.includes(type))throw new Error('Use PS4 React View/Text/Image/ScrollView, not DOM elements');return{type,props,children:[],__layoutCacheable:true,__measureDirty:true,styleKey:JSON.stringify(props.style??{})};},
  appendInitialChild:append,finalizeInitialChildren:()=>false,shouldSetTextContent:()=>false,
  createTextInstance:text=>({type:'raw',text,children:[]}),prepareUpdate:()=>true,
  commitUpdate(instance,_payload,_type,_old,props){const styleKey=JSON.stringify(props.style??{});if(instance.styleKey!==styleKey){instance.styleKey=styleKey;invalidate(instance);}instance.props=props;},commitTextUpdate(instance,_old,text){instance.text=text;invalidate(instance);},
  appendChild:append,appendChildToContainer:append,removeChild:remove,removeChildFromContainer:remove,insertBefore:insert,insertInContainerBefore:insert,
  clearContainer(parent){for(const child of parent.children)child.parent=null;parent.children=[];invalidate(parent);},resetTextContent(instance){instance.children=[];},
  scheduleTimeout:(...args)=>globalThis.setTimeout(...args),cancelTimeout:id=>globalThis.clearTimeout(id),noTimeout:-1,
  getCurrentEventPriority:()=>1,beforeActiveInstanceBlur(){},afterActiveInstanceBlur(){},preparePortalMount(){},detachDeletedInstance(){},
  supportsMicrotasks:true,scheduleMicrotask:fn=>globalThis.queueMicrotask(fn)
});
let root=null,registered=false;
export const AppRegistry=Object.freeze({
  registerComponent(name,provider){
    if(registered)throw new Error('Only one application can be registered');
    if(typeof name!=='string'||!name||typeof provider!=='function')throw new Error('Invalid application registration');
    const Component=provider();if(typeof Component!=='function')throw new Error('Provider must return a component');
    registered=true;root=renderer.createContainer(container,0,null,false,null,'',error=>{throw error;},null);
    renderer.updateContainer(React.createElement(Component),root,null,()=>native.log('Registered '+name+' | '+native.diagnostics()));
    renderer.flushPassiveEffects();
  }
});
globalThis.__ps4Input=action=>{for(const listener of listeners)listener(action);renderer.flushPassiveEffects();};
globalThis.__ps4Tick=now=>{let jobs=0;while(microtasks.length){if(++jobs>256)throw new Error('Microtask budget exceeded');microtasks.shift()();}for(const[id,timer]of Array.from(timers)){if(timer.at<=now){timers.delete(id);timer.fn();}}renderer.flushPassiveEffects();};
globalThis.__ps4Dispose=()=>{if(root)renderer.updateContainer(null,root,null,null);renderer.flushPassiveEffects();timers.clear();microtasks=[];listeners.clear();};

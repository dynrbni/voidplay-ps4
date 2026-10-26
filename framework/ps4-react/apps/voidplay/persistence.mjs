// SPDX-License-Identifier: GPL-3.0-only
const validIds=value=>Array.isArray(value)&&value.length<=500&&value.every(id=>typeof id==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)&&id.length<=80);
export function parsePreferences(raw){
 if(!raw)return{favorites:[],library:[],reduceMotion:false};
 const value=JSON.parse(raw);
 if(value.version!==1||!validIds(value.favorites)||!validIds(value.library)||typeof value.reduceMotion!=='boolean')throw new Error('Saved preferences are invalid. Session mode is available; your existing file was preserved.');
 return{favorites:[...new Set(value.favorites)],library:[...new Set(value.library)],reduceMotion:value.reduceMotion};
}
export const serializePreferences=state=>JSON.stringify({version:1,favorites:state.favorites,library:state.library,reduceMotion:state.reduceMotion});

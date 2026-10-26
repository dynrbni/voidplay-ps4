// SPDX-License-Identifier: GPL-3.0-only
export const ascii=value=>Array.isArray(value)?value.map(ascii).join(''):String(value??'').normalize('NFKD').replace(/[^\x20-\x7e\n]/g,'');
export const cut=(value,max)=>ascii(value).slice(0,max)+(ascii(value).length>max?'...':'');
export function lines(value,width){
 const output=[];
 for(const paragraph of ascii(value).split('\n')){
  let line='';for(const token of paragraph.split(/\s+/)){
   for(let at=0;at<token.length;at+=width){const word=token.slice(at,at+width);if((line+' '+word).trim().length>width){output.push(line);line=word;}else line=(line+' '+word).trim();}
  }output.push(line);
 }return output;
}
export const wrap=(value,width,max=5)=>lines(value,width).slice(0,max).join('\n');

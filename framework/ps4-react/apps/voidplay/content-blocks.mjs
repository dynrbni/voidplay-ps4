// SPDX-License-Identifier: GPL-3.0-only
import {ascii} from './format.mjs';
import {bytes} from './transfers.mjs';
// Bounded text nodes retain all published text while staying below the native bridge limit.
export function paragraphs(value){
 const output=[];
 for(const paragraph of ascii(value).split('\n')){
  let remaining=paragraph;
  while(remaining.length>600){let at=remaining.lastIndexOf(' ',600);if(at<200)at=600;output.push(remaining.slice(0,at));remaining=remaining.slice(at).trimStart();}
  if(remaining)output.push(remaining);
 }
 return output.length?output:['Not provided'];
}
export function metadataRows(entry){
 const rows=[['Title',entry.title],['Category',entry.category],['Author',entry.author],['Version',entry.version],
  ['Genres',entry.genres.join(' / ')],['Released',entry.releaseDate],['File',bytes(entry.fileSize)+(entry.fileFormat?' / '+entry.fileFormat:'')],
  ['Interface languages',entry.languages.interface.join(', ')],['Audio languages',entry.languages.audio.join(', ')],['Subtitles',entry.languages.subtitles.join(', ')],
  ['Compatibility',entry.compatibility.status+' / '+entry.compatibility.firmwares.join(', ')],['Compatibility notes',entry.compatibility.notes],['Firmware evidence (catalog claim)',entry.compatibility.evidence],
  ['License',entry.license],['Redistribution (catalog claim)',entry.redistribution.statement],['Authorization reference',entry.redistribution.referenceUrl]];
 return rows.flatMap(([label,value])=>paragraphs(value).map((text,index)=>[label+(index?' (continued)':''),text]));
}

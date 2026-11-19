// SPDX-License-Identifier: GPL-3.0-only
import {lines} from './format.mjs';
import {bytes} from './transfers.mjs';
export function detailLines(entry,page){
 const rows=[];
 const add=(label,value)=>{rows.push(label.toUpperCase(),...lines(value||'Not provided',102),'');};
 if(page===1){add('About this application',entry.description||entry.summary);add('Release notes',entry.releaseNotes);}
 if(page===2){
  add('Title',entry.title||entry.id);add('Category / developer',[entry.category,entry.author].filter(Boolean).join(' / '));
  add('Version / release date',[entry.version,entry.releaseDate].filter(Boolean).join(' / '));
  add('Genres',entry.genres.join(' / '));add('File',bytes(entry.fileSize)+' / '+(entry.fileFormat||'Format unknown'));
  for(const kind of ['interface','audio','subtitles'])add(kind+' languages',entry.languages[kind].join(', '));
  add('Compatibility - catalog claim only',entry.compatibility.notes);add('Firmware / evidence',[entry.compatibility.firmwares.join(', '),entry.compatibility.evidence].filter(Boolean).join(' / '));
  add('License',entry.license);add('Redistribution statement - not independently verified',entry.redistribution.statement);
 }
 if(page===3){
  rows.push('PS4 TRANSFER UNAVAILABLE','Configured sources are metadata. No file is downloaded or installed.','');
  if(!entry.sources.length)rows.push('No sources configured.');
  entry.sources.forEach((source,i)=>{add('Source '+(i+1)+' / '+(source.provider||'Provider not supplied'),source.url);add('Expected size',bytes(source.expectedSize));add('SHA-256',source.sha256||'Not provided; integrity unverified');add('Authentication',source.authentication.required?source.authentication.instructions||'Required; check provider':'Not required');});
 }
 if(page===5){add('Trailer URL',entry.trailerUrl);add('Playback','YouTube playback requires a video/browser integration. This native renderer does not execute an iframe.');}
 return rows;
}

import {lookup} from 'node:dns/promises';
import {request} from 'node:https';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {manifestSchema,httpsUrl} from '../shared/catalog.ts';
import {publicAddress} from '../server/artwork.ts';
const app=fileURLToPath(new URL('../framework/ps4-react/apps/voidplay/',import.meta.url));
const endpoint='https://dynrbni.github.io/voidplay-ps4/catalog.json';
async function resource(value:string,limit:number,redirects=0):Promise<{data:Buffer;type:string}>{
 const url=new URL(httpsUrl.parse(value));if(url.port&&url.port!=='443')throw new Error('Only HTTPS port 443 is supported.');
 if(redirects>3)throw new Error('Too many redirects.');
 const addresses=await lookup(url.hostname,{all:true});
 if(!addresses.length||addresses.some(item=>!publicAddress(item.address)))throw new Error('URL must resolve to public addresses.');
 const address=addresses.find(item=>item.family===4)??addresses[0]!;
 return new Promise((resolve,reject)=>{
  const outgoing=request(url,{signal:AbortSignal.timeout(15000),lookup:(_host,options,callback)=>{if(options.all)callback(null,[address]);else callback(null,address.address,address.family);},headers:{'User-Agent':'Voidplay-Native-Catalog-Sync/0.1'}},response=>{
   const status=response.statusCode??0;
   if([301,302,303,307,308].includes(status)&&response.headers.location){response.destroy();resource(new URL(response.headers.location,url).href,limit,redirects+1).then(resolve,reject);return;}
   if(status!==200){response.destroy();reject(new Error(`HTTP ${status}`));return;}
   const chunks:Buffer[]=[];let bytes=0;
   response.on('data',(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>limit){response.destroy(new Error('Resource exceeds size limit.'));return;}chunks.push(chunk);});
   response.on('error',reject);response.on('end',()=>resolve({data:Buffer.concat(chunks),type:response.headers['content-type']?.split(';')[0]??''}));
  });outgoing.on('error',reject);outgoing.end();
 });
}
const snapshot=manifestSchema.parse(JSON.parse((await resource(endpoint,2_000_000)).data.toString('utf8')));
if(snapshot.previewMode)throw new Error('Native sync requires a published real catalog, not preview fixtures.');
const previous=JSON.parse(await readFile(app+'assets/manifest.json','utf8')) as {font:unknown;background:string;covers:Record<string,unknown>};
const covers:Record<string,{asset:string;file:string;heroFile:string;screenshots:string[];source:string;credit:string}>={};
const cached=new Map<string,string>();
await mkdir(app+'assets/catalog',{recursive:true});
async function image(url:string){
 const remote=new URL(url,endpoint).href;if(cached.has(remote))return cached.get(remote)!;
 const result=await resource(remote,8_000_000);
 if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(result.type))throw new Error('Use a direct PNG/JPEG/WebP/GIF/AVIF artwork URL.');
 const file='catalog/'+createHash('sha256').update(result.data).digest('hex').slice(0,24)+'.img';
 await writeFile(app+'assets/'+file,result.data,{flag:'wx'}).catch((error:NodeJS.ErrnoException)=>{if(error.code!=='EEXIST')throw error;});cached.set(remote,file);return file;
}
for(const entry of snapshot.entries.slice(0,24)){
 const url=entry.coverUrl||entry.heroUrl;if(!url)continue;
 try{
  const file=await image(url);let heroFile=file;
  if(entry.heroUrl&&entry.heroUrl!==url){try{heroFile=await image(entry.heroUrl);}catch(error){console.warn(`${entry.id}: hero fallback to cover: ${String(error)}`);}}
  const screenshots:string[]=[];
  for(const shot of entry.screenshots){try{screenshots.push(await image(shot.url));}catch(error){console.warn(`${entry.id}: screenshot not bundled: ${String(error)}`);screenshots.push('');}}
  covers[entry.id]={asset:'entry-'+createHash('sha256').update(entry.id).digest('hex').slice(0,16),file,heroFile,screenshots,source:url,credit:`Artwork from published owner catalog: ${entry.author||entry.id}. Metadata reference only; no game package.`};
 }catch(error){console.warn(`${entry.id}: artwork unavailable; native text fallback: ${String(error)}`);}
}
const manifest={...previous,covers};
await writeFile(app+'assets/manifest.json.tmp',JSON.stringify(manifest,null,2)+'\n');
await writeFile(app+'catalog.json.tmp',JSON.stringify(snapshot,null,2)+'\n');
await rename(app+'assets/manifest.json.tmp',app+'assets/manifest.json');await rename(app+'catalog.json.tmp',app+'catalog.json');
console.log(`Native catalog synced: r${snapshot.revision}, ${snapshot.entries.length} entries, ${Object.keys(covers).length} local artwork sets. Rebuild the PKG to apply.`);

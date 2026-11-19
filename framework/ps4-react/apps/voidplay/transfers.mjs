// SPDX-License-Identifier: GPL-3.0-only
const MiB=1024*1024;
export const bytes=value=>value?value>=MiB?`${(value/MiB).toFixed(1)} MiB`:`${value} bytes`:'Unknown size';
export function startDemo(jobs,id){
 const existing=jobs.find(job=>job.id===id);
 if(existing&&['queued','downloading','paused'].includes(existing.status))return jobs;
 return[...jobs.filter(job=>job.id!==id),{id,status:'queued',received:0,total:128*MiB,speed:0}];
}
export function advance(jobs){
 const index=jobs.findIndex(job=>job.status==='downloading'||job.status==='queued');
 if(index<0)return jobs;
 return jobs.map((job,i)=>{if(i!==index)return job;const received=Math.min(job.total,job.received+8*MiB);return{...job,received,speed:received===job.total?0:8*MiB,status:received===job.total?'completed':'downloading'};});
}
export function command(jobs,id,action){return jobs.map(job=>{
 if(job.id!==id)return job;
 if(action==='pause'&&['queued','downloading'].includes(job.status))return{...job,status:'paused',speed:0};
 if(action==='resume'&&job.status==='paused')return{...job,status:'queued'};
 if(action==='cancel')return{...job,status:'cancelled',speed:0};
 if(action==='retry')return{...job,status:'queued',received:0,speed:0};
 return job;
});}

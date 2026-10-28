/* Counts of created records; never calculates wallet balances or paid revenue. */
(function(root){
'use strict';
const durations={'24 Hours':86400000,'7 Days':7*86400000,'30 Days':30*86400000};
function time(value){
 try{
  const ms=value?.toMillis?value.toMillis():value instanceof Date?value.getTime():typeof value?.seconds==='number'?value.seconds*1000+Math.floor((value.nanoseconds||0)/1e6):typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(ms)&&ms>0?ms:null;
 }catch(_){return null;}
}
function compare(rows,period,now=Date.now()){
 const duration=durations[period]||durations['7 Days'];let current=0,previous=0,missing=0,future=0;
 for(const row of rows){const ms=time(row.raw?.createdAt);if(ms===null){missing++;continue;}if(ms>now){future++;continue;}if(ms>now-duration)current++;else if(ms>now-2*duration)previous++;}
 const growth=previous===0?(current===0?'No change':'New records'):((current-previous)/previous*100>=0?'+':'')+((current-previous)/previous*100).toFixed(1)+'%';
 return {current,previous,missing,future,growth,start:now-duration,end:now};
}
const api={time,compare};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HubOverview=api;
})(typeof window!=='undefined'?window:globalThis);

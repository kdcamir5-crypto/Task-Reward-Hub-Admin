/* Bounded user reads and server-side counts. No profile or wallet writes. */
(function(root){
'use strict';
const pageSize=25,durations={'24 Hours':86400000,'7 Days':7*86400000,'30 Days':30*86400000};
function createPager(db,fieldPath){
 let rows=[],cursor=null,more=true,busy=false,failed=false,generation=0;
 function state(){return {rows:[...rows],more,busy,failed};}
 function reset(){generation++;rows=[];cursor=null;more=true;busy=false;failed=false;}
 async function next(){
  if(busy||!more)return state();const version=generation;busy=true;failed=false;
  try{
   let query=db.collection('users').orderBy(fieldPath).limit(pageSize);if(cursor)query=query.startAfter(cursor);
   const snap=await query.get({source:'server'});if(version!==generation)return state();
   const docs=snap.docs;const known=new Set(rows.map(r=>r.id));for(const d of docs)if(!known.has(d.id)){rows.push({...d.data(),id:d.id});known.add(d.id);}
   if(docs.length)cursor=docs.at(-1);more=docs.length===pageSize;
  }catch(_){if(version===generation)failed=true;}
  finally{if(version===generation)busy=false;}
  return state();
 }
 return {state,reset,next};
}
function matches(data,id,query,filter,status){
 return [data.name,data.full_name,data.fullName,data.displayName,data.userName,data.email,data.phone,data.telegram,id,data.collectorId,data.collector_id,status].join(' ').toLowerCase().includes(query.trim().toLowerCase())&&(filter==='All'||filter===status);
}
async function summary(user,project,period,now=Date.now(),fetcher=(...args)=>root.fetch(...args)){
 const duration=durations[period]||durations['7 Days'];
 if(!user?.uid||!project)throw Error('USER_COUNT_UNAVAILABLE');
 const token=await user.getIdToken(),url='https://firestore.googleapis.com/v1/projects/'+encodeURIComponent(project)+'/databases/(default)/documents:runAggregationQuery';
 const range=(start,end)=>({compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'createdAt'},op:'GREATER_THAN',value:{timestampValue:new Date(start).toISOString()}}},{fieldFilter:{field:{fieldPath:'createdAt'},op:'LESS_THAN_OR_EQUAL',value:{timestampValue:new Date(end).toISOString()}}}]}});
 async function count(where){
  const response=await fetcher(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},redirect:'error',signal:AbortSignal.timeout(15000),body:JSON.stringify({structuredAggregationQuery:{structuredQuery:{from:[{collectionId:'users'}],...(where?{where}:{})},aggregations:[{alias:'n',count:{}}]}})});
  if(!response.ok)throw Error('USER_COUNT_UNAVAILABLE');
  const body=await response.json(),value=Array.isArray(body)?body.find(r=>r.result?.aggregateFields?.n)?.result.aggregateFields.n.integerValue:undefined;
  const number=Number(value);if(value===undefined||!Number.isSafeInteger(number)||number<0)throw Error('USER_COUNT_UNAVAILABLE');return number;
 }
 const [total,current,previous,valid,future]=await Promise.all([count(),count(range(now-duration,now)),count(range(now-2*duration,now-duration)),count(range(0,now)),count({fieldFilter:{field:{fieldPath:'createdAt'},op:'GREATER_THAN',value:{timestampValue:new Date(now).toISOString()}}})]);
 const growth=previous===0?(current===0?'No change':'New records'):((current-previous)/previous*100>=0?'+':'')+((current-previous)/previous*100).toFixed(1)+'%';
 return {total,period,current,previous,missing:Math.max(0,total-valid-future),future,growth,start:now-duration,end:now};
}
const api={createPager,matches,summary,pageSize};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HubUsersData=api;
})(typeof window!=='undefined'?window:globalThis);

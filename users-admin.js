/* Bounded server pages, progressive global search and read-only member details. */
(function(){
'use strict';
const pageSize=25,escape=escapeHtml;
let page=1,signature='',requestVersion=0,pager=null,owner=null,started=false,listVersion=0;
const Core=window.HubUsersData;
function valid(){return !!(currentAdmin&&auth.currentUser?.uid===currentAdmin.uid);}
function reset(){listVersion++;pager?.reset();page=1;signature='';started=false;}
function ensure(){if(!valid())return false;if(owner!==currentAdmin.uid){pager?.reset();pager=Core.createPager(db,firebase.firestore.FieldPath.documentId());owner=currentAdmin.uid;reset();}return true;}
function matching(){return pager.state().rows.filter(d=>Core.matches(d,d.id,state.query,state.filter,userStatus(d.status)));}
async function loadNext(advance=false){if(!ensure())return;const actor=owner,active=pager,version=listVersion;if(active.state().busy)return;started=true;await active.next();if(!valid()||owner!==actor||pager!==active||version!==listVersion)return;if(advance&&!active.state().failed)page++;if(state.page==='users')render();}
const details=document.createElement('dialog');
details.setAttribute('aria-label','Member details');
details.style.cssText='border:1px solid #dce5f2;border-radius:18px;padding:22px;width:min(560px,94vw);max-height:85vh;overflow:auto;box-sizing:border-box;color:#17243c';
document.body.appendChild(details);
const previousDataPage=dataPage;
dataPage=function(kind){
 if(kind!=='users')return previousDataPage(kind);
 if(!ensure())return heading('Users','Sign in with an authorized administrator account.');
 const nextSignature=state.query+'\n'+state.filter;
 if(signature!==nextSignature){page=1;signature=nextSignature;}
 if(!started)void loadNext();
 const result=pager.state(),rows=matching(),pages=Math.max(1,Math.ceil(rows.length/pageSize));
 page=Math.max(1,Math.min(page,pages));
 const shown=rows.slice((page-1)*pageSize,page*pageSize),filtered=!!state.query.trim()||state.filter!=='All';
 const next=page<pages||result.more;
 return heading('Users','Profiles are fetched from Firebase in batches of 25.','<button class="btn" data-users-refresh '+(result.busy?'disabled':'')+'>Refresh users</button>')+
 '<div class="section-summary"><div class="summary-card" data-users-summary><div class="small-label">Registered Members</div><strong>'+(userSummary?.total??'—')+'</strong></div><div class="summary-card" data-users-summary><div class="small-label">Matches found so far</div><strong>'+rows.length+'</strong></div><div class="summary-card" data-users-summary><div class="small-label">Profiles checked</div><strong>'+result.rows.length+'</strong></div></div>'+
 '<section class="panel table-panel"><div class="panel-head"><div><div class="panel-title">Members</div><div class="panel-subtitle">'+(filtered?'Search covers profiles checked so far. Continue search checks the next 25; repeat until all profiles are checked.':'25 profiles per server request. Previous pages reuse loaded records.')+'</div></div><div class="section-tools"><input id="tableSearch" aria-label="Search members" placeholder="Search name, email, UID or Collector ID..." value="'+escape(state.query)+'"><select class="select" id="statusFilter" aria-label="Member status">'+['All','Active','Pending','Approved','Rejected'].map(s=>'<option>'+s+'</option>').join('')+'</select></div></div>'+
 (result.failed?'<p role="status" style="padding:12px;color:#b43245">Could not load the next batch. Retry to continue from the same place.</p>':'')+
 '<div class="table-wrap"><table><thead><tr><th>Member</th><th>User ID</th><th>Main balance</th><th>Status</th><th>Details</th></tr></thead><tbody>'+shown.map(d=>'<tr><td><strong>'+escape(getField(d,['name','full_name','fullName','displayName','userName'],'Unnamed user'))+'</strong><br><small>'+escape(d.email||d.phone||d.telegram||'—')+'</small></td><td>'+escape(d.id)+'</td><td>'+escape(formatMoney(d.balance))+'</td><td>'+statusBadge(userStatus(d.status))+'</td><td><button class="btn" data-user-details="'+escape(d.id)+'">Details</button></td></tr>').join('')+'</tbody></table></div>'+
 (!rows.length?'<div class="empty-state">'+(result.busy?'Loading profiles…':result.failed?'Profile data unavailable. Retry below.':result.more?'No matches in checked profiles yet. Continue search to check more members.':'No matching members. All profiles have been checked.')+'</div>':'')+
 '<div class="table-footer"><span>'+rows.length+' matches in '+result.rows.length+' checked profiles'+(result.more?' · More profiles available':' · All profiles checked')+'</span><div class="footer-buttons"><button class="page-btn" data-user-page="previous" '+(page===1||result.busy?'disabled':'')+'>Previous</button><span>Page '+page+'</span><button class="page-btn" data-user-page="next" '+(!next||result.busy?'disabled':'')+'>'+(result.busy?'Loading…':result.failed?'Retry':page<pages?'Next':filtered?'Continue search (25)':'Next (25)')+'</button></div></div></section>';
};
function date(value){
 const ms=value?.toMillis?value.toMillis():value?.seconds?value.seconds*1000:typeof value==='number'?value:typeof value==='string'?Date.parse(value):NaN;
 return Number.isFinite(ms)?new Date(ms).toLocaleString('bn-BD',{timeZone:'Asia/Dhaka'}):'—';
}
function amount(value,currency='BDT'){return typeof value==='number'&&Number.isFinite(value)?(currency==='USD'?'$':'৳')+value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}):'—';}
function detailBody(id,d){
 const fields=[['User ID',id],['Collector ID',d.collectorId||d.collector_id||'—'],['Name',getField(d,['name','full_name','fullName','displayName','userName'],'—')],['Email',d.email||'—'],['Phone',d.phoneNumber||d.phone||'—'],['Telegram',d.telegramUsername||d.telegram||'—'],['Role',d.role||'—'],['Status',userStatus(d.status)],['Main balance',amount(d.balance)],['USD balance',amount(d.usdBalance,'USD')],['Withdrawal reserved',amount(d.withdrawReserved)],['Completed tasks',d.tasks??'—'],['Account created',date(d.createdAt)]];
 return '<h2 style="margin-top:0">Member details</h2><p>Firestore profile · loaded now</p><dl>'+fields.map(([label,value])=>'<div style="padding:9px 0;border-bottom:1px solid #edf1f6"><dt style="font-size:12px;color:#64748b">'+label+'</dt><dd style="margin:3px 0 0;overflow-wrap:anywhere">'+escape(String(value))+'</dd></div>').join('')+'</dl><button class="btn" data-user-close>Close</button>';
}
async function openDetails(id){
 if(!currentAdmin||!auth.currentUser||auth.currentUser.uid!==currentAdmin.uid)return;
 const actor=currentAdmin.uid,version=++requestVersion;
 details.innerHTML='<p>Loading member profile…</p><button class="btn" data-user-close>Close</button>';if(!details.open)details.showModal();
 try{
  const snapshot=await db.collection('users').doc(id).get({source:'server'});
  if(version!==requestVersion||!details.open||currentAdmin?.uid!==actor||auth.currentUser?.uid!==actor)return;
  details.innerHTML=snapshot.exists?detailBody(id,snapshot.data()):'<p>This member profile no longer exists.</p><button class="btn" data-user-close>Close</button>';
 }catch(_){if(version===requestVersion&&details.open)details.innerHTML='<p>Profile could not be loaded. Check the connection and try Details again.</p><button class="btn" data-user-close>Close</button>';}
}
details.addEventListener('click',event=>{if(event.target.closest('[data-user-close]'))details.close();});
details.addEventListener('close',()=>{requestVersion++;details.innerHTML='';});
document.getElementById('content').addEventListener('click',event=>{
 if(state.page!=='users')return;
 const detail=event.target.closest('[data-user-details]'),nav=event.target.closest('[data-user-page]'),refresh=event.target.closest('[data-users-refresh]');
 if(detail){event.preventDefault();void openDetails(detail.dataset.userDetails);}
 if(nav&&!nav.disabled&&ensure()){
  if(nav.dataset.userPage==='previous'){page=Math.max(1,page-1);render();}
  else if(page<Math.ceil(matching().length/pageSize)){page++;render();}
  else{void loadNext(true);render();}
 }
 if(refresh&&!refresh.disabled&&ensure()){
  reset();render();const actor=owner;
  Core.summary(auth.currentUser,firebaseConfig.projectId,state.period).then(value=>{if(valid()&&owner===actor){userSummary=value;liveCounts.users=value.total;}}).catch(()=>{if(owner===actor)userSummary=null;}).finally(()=>{if(valid()&&owner===actor&&state.page==='users')render();});
 }
});
auth.onAuthStateChanged(user=>{if(!user){requestVersion++;details.close();details.innerHTML='';pager?.reset();pager=null;owner=null;page=1;signature='';started=false;}});
window.HubAdminUsers={reset};
if(state.page==='users')render();
})();

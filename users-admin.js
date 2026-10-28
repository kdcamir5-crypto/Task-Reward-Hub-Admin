/* Read-only member details and pagination over the loaded admin snapshot. */
(function(){
'use strict';
const pageSize=25,escape=escapeHtml;
let page=1,signature='',requestVersion=0;
const details=document.createElement('dialog');
details.setAttribute('aria-label','Member details');
details.style.cssText='border:1px solid #dce5f2;border-radius:18px;padding:22px;width:min(560px,94vw);max-height:85vh;overflow:auto;box-sizing:border-box;color:#17243c';
document.body.appendChild(details);
const previousDataPage=dataPage;
dataPage=function(kind){
 if(kind!=='users')return previousDataPage(kind);
 const nextSignature=state.query+'\n'+state.filter;
 if(signature!==nextSignature){page=1;signature=nextSignature;}
 const query=state.query.trim().toLowerCase();
 const rows=demo.users.filter(r=>[r.name,r.email,r.id,r.status,r.raw?.collectorId,r.raw?.collector_id].join(' ').toLowerCase().includes(query)&&(state.filter==='All'||r.status===state.filter)).sort((a,b)=>a.id.localeCompare(b.id));
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.max(1,Math.min(page,pages));
 const shown=rows.slice((page-1)*pageSize,page*pageSize);
 return heading('Users','View member profiles, account status and wallet overview.','<button class="btn" data-users-refresh>Refresh users</button>')+
 '<div class="section-summary"><div class="summary-card" data-users-summary><div class="small-label">Registered Members</div><strong>'+demo.users.length+'</strong></div><div class="summary-card" data-users-summary><div class="small-label">Matching Members</div><strong>'+rows.length+'</strong></div><div class="summary-card" data-users-summary><div class="small-label">Data source</div><strong style="font-size:18px">'+(liveConnected?'Firestore snapshot':'Data unavailable')+'</strong></div></div>'+
 '<section class="panel table-panel"><div class="panel-head"><div><div class="panel-title">Members</div><div class="panel-subtitle">25 members per page · Refresh to load changes</div></div><div class="section-tools"><input id="tableSearch" aria-label="Search members" placeholder="Search name, email, UID or Collector ID..." value="'+escape(state.query)+'"><select class="select" id="statusFilter" aria-label="Member status">'+['All','Active','Pending','Approved','Rejected'].map(s=>'<option>'+s+'</option>').join('')+'</select></div></div><div class="table-wrap"><table><thead><tr><th>Member</th><th>User ID</th><th>Main balance</th><th>Status</th><th>Details</th></tr></thead><tbody>'+shown.map(r=>'<tr><td><strong>'+escape(r.name)+'</strong><br><small>'+escape(r.email)+'</small></td><td>'+escape(r.id)+'</td><td>'+escape(r.amount)+'</td><td>'+statusBadge(r.status)+'</td><td><button class="btn" data-user-details="'+escape(r.id)+'">Details</button></td></tr>').join('')+'</tbody></table></div>'+(rows.length?'':'<div class="empty-state">No matching members.</div>')+
 '<div class="table-footer"><span>Showing '+(rows.length?(page-1)*pageSize+1:0)+'–'+Math.min(page*pageSize,rows.length)+' of '+rows.length+' members</span><div class="footer-buttons"><button class="page-btn" data-user-page="'+(page-1)+'" '+(page===1?'disabled':'')+'>Previous</button><span>Page '+page+' of '+pages+'</span><button class="page-btn" data-user-page="'+(page+1)+'" '+(page===pages?'disabled':'')+'>Next</button></div></div></section>';
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
 if(nav&&!nav.disabled){const next=Number(nav.dataset.userPage);if(Number.isInteger(next)&&next>0){page=next;render();}}
 if(refresh&&!refresh.disabled){refresh.disabled=true;loadLiveData().catch(()=>{notify('Users could not be refreshed. Try again.');}).finally(()=>{refresh.disabled=false;});}
});
auth.onAuthStateChanged(user=>{if(!user){requestVersion++;details.close();details.innerHTML='';page=1;signature='';}});
if(state.page==='users')render();
})();

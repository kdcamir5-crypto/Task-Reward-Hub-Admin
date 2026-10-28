/* Loaded after the existing admin shell; all values from Firestore are escaped. */
(function(){
'use strict';
const C=window.HubDailyTaskCore,escape=escapeHtml;
let uid=null,taskRows=[],submissions=[],unsubs=[],error='',loading=true,timer,creating=false,createAttempt=null,reviewing=false;
const dialog=document.createElement('dialog');dialog.style.cssText='border:1px solid #dce5f2;border-radius:18px;padding:22px;width:min(560px,94vw);max-height:85vh;overflow:auto;box-sizing:border-box';document.body.appendChild(dialog);
const createDialog=document.createElement('dialog');createDialog.style.cssText=dialog.style.cssText;document.body.appendChild(createDialog);
const time=value=>value?.toMillis?value.toMillis():0;
const date=ms=>new Date(ms).toLocaleString('bn-BD',{timeZone:'Asia/Dhaka'});
function safeLink(value){try{return C.link(value);}catch(_){return '#';}}
function stop(){unsubs.forEach(fn=>fn());unsubs=[];clearTimeout(timer);uid=null;taskRows=[];submissions=[];error='';loading=true;createAttempt=null;dialog.close();createDialog.close();}
function refreshView(){if(state.page==='tasks')render();}
function start(){
 if(!currentAdmin)return;if(uid===currentAdmin.uid)return;stop();uid=currentAdmin.uid;const actor=uid;loading=true;
 for(const [name,query] of [['tasks',db.collection('tasks').where('expiresAtMs','>',Date.now())],['submissions',db.collection('submissions').where('schemaVersion','==',2)]]){
  unsubs.push(query.onSnapshot(snap=>{if(uid!==actor)return;const rows=snap.docs.map(d=>({...d.data(),id:d.id}));if(name==='tasks')taskRows=rows.filter(d=>d.schemaVersion===2);else submissions=rows;loading=false;refreshView();},()=>{if(uid!==actor)return;error='Task তথ্য লোড হয়নি। Firestore rules ও সংযোগ যাচাই করুন।';loading=false;refreshView();}));
 }
}
function page(){
 start();clearTimeout(timer);timer=setTimeout(refreshView,Math.max(50,C.dayEnd()-Date.now()+50));
 const tasks=taskRows.filter(t=>t.expiresAtMs>Date.now());
 const rows=submissions.filter(s=>(state.filter==='All'||s.status===state.filter.toLowerCase())&&(s.taskTitle+' '+s.email+' '+s.uid+' '+s.id).toLowerCase().includes(state.query.toLowerCase())).sort((a,b)=>time(b.createdAt)-time(a.createdAt));
 return heading('Daily Tasks','বাংলাদেশ সময় রাত ১২টায় সব task শেষ হয়। Pending proof পরে review করা যাবে।','<button class="btn" id="dailyTaskRefresh">Refresh</button><button class="btn btn-primary" id="dailyTaskAdd">Add task</button>')+
 (error?'<p role="status" style="color:#b43245">'+escape(error)+'</p>':'')+
 '<section class="panel table-panel"><div class="panel-head"><div class="panel-title">আজকের task · '+tasks.length+'</div></div><div class="table-wrap"><table><thead><tr><th>Task</th><th>Reward</th><th>শেষ সময়</th><th>Action</th></tr></thead><tbody>'+tasks.map(t=>'<tr><td><strong>'+escape(t.title)+'</strong><p style="white-space:pre-wrap;overflow-wrap:anywhere;max-width:430px">'+escape(t.description)+'</p><a href="'+escape(safeLink(t.url))+'" target="_blank" rel="noopener noreferrer">কাজের লিংক ↗</a></td><td>৳'+(t.rewardMinor/100).toFixed(2)+'</td><td>'+escape(date(t.expiresAtMs))+'</td><td><button class="btn" data-daily-task-delete="'+escape(t.id)+'">Delete</button></td></tr>').join('')+'</tbody></table></div>'+(!tasks.length?'<div class="empty-state">'+(loading?'Loading tasks…':'আজকের কোনো task নেই। Add task থেকে নতুন task দিন।')+'</div>':'')+'</section>'+
 '<section class="panel table-panel" style="margin-top:20px"><div class="panel-head"><div><div class="panel-title">লিখিত proof ও review</div><small>Task delete বা expire হলেও জমা দেওয়া proof থাকবে।</small></div><div class="section-tools"><input id="tableSearch" placeholder="Search task or user..." value="'+escape(state.query)+'"><select id="statusFilter" class="select"><option>All</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div></div><div class="table-wrap"><table><thead><tr><th>User / Task</th><th>Reward</th><th>Status</th><th>Review</th></tr></thead><tbody>'+rows.map(d=>'<tr><td>'+escape(d.email||d.uid)+'<br><strong>'+escape(d.taskTitle)+'</strong><br><small>'+escape(d.id)+'</small></td><td>৳'+(d.rewardMinor/100).toFixed(2)+'</td><td>'+statusBadge(d.status)+'</td><td><button class="btn" data-daily-task-review="'+escape(d.id)+'">'+(d.status==='pending'?'Review proof':'Details')+'</button></td></tr>').join('')+'</tbody></table></div>'+(!rows.length?'<div class="empty-state">কোনো matching submission নেই।</div>':'')+'</section>';
}
function add(){
 if(creating||!currentAdmin)return;
 createDialog.innerHTML='<form id="dailyTaskCreateForm"><h2>নতুন task যোগ করুন</h2><p>আজ রাত ১২টায় (বাংলাদেশ সময়) শেষ হবে। একই user একবার proof জমা দিতে পারবে।</p>'+[['Title','dtTitle','text',120],['কাজের https link','dtUrl','url',1000],['Reward (৳)','dtReward','text',12]].map(([label,id,type,max])=>'<div class="auth-field"><label for="'+id+'">'+label+'</label><input id="'+id+'" type="'+type+'" maxlength="'+max+'" required></div>').join('')+'<div class="auth-field"><label for="dtDescription">কাজের নির্দেশনা ও কী proof দিতে হবে</label><textarea id="dtDescription" rows="5" maxlength="1500" required style="width:100%;box-sizing:border-box;padding:12px"></textarea></div><p id="dtCreateMessage" role="status"></p><button class="btn" type="button" id="dtCreateClose">Cancel</button> <button class="btn btn-primary" type="submit">Publish task</button></form>';
 document.getElementById('dtCreateClose').onclick=()=>{if(!creating)createDialog.close();};
 document.getElementById('dailyTaskCreateForm').onsubmit=async event=>{
  event.preventDefault();if(creating||!currentAdmin)return;const actor=currentAdmin;
  const input={title:document.getElementById('dtTitle').value,description:document.getElementById('dtDescription').value,url:document.getElementById('dtUrl').value,reward:document.getElementById('dtReward').value};
  try{C.taskInput(input);}catch(e){document.getElementById('dtCreateMessage').textContent=e.message;return;}
  const key=JSON.stringify({...input,dayEnd:C.dayEnd()});if(!createAttempt||createAttempt.key!==key)createAttempt={key,id:db.collection('tasks').doc().id};creating=true;const btn=event.target.querySelector('[type="submit"]');btn.disabled=true;
  try{await C.create(db,firebase.firestore.FieldValue,actor,input,createAttempt.id);createAttempt=null;createDialog.close();notify('Task প্রকাশ হয়েছে।');}
  catch(e){document.getElementById('dtCreateMessage').textContent=e.code==='permission-denied'?'Task প্রকাশ হয়নি। নতুন Firestore rules Publish করুন এবং সময় সঠিক আছে কি না দেখুন।':e.message;}
  finally{creating=false;btn.disabled=false;}
 };
 createDialog.showModal();
}
function review(id){
 const d=submissions.find(x=>x.id===id);if(!d||reviewing)return;
 dialog.innerHTML='<h2>'+escape(d.taskTitle)+'</h2><p>'+escape(d.email||d.uid)+' · Reward ৳'+(d.rewardMinor/100).toFixed(2)+'</p><h3>জমা দেওয়া proof</h3><p style="white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #ddd;padding:12px;border-radius:10px">'+escape(d.proof)+'</p><a href="'+escape(safeLink(d.taskUrl))+'" target="_blank" rel="noopener noreferrer">মূল কাজের লিংক ↗</a><p>Status: '+escape(d.status)+'</p>'+(d.status==='pending'?'<label for="dtRejectReason">Reject করলে কারণ লিখুন</label><textarea id="dtRejectReason" maxlength="300" rows="3" style="width:100%;box-sizing:border-box"></textarea><p>Approve করলে ৳'+(d.rewardMinor/100).toFixed(2)+' একবার user balance-এ যোগ হবে।</p><button class="btn btn-primary" id="dtApprove">Approve</button> <button class="btn" id="dtReject">Reject</button>':'<p>'+escape(d.rejectionReason||'Reward credit রেকর্ড করা হয়েছে।')+'</p>')+' <button class="btn" id="dtReviewClose">Close</button><p id="dtReviewMessage" role="status"></p>';
 document.getElementById('dtReviewClose').onclick=()=>{if(!reviewing)dialog.close();};
 for(const [button,approved] of [['dtApprove',true],['dtReject',false]]){const b=document.getElementById(button);if(b)b.onclick=async()=>{
  if(reviewing||!currentAdmin)return;reviewing=true;dialog.querySelectorAll('button').forEach(x=>x.disabled=true);
  try{await C.review(db,firebase.firestore.FieldValue,currentAdmin,id,approved,document.getElementById('dtRejectReason').value);dialog.close();notify(approved?'Task approve হয়েছে। Reward একবার যোগ হয়েছে।':'Submission বাতিল হয়েছে।');await loadLiveData();}
  catch(e){document.getElementById('dtReviewMessage').textContent=e.code==='permission-denied'?'Review হয়নি। Firestore rules ও admin permission যাচাই করুন।':e.message;}
  finally{reviewing=false;dialog.querySelectorAll('button').forEach(x=>x.disabled=false);}
 };}
 dialog.showModal();
}
for(const d of [dialog,createDialog])d.addEventListener('cancel',event=>{if(reviewing||creating)event.preventDefault();});
const previous=dataPage;dataPage=function(name){return name==='tasks'?page():previous(name);};
document.getElementById('content').addEventListener('click',async event=>{
 if(event.target.closest('#dailyTaskAdd'))add();
 if(event.target.closest('#dailyTaskRefresh')){stop();refreshView();}
 const remove=event.target.closest('[data-daily-task-delete]');if(remove&&currentAdmin){if(!confirm('Taskটি সবার তালিকা থেকে সরাবেন? জমা দেওয়া proof ও reward history থাকবে।'))return;remove.disabled=true;try{await C.remove(db,currentAdmin,remove.dataset.dailyTaskDelete);notify('Task সরানো হয়েছে।');}catch(e){notify(e.message);remove.disabled=false;}}
 const proof=event.target.closest('[data-daily-task-review]');if(proof)review(proof.dataset.dailyTaskReview);
});
auth.onAuthStateChanged(account=>{if(!account||uid&&account.uid!==uid)stop();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&state.page==='tasks'){stop();refreshView();}});
})();

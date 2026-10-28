const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const C=require('../daily-tasks-core.js');
function setup(){
 const elements=new Map(),dialogs=[],listeners=[],watchers=[],calls=[];let authCallback;
 const make=()=>({style:{},innerHTML:'',value:'Reason for rejection',disabled:false,addEventListener(){},close(){this.open=false;},showModal(){this.open=true;},querySelectorAll(){return[];}});
 const document={createElement(){const d=make();dialogs.push(d);return d;},body:{appendChild(){}},getElementById(id){if(!elements.has(id)){const d=make();d.addEventListener=(event,fn)=>{if(id==='content')listeners.push(fn);};elements.set(id,d);}return elements.get(id);},addEventListener(){}};
 const collection={where(){return this;},onSnapshot(ok,fail){watchers.push({ok,fail});return()=>{};}};
 const c={document,window:{HubDailyTaskCore:{...C,review:async(...args)=>calls.push(args),remove:async(...args)=>calls.push(args)}},currentAdmin:{uid:'admin'},auth:{onAuthStateChanged:f=>authCallback=f},firebase:{firestore:{FieldValue:{}}},db:{collection:()=>collection},state:{page:'tasks',filter:'All',query:''},dataPage:()=>'',render(){},heading:(title,description,actions)=>title+actions,escapeHtml:s=>String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x])),statusBadge:s=>String(s),notify(){},loadLiveData:async()=>{},confirm:()=>true,setTimeout:()=>1,clearTimeout(){},Date,console};
 vm.createContext(c);vm.runInContext(fs.readFileSync(__dirname+'/../daily-tasks-admin.js','utf8'),c);c.dataPage('tasks');
 function emit(index,rows){watchers[index].ok({docs:rows.map(d=>({id:d.id,data:()=>d}))});}
 return {c,dialogs,elements,emit,calls,click:async(selector,data)=>{for(const fn of listeners)await fn({target:{closest:q=>q===selector?{dataset:data||{}}:null}});},logout:()=>authCallback(null)};
}
test('admin task page uses live data and keeps proofs after task deletion',()=>{
 const s=setup();s.emit(0,[]);s.emit(1,[{id:'receipt',schemaVersion:2,uid:'buyer',email:'buyer@test.invalid',taskTitle:'Deleted task',taskUrl:'https://example.com',rewardMinor:100,proof:'<img src=x>',status:'pending'}]);
 let html=s.c.dataPage('tasks');assert(html.includes('Deleted task'));assert(html.includes('data-daily-task-review="receipt"'));assert(!html.includes('Preview mode'));s.logout();assert(!s.c.dataPage('tasks').includes('Deleted task'));
});
test('review shows escaped written proof and uses the atomic review module',async()=>{
 const s=setup();s.emit(0,[]);s.emit(1,[{id:'r1',schemaVersion:2,uid:'buyer',taskTitle:'Work',taskUrl:'https://example.com',rewardMinor:250,proof:'<img src=x onerror=alert(1)>',status:'pending'}]);
 await s.click('[data-daily-task-review]',{dailyTaskReview:'r1'});assert(s.dialogs[0].innerHTML.includes('&lt;img'));assert(!s.dialogs[0].innerHTML.includes('<img'));
 await s.elements.get('dtApprove').onclick();assert.equal(s.calls[0][3],'r1');assert.equal(s.calls[0][4],true);
});

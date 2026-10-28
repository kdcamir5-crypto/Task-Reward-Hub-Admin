const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
function setup(){
 const context=vm.createContext({state:{query:'',filter:'All'},icon:()=>'',escapeHtml:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))});
 for(const name of ['liveStatus','userStatus','statusBadge','table']){
  const line=html.split('\n').find(l=>l.startsWith('function '+name+'('));assert(line,name);vm.runInContext(line,context);
 }
 return context;
}
test('user mapping preserves Active including default accounts',()=>{const c=setup();for(const value of [undefined,null,'','active','ACTIVE',' active '])assert.equal(c.userStatus(value),'Active');assert(html.includes('status:userStatus(d.status)'));});
test('Active filter includes active users and excludes pending or blocked users',()=>{
 const c=setup();const row=(id,status)=>({id,name:id,email:id+'@example.com',amount:'৳100',status:c.userStatus(status),tone:'#fff',color:'#000'});
 const rows=[row('active-member','active'),row('default-member',undefined),row('pending-member','pending'),row('blocked-member','blocked')];
 c.state.filter='Active';let result=c.table(rows,'users');assert(result.includes('active-member@example.com'));assert(result.includes('default-member@example.com'));assert(!result.includes('pending-member@example.com'));assert(!result.includes('blocked-member@example.com'));assert(result.includes('status approved'));
 c.state.query='default-member';result=c.table(rows,'users');assert(result.includes('default-member@example.com'));assert(!result.includes('active-member@example.com'));
 c.state.filter='All';c.state.query='';result=c.table(rows,'users');for(const r of rows)assert(result.includes(r.email));
});
test('payment approval and rejection labels keep existing mappings',()=>{const c=setup();for(const v of ['approved','paid','completed','active','verified'])assert.equal(c.liveStatus(v),'Approved');assert.equal(c.liveStatus('pending'),'Pending');for(const v of ['rejected','blocked','failed'])assert.equal(c.liveStatus(v),'Rejected');});

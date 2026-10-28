const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync(__dirname+'/../index.html','utf8');
function setup(){
 const nodes=new Map();let submit,onState,role='admin',missing=false,readError=false,passwordError=false,loads=0,signouts=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{value:'test',disabled:false,textContent:'',hidden:false,style:{}});return nodes.get(id);};
 node('loginForm').addEventListener=(_,fn)=>submit=fn;
 const context=vm.createContext({document:{getElementById:node},auth:{signInWithEmailAndPassword:async()=>{if(passwordError)throw {code:'auth/invalid-credential'};},onAuthStateChanged:fn=>onState=fn,signOut:async()=>{signouts++;await onState(null);}},db:{collection:()=>({doc:()=>({get:async()=>{if(readError)throw Error('unavailable');return {exists:!missing,data:()=>({role})};}})})},syncPendingIndicator(){},setConnection(){},loadPaymentSettings(){},loadMaintenance(){},loadLiveData:async()=>{loads++;}});
 const start=html.indexOf('function resetLoginButton()'),end=html.indexOf("document.getElementById('signOutBtn').addEventListener",start);
 assert(start>=0&&end>start);vm.runInContext(html.slice(start,end),context);
 return {node,context,submit:()=>submit({preventDefault(){}}),state:user=>onState(user),configure:o=>{if('role'in o)role=o.role;if('missing'in o)missing=o.missing;if('readError'in o)readError=o.readError;if('passwordError'in o)passwordError=o.passwordError;},get loads(){return loads;},get signouts(){return signouts;}};
}
for(const options of [{role:'user'},{missing:true}])test('denied account can retry as admin: '+JSON.stringify(options),async()=>{
 const s=setup();s.configure(options);await s.submit();assert.equal(s.node('loginSubmit').disabled,true);await s.state({uid:'member'});
 assert.equal(s.loads,0);assert.equal(s.signouts,1);assert.equal(s.node('authGate').hidden,false);assert.match(s.node('authMessage').textContent,/Access denied/);assert.equal(s.node('loginSubmit').disabled,false);
 s.configure({role:'admin',missing:false});await s.submit();await s.state({uid:'admin'});assert.equal(s.loads,1);assert.equal(s.node('authGate').hidden,true);assert.equal(s.node('loginSubmit').disabled,false);
});
test('profile read failure releases button and allows retry',async()=>{const s=setup();s.configure({readError:true});await s.submit();await s.state({uid:'admin'});assert.equal(s.loads,0);assert.equal(s.node('authGate').hidden,false);assert.equal(s.node('loginSubmit').disabled,false);assert.equal(s.node('loginSubmit').textContent,'Sign in securely');s.configure({readError:false});await s.submit();await s.state({uid:'admin'});assert.equal(s.loads,1);});
test('wrong password releases button without loading admin data',async()=>{const s=setup();s.configure({passwordError:true});await s.submit();assert.equal(s.node('loginSubmit').disabled,false);assert.match(s.node('authMessage').textContent,/incorrect/);assert.equal(s.loads,0);});
test('signed-out callback resets login controls',async()=>{const s=setup();await s.submit();await s.state(null);assert.equal(s.node('loginSubmit').disabled,false);assert.equal(s.node('authGate').hidden,false);assert.equal(s.loads,0);});

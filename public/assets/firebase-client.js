const cfg = window.MPU_CONFIG || {};
const env = cfg.environment || 'dev';
let fb = (cfg.firebase || {})[env] || {};
let configSource = 'manual';

function looksValid(c){
  return !!(c && c.apiKey && !String(c.apiKey).startsWith('PASTE_') && c.projectId && c.appId && !String(c.appId).startsWith('PASTE_'));
}
function emailKey(v){ return String(v||'').trim().toLowerCase(); }
function isBootstrapEmail(v){ return (cfg.bootstrapChairmanEmails||[]).map(emailKey).includes(emailKey(v)); }

let state = {ready:false, enabled:false, auth:null, db:null, user:null, role:null, sdk:null, configSource:null, configError:null};
function dispatch(){ window.dispatchEvent(new CustomEvent('mpu-cloud-ready',{detail:{...state}})); }
function localRole(){ return (env==='dev' && cfg.authDevBypass) ? (localStorage.getItem('mpu_dev_role') || 'chairman') : null; }
function auditPayload(action, target, details={}){ return {action,target,details,actorUid:state.user?.uid||'dev-bypass',actorEmail:state.user?.email||'dev-bypass',actorRole:state.role||localRole()||'unknown',at:new Date().toISOString()}; }

async function resolveFirebaseConfig(){
  if(looksValid(fb)) return fb;
  // Firebase Hosting exposes the active site's public web config automatically.
  try{
    const r = await fetch('/__/firebase/init.json', {cache:'no-store'});
    if(!r.ok) throw new Error(`Hosting config endpoint returned ${r.status}`);
    const discovered = await r.json();
    if(!looksValid(discovered)) throw new Error('Hosting returned an incomplete Firebase configuration.');
    fb = discovered; configSource = 'firebase-hosting-auto'; return fb;
  }catch(e){
    state.configError = e?.message || String(e);
    return fb;
  }
}

async function init(){
  await resolveFirebaseConfig();
  if(!looksValid(fb)){
    state={...state,ready:true,enabled:false,role:localRole(),configSource:'none'}; dispatch(); return state;
  }
  try{
    const appMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
    const authMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
    const fsMod = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js');
    const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(fb);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);
    // Test-only connections are explicitly configured and restricted to loopback hosts.
    if (cfg.emulators && ['localhost','127.0.0.1'].includes(location.hostname)) {
      authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', {disableWarnings:true});
      fsMod.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      configSource = 'local-emulator';
    }
    state={...state,enabled:true,auth,db,sdk:{authMod,fsMod},ready:true,configSource};
    await new Promise(resolve=>{
      let first=true;
      authMod.onAuthStateChanged(auth, async user=>{
        state.user=user||null; state.role=null;
        if(user){
          try{
            const snap=await fsMod.getDoc(fsMod.doc(db,'users',user.uid));
            if(snap.exists()) state.role=snap.data().role||null;
            else if(isBootstrapEmail(user.email)) state.role='chairman';
          }catch(e){ console.warn('Role lookup failed',e); }
        }
        dispatch();
        if(first){ first=false; resolve(); }
      });
    });
    return state;
  }catch(e){
    console.error('Firebase init failed',e);
    state={...state,ready:true,enabled:false,role:localRole(),configError:e?.message||String(e)}; dispatch(); return state;
  }
}
const readyPromise=init();

async function ready(){ return readyPromise; }
async function signInEmailLink(email){
  await ready(); if(!state.enabled) throw new Error('Firebase is not connected. Open System Check for setup details.');
  const {sendSignInLinkToEmail}=state.sdk.authMod;
  const requested=new URLSearchParams(location.search).get('next')||'/admin/';
  const next=(requested.startsWith('/admin/')||requested==='/finance/'||requested==='/finance')&&!requested.startsWith('//')&&!requested.includes('\\')?requested:'/admin/';
  const url = location.origin + '/admin/login/?next='+encodeURIComponent(next);
  localStorage.setItem('mpu_login_next',next);
  await sendSignInLinkToEmail(state.auth,email,{url,handleCodeInApp:true});
  localStorage.setItem('mpu_login_email',email);
}
async function completeEmailLink(email){
  await ready(); if(!state.enabled) return false;
  const {isSignInWithEmailLink,signInWithEmailLink}=state.sdk.authMod;
  if(!isSignInWithEmailLink(state.auth,location.href)) return false;
  await signInWithEmailLink(state.auth,email,location.href); localStorage.removeItem('mpu_login_email'); return true;
}
async function signOutUser(){ await ready(); if(state.enabled) await state.sdk.authMod.signOut(state.auth); localStorage.removeItem('mpu_dev_role'); }
function role(){ return state.role || localRole(); }
function hasRole(roles){ const r=role(); return !!r && roles.includes(r); }
async function requireRole(roles){
  await ready();
  if(env==='dev' && cfg.authDevBypass && !state.enabled){ return {ok:true,role:role(),devBypass:true}; }
  if(!state.user){ location.href='/admin/login/?next='+encodeURIComponent(location.pathname+location.search); return {ok:false}; }
  if(!hasRole(roles)){
    document.body.innerHTML='<main style="font-family:Arial;padding:40px;max-width:760px;margin:auto"><h1>Access restricted</h1><p>Your signed-in account does not have permission for this area.</p><p><a href="/admin/">Return to EC Admin</a></p></main>';
    return {ok:false};
  }
  return {ok:true,role:role(),user:state.user};
}
function applyRoleVisibility(root=document){ const r=role(); root.querySelectorAll('[data-roles]').forEach(el=>{ const allowed=el.dataset.roles.split(',').map(x=>x.trim()); el.hidden=!allowed.includes(r); }); }

async function getPortalSettings(){ await ready(); if(!state.enabled) return null; const {getDoc,doc}=state.sdk.fsMod; const s=await getDoc(doc(state.db,'portalConfig','main')); return s.exists()?s.data():null; }
async function savePortalSettings(data){ await ready(); if(!state.enabled) return false; const {setDoc,doc}=state.sdk.fsMod; await setDoc(doc(state.db,'portalConfig','main'),data,{merge:false}); await logAudit('update','portalConfig/main',{keys:Object.keys(data||{})}); return true; }
async function getEvents(){ await ready(); if(!state.enabled) return null; const {getDocs,collection}=state.sdk.fsMod; const q=await getDocs(collection(state.db,'events')); const a=[]; q.forEach(d=>a.push({id:d.id,...d.data()})); return a; }
async function saveEvent(event){ await ready(); if(!state.enabled) return false; const {setDoc,doc}=state.sdk.fsMod; const id=event.id||('evt-'+Date.now()); const payload={...event,id}; await setDoc(doc(state.db,'events',id),payload,{merge:false}); await logAudit('upsert','events/'+id,{title:event.title}); return id; }
async function deleteEvent(id){ await ready(); if(!state.enabled) return false; const {deleteDoc,doc}=state.sdk.fsMod; await deleteDoc(doc(state.db,'events',id)); await logAudit('delete','events/'+id,{}); return true; }
async function seedPublicData(settings, events){ await ready(); if(!state.enabled) return false; await savePortalSettings(settings); for(const e of events) await saveEvent(e); return true; }
async function logAudit(action,target,details){ await ready(); if(!state.enabled) return false; try{ const {addDoc,collection}=state.sdk.fsMod; await addDoc(collection(state.db,'auditLog'),auditPayload(action,target,details)); return true;}catch(e){console.warn('Audit log failed',e);return false;} }
async function getAudit(limitN=50){ await ready(); if(!state.enabled) return []; const {getDocs,collection,query,orderBy,limit}=state.sdk.fsMod; const q=await getDocs(query(collection(state.db,'auditLog'),orderBy('at','desc'),limit(limitN))); const a=[];q.forEach(d=>a.push({id:d.id,...d.data()}));return a; }
async function submitRegisterCorrection(item){ await ready(); if(!state.enabled) return false; const {addDoc,collection}=state.sdk.fsMod; const payload={...item,status:'New',createdAt:new Date().toISOString(),userUid:state.user?.uid||null,userEmail:state.user?.email||item.memberEmail||null}; const d=await addDoc(collection(state.db,'registerCorrections'),payload); return d.id; }
async function getRegisterCorrections(){ await ready(); if(!state.enabled) return null; const {getDocs,collection}=state.sdk.fsMod; const q=await getDocs(collection(state.db,'registerCorrections')); const a=[];q.forEach(d=>a.push({id:d.id,...d.data()}));return a.sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))); }
async function updateRegisterCorrection(id,patch){ await ready(); if(!state.enabled) return false; const {updateDoc,doc}=state.sdk.fsMod; await updateDoc(doc(state.db,'registerCorrections',id),{...patch,updatedAt:new Date().toISOString()}); await logAudit('update','registerCorrections/'+id,patch); return true; }

async function ensureUserProfile(){
  await ready(); if(!state.enabled || !state.user) return null;
  const {getDoc,setDoc,doc}=state.sdk.fsMod;
  const ref=doc(state.db,'users',state.user.uid);
  const snap=await getDoc(ref);
  if(!snap.exists()){
    let preapproved=null;
    try{ const key=emailKey(state.user.email); if(key){ const d=await getDoc(doc(state.db,'accessDirectory',key)); if(d.exists()) preapproved=d.data(); } }catch(e){ console.warn('Access directory lookup skipped',e); }
    let approvedRole='pending', source='First sign-in';
    if(isBootstrapEmail(state.user.email)){ approvedRole='chairman'; source='Bootstrap Chairman'; }
    else if(preapproved?.active!==false && preapproved?.role){ approvedRole=preapproved.role; source='Legacy access directory'; }
    const profile={uid:state.user.uid,email:emailKey(state.user.email),displayName:preapproved?.name||state.user.displayName||'',role:approvedRole,status:approvedRole==='pending'?'Pending Approval':'Approved',createdAt:new Date().toISOString(),lastSignInAt:new Date().toISOString(),source};
    await setDoc(ref,profile,{merge:false});
    state.role=approvedRole; dispatch(); return profile;
  }
  const data=snap.data(); state.role=data.role||'pending';
  try{await setDoc(ref,{lastSignInAt:new Date().toISOString()},{merge:true});}catch(e){}
  dispatch(); return data;
}
async function getUsers(){ await ready(); if(!state.enabled) return []; const {getDocs,collection}=state.sdk.fsMod; const q=await getDocs(collection(state.db,'users')); const a=[]; q.forEach(d=>a.push({id:d.id,...d.data()})); return a.sort((a,b)=>String(a.email||'').localeCompare(String(b.email||''))); }
async function updateUserAccess(uid,patch){ await ready(); if(!state.enabled) return false; const {updateDoc,doc}=state.sdk.fsMod; await updateDoc(doc(state.db,'users',uid),{...patch,updatedAt:new Date().toISOString(),updatedBy:state.user?.email||state.user?.uid||''}); await logAudit('update','users/'+uid,patch); return true; }
async function getWorkPlanState(){ await ready(); if(!state.enabled) return null; const {getDoc,doc}=state.sdk.fsMod; const snap=await getDoc(doc(state.db,'ecWorkPlan','current')); return snap.exists()?snap.data():null; }
async function saveWorkPlanState(data){ await ready(); if(!state.enabled) return false; const {setDoc,doc}=state.sdk.fsMod; const payload={...data,updatedAt:new Date().toISOString(),updatedBy:state.user?.email||state.user?.uid||'dev-bypass'}; await setDoc(doc(state.db,'ecWorkPlan','current'),payload,{merge:false}); await logAudit('update','ecWorkPlan/current',{taskCount:(data.tasks||[]).length}); return true; }
async function getCollectionDocs(name){ await ready(); if(!state.enabled) return null; const {getDocs,collection}=state.sdk.fsMod; const q=await getDocs(collection(state.db,name)); const a=[]; q.forEach(d=>a.push({id:d.id,...d.data()})); return a; }
async function setCollectionDoc(name,id,data,merge=true){ await ready(); if(!state.enabled) return false; const {setDoc,doc}=state.sdk.fsMod; const docId=id||('rec-'+Date.now()+'-'+Math.random().toString(36).slice(2,8)); const payload={...data,id:docId,updatedAt:new Date().toISOString(),updatedBy:state.user?.email||state.user?.uid||'dev-bypass'}; await setDoc(doc(state.db,name,docId),payload,{merge}); await logAudit('upsert',name+'/'+docId,{fields:Object.keys(data||{})}); return docId; }
async function deleteCollectionDoc(name,id){ await ready(); if(!state.enabled) return false; const {deleteDoc,doc}=state.sdk.fsMod; await deleteDoc(doc(state.db,name,id)); await logAudit('delete',name+'/'+id,{}); return true; }
async function bulkUpsert(name,rows,idField='id'){
  await ready(); if(!state.enabled) return {ok:false,count:0};
  const {writeBatch,doc}=state.sdk.fsMod; let count=0;
  for(let i=0;i<rows.length;i+=400){ const batch=writeBatch(state.db); const part=rows.slice(i,i+400); part.forEach((row,j)=>{ const raw=row[idField]||row.id||`${name}-${Date.now()}-${i+j}-${Math.random().toString(36).slice(2,7)}`; const id=String(raw).replace(/\//g,'_'); batch.set(doc(state.db,name,id),{...row,id,updatedAt:new Date().toISOString()},{merge:true}); }); await batch.commit(); count+=part.length; }
  await logAudit('bulk-import',name,{count}); return {ok:true,count};
}
async function getFinanceConfig(){ await ready(); if(!state.enabled) return null; const {getDoc,doc}=state.sdk.fsMod; const s=await getDoc(doc(state.db,'financeConfig','main')); return s.exists()?s.data():null; }
async function saveFinanceConfig(data){ await ready(); if(!state.enabled) return false; const {setDoc,doc}=state.sdk.fsMod; await setDoc(doc(state.db,'financeConfig','main'),{...data,updatedAt:new Date().toISOString()},{merge:true}); await logAudit('update','financeConfig/main',data); return true; }
async function queueNotification(item){ await ready(); if(!state.enabled) return false; const {addDoc,collection}=state.sdk.fsMod; const payload={...item,status:item.status||'Queued',createdAt:new Date().toISOString(),createdBy:state.user?.email||state.user?.uid||'dev-bypass'}; const d=await addDoc(collection(state.db,'notificationsQueue'),payload); return d.id; }
async function connectionTest(){
  await ready(); const out={enabled:state.enabled,configSource:state.configSource,projectId:fb.projectId||'',signedIn:!!state.user,email:state.user?.email||'',role:role()||'',configError:state.configError||'',firestoreRead:false,firestoreWrite:false};
  if(!state.enabled) return out;
  try{ const {getDoc,doc}=state.sdk.fsMod; await getDoc(doc(state.db,'portalConfig','main')); out.firestoreRead=true; }catch(e){ out.readError=e.message; }
  if(state.user){ try{ await ensureUserProfile(); out.role=role()||''; out.firestoreWrite=true; }catch(e){ out.writeError=e.message; } }
  return out;
}
async function signInPassword(email,password){await ready();if(!state.enabled||state.configSource!=='local-emulator')throw Error('Local emulator sign-in only.');await state.sdk.authMod.signInWithEmailAndPassword(state.auth,email,password);await ensureUserProfile();}
window.MPUCloud={signInPassword,ready,state:()=>({...state}),get resolvedConfig(){return {...fb}},get validConfig(){return looksValid(fb)},signInEmailLink,completeEmailLink,signOutUser,role,hasRole,requireRole,applyRoleVisibility,getPortalSettings,savePortalSettings,getEvents,saveEvent,deleteEvent,seedPublicData,logAudit,getAudit,submitRegisterCorrection,getRegisterCorrections,updateRegisterCorrection,ensureUserProfile,getUsers,updateUserAccess,getWorkPlanState,saveWorkPlanState,getCollectionDocs,setCollectionDoc,deleteCollectionDoc,bulkUpsert,getFinanceConfig,saveFinanceConfig,queueNotification,connectionTest};

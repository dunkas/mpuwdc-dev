'use strict';
const {randomBytes,createHash}=require('node:crypto');
const {Timestamp,FieldValue}=require('firebase-admin/firestore');
const V=require('./finance-validation');
const roles=['chairman','admin','finance','finance_print','attendance','finance_assistant','auditor'];
const digest=v=>createHash('sha256').update(v).digest('hex');
async function roleFor(db,actor){if(!actor.uid||!actor.emailVerified)V.fail('Sign in with a verified email address.','unauthenticated');const snap=await db.doc('users/'+actor.uid).get(),p=snap.exists?snap.data():{},role=snap.exists?(['chairman','admin'].includes(p.role)?p.role:p.financeRole||p.role):actor.email==='dunkas@gmail.com'?'chairman':null;if(!roles.includes(role)||p.disabled===true||p.active===false)V.fail('An approved finance or attendance role is required.','permission-denied');return role}
let keyCache;
async function apiKey(project){if(keyCache)return keyCache;const response=await fetch('https://'+project+'.web.app/__/firebase/init.json',{signal:AbortSignal.timeout(8000)});if(!response.ok)V.fail('Firebase password sign-in configuration is unavailable.','unavailable');const config=await response.json();if(config.projectId!==project||!config.apiKey)V.fail('Firebase project configuration did not match.','failed-precondition');keyCache=config.apiKey;return keyCache}
async function open(db,actor,password){
 await roleFor(db,actor);if(typeof password!=='string'||!password||password.length>512)V.fail('Enter your finance password.');
 const project=process.env.GCLOUD_PROJECT||process.env.GOOGLE_CLOUD_PROJECT;
 const emulator=process.env.FIREBASE_AUTH_EMULATOR_HOST;
 if(emulator&&!project?.startsWith('demo-'))V.fail('The password emulator requires a demo project.','failed-precondition');
 const endpoint=emulator?'http://'+emulator+'/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-api-key':'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key='+await apiKey(project);
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:actor.email,password,returnSecureToken:true}),signal:AbortSignal.timeout(10000)}),result=await response.json();
 if(!response.ok){if(result.error?.message==='OPERATION_NOT_ALLOWED'||result.error?.message==='PASSWORD_LOGIN_DISABLED')V.fail('Email/password sign-in must be enabled in Firebase Authentication.','failed-precondition');V.fail('The password could not be verified.','unauthenticated')}
 if(result.localId!==actor.uid||String(result.email||'').toLowerCase()!==actor.email.toLowerCase())V.fail('The password belongs to a different account.','permission-denied');
 const config=await db.doc('financeConfig/main').get(),cfg=config.data()||{},sessionMinutes=Math.max(15,Math.min(240,Number(cfg.sessionMinutes)||30)),idleMinutes=Math.max(5,Math.min(30,Number(cfg.idleMinutes)||10));
 const token=randomBytes(32).toString('hex'),expiresAt=Timestamp.fromMillis(Date.now()+sessionMinutes*60*1000),batch=db.batch();
 batch.create(db.doc('financeSessions/'+digest(token)),{uid:actor.uid,expiresAt,idleMinutes,lastActiveMs:Date.now(),createdAt:FieldValue.serverTimestamp()});batch.create(db.collection('financeAudit').doc(),{actorUid:actor.uid,actorEmail:actor.email,action:'Finance password unlock',target:actor.uid,after:{expiresAt},at:FieldValue.serverTimestamp(),reason:'Verified through Firebase Authentication'});await batch.commit();return {token,expiresAt:expiresAt.toMillis(),idleMinutes};
}
async function verify(db,actor,token){if(!actor.uid||!actor.emailVerified||typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))return false;return db.runTransaction(async tx=>{const ref=db.doc('financeSessions/'+digest(token)),snap=await tx.get(ref);if(!snap.exists)return false;const s=snap.data(),now=Date.now();if(s.uid!==actor.uid||s.expiresAt.toMillis()<=now||!Number.isFinite(s.lastActiveMs)||now-s.lastActiveMs>Math.max(5,Math.min(30,Number(s.idleMinutes)||10))*60000)return false;tx.update(ref,{lastActiveMs:now});return true})}
async function data(db,actor,token){if(!await verify(db,actor,token))V.fail('Unlock the finance workspace with your password.','unauthenticated');const role=await roleFor(db,actor),full=['chairman','admin','finance'].includes(role),print=full||['finance_print','finance_assistant'].includes(role),attendance=full||['attendance','finance_assistant'].includes(role),read=async name=>(await db.collection(name).get()).docs.map(s=>({...s.data(),id:s.id}));
 const config=await db.doc('financeConfig/main').get(),cfg=config.exists?config.data():{};
 const output={role,members:[],payments:[],types:[],audit:[],attendance:[],outgoing:[],cards:[],evidence:[],handovers:[],queue:[],cfg};
 if(full)output.submissions=await read('paymentSubmissions');
 if(full||role==='auditor'){[output.members,output.payments,output.types,output.audit,output.attendance,output.outgoing,output.cards,output.evidence,output.handovers,output.queue]=await Promise.all(['members','payments','paymentTypes','financeAudit','attendanceEntries','financeOutgoing','financeCardAccounts','financeEvidence','financeHandovers','notificationsQueue'].map(read));}
 else{
  output.cfg={organizationName:cfg.organizationName,receiptFooter:cfg.receiptFooter,attendanceYear:cfg.attendanceYear,attendanceMinimum:cfg.attendanceMinimum,finalDateRule:cfg.finalDateRule,finalMeetingDate:cfg.finalMeetingDate};
  // Callable JSON cannot include undefined fields.
  output.cfg=Object.fromEntries(Object.entries(output.cfg).filter(([,v])=>v!==undefined));
  if(print)output.payments=(await read('payments')).map(p=>Object.fromEntries(['id','receiptNumber','memberName','paymentMethod','paymentDate','amount','status','verificationStatus','paymentType','allocations','referenceNumber','checkNumber','receivedBy','voidedAt','replacementState'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]])));
  if(attendance){output.members=(await read('members')).map(m=>({id:m.id,fullName:m.fullName||m.name||'',lga:m.lga||''}));output.attendance=await read('attendanceEntries');}
 }
 if(role==='auditor'){const fields=['id','fullName','name','lga','email','mpuNumber','memberSince','membershipStatus','amountOwed','financeSnapshotDate','financialStatus','lastQualifyingPaymentDate','archivedAt','mergedInto','linkedMemberIds'];output.members=output.members.map(m=>Object.fromEntries(fields.filter(k=>m[k]!==undefined).map(k=>[k,m[k]])));const redact=v=>Array.isArray(v)?v.map(redact):v&&Object.getPrototypeOf(v)===Object.prototype?Object.fromEntries(Object.entries(v).filter(([k])=>!['qrToken','dateOfBirth','activeLinkHash','inviteHash','link','secureLink','password'].includes(k)).map(([k,x])=>[k,redact(x)])):v;output.audit=output.audit.map(redact);}
 if(full||role==='auditor'){output.ledgerBalances=await require('./ledger-service').summaries(db,output.members,output.payments);output.members=output.members.map(m=>{const c=output.ledgerBalances.find(c=>c.memberId===m.id);return c?.active?{...m,snapshotAmountOwed:m.amountOwed,amountOwed:c.outstandingCents/100,creditBalance:c.creditCents/100,calculatedLedger:{asOf:c.asOf,status:c.status}}:m})}
 output.handovers=output.handovers.map(h=>{const v={...h};delete v.activeLinkHash;return v});output.queue=output.queue.map(q=>{const v={...q};delete v.link;return v});return output;
}
function json(value){if(value?.toDate)return value.toDate().toISOString();if(Array.isArray(value))return value.map(json);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([,v])=>v!==undefined).map(([k,v])=>[k,json(v)]));return value}
module.exports={open,verify,data,roleFor,roles,json};

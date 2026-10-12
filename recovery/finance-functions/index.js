const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const policy=require('./finance-policy');
initializeApp();
const db=getFirestore();
const key=v=>createHash('sha256').update(v).digest('hex');
const {onCall,HttpsError}=require('firebase-functions/v2/https');
const finance=require('./finance-service');
const sessions=require('./finance-session');
const actorFor=request=>({uid:request.auth?.uid,email:request.auth?.token.email||'',emailVerified:request.auth?.token.email_verified===true});
exports.financeCommand=onCall({region:'us-central1'},async request=>{
 try{const actor=actorFor(request);actor.passwordSession=await sessions.verify(db,actor,request.data?.session);if(request.data?.action==='voterRegister')return sessions.json(await require('./voter-service').report(db,actor,request.data.data||{}));return sessions.json(await finance.execute(db,actor,request.data||{}))}
 catch(error){if(error.code&&typeof error.code==='string')throw new HttpsError(error.code,error.message);console.error('Finance operation failed',error);throw new HttpsError('internal','The finance operation could not be completed. No partial change was saved.')}
});
exports.openFinanceSession=onCall({region:'us-central1'},async request=>{
 try{return await sessions.open(db,actorFor(request),request.data?.password)}catch(error){throw new HttpsError(error.code||'unavailable',error.code?error.message:'The password connection is unavailable. Please try again.')}
});
exports.financeData=onCall({region:'us-central1'},async request=>{
 try{return sessions.json(await sessions.data(db,actorFor(request),request.data?.session))}catch(error){throw new HttpsError(error.code||'internal',error.code?error.message:'Finance records could not be loaded.')}
});
exports.financeFile=onCall({region:'us-central1',memory:'256MiB'},async request=>{
 try{const actor=actorFor(request);if(!await sessions.verify(db,actor,request.data?.session))throw new HttpsError('unauthenticated','Unlock the finance workspace with your password.');const role=await sessions.roleFor(db,actor);if(!['chairman','admin','finance','auditor'].includes(role))throw new HttpsError('permission-denied','Your role cannot access evidence.');const id=require('./finance-validation').id(request.data?.id),snap=await db.doc('financeEvidence/'+id).get();if(!snap.exists||snap.data().status!=='Stored')throw new HttpsError('not-found','Stored evidence not found.');const e=snap.data(),file=require('firebase-admin/storage').getStorage().bucket().file(e.path),[metadata]=await file.getMetadata();if(String(metadata.generation)!==e.storageGeneration||Number(metadata.size)!==e.size)throw new HttpsError('failed-precondition','The stored file no longer matches its evidence record.');const [bytes]=await file.download();if(key(bytes)!==e.sha256)throw new HttpsError('failed-precondition','The evidence checksum differs from its recorded original.');return {filename:e.filename,contentType:e.contentType,base64:bytes.toString('base64')};}catch(error){throw new HttpsError(error.code&&typeof error.code==='string'?error.code:'internal',error.code&&typeof error.code==='string'?error.message:'The supporting file could not be downloaded.')}
});

// Durable outbox. Provider delivery is separate; queued never means sent.
exports.financeComplianceDaily=onSchedule({schedule:'every day 08:00',timeZone:'America/New_York',retryCount:1},async()=>{
 const today=policy.nyDate();
 const cfgSnap=await db.doc('financeConfig/main').get(),cfg=cfgSnap.exists?cfgSnap.data():{};
 const members=await db.collection('members').get();
 for(const doc of members.docs){
  await db.runTransaction(async tx=>{
   const latest=await tx.get(doc.ref);if(!latest.exists)return;
   const m={...latest.data(),id:doc.id};
   const dues=policy.duesState(m,today,cfg);
   const attendanceSnap=await tx.get(db.collection('attendanceEntries').where('memberId','==',doc.id));
   const attendance=policy.attendanceState(m,attendanceSnap.docs.map(x=>x.data()),today,cfg);
   const pending=[];
   if(dues.reminderDue)pending.push({id:key('dues|'+doc.id+'|'+dues.reminderKey),type:'Finance Compliance',message:policy.duesMessage(m,dues),baseline:m.lastQualifyingPaymentDate,projectedSuspensionDate:dues.suspensionDate});
   if(attendance.reminderDue)pending.push({id:key('attendance|'+doc.id+'|'+attendance.year+'|Q3'),type:'Attendance Reminder',message:policy.attendanceMessage(m,attendance),year:attendance.year,finalMeetingDate:attendance.finalDate});
   const queued=[];
   for(const item of pending){const ref=db.doc('notificationsQueue/'+item.id);queued.push({ref,item,snap:await tx.get(ref)})}
   for(const {ref,item,snap} of queued){if(!snap.exists)tx.create(ref,{...item,memberId:doc.id,memberName:m.fullName||'',toEmail:m.email||'',status:'Queued',deliveryStatus:'Not sent',createdAt:FieldValue.serverTimestamp(),source:'Scheduled compliance check'});}
   tx.set(doc.ref,{financeComplianceStatus:dues.status,financeComplianceCheckedAt:FieldValue.serverTimestamp(),...(dues.suspensionDate?{projectedSuspensionDate:dues.suspensionDate}:{})},{merge:true});
  });
 }
 return null;
});
const election=require('./election-service');
exports.electionCommand=onCall({region:'us-central1'},async request=>{try{return await election.execute(db,actorFor(request),request.data||{})}catch(e){if(typeof e.code==='string')throw new HttpsError(e.code,e.message);console.error('Election save failed',e);throw new HttpsError('internal','Election record could not be saved.');}});
exports.electionRegister=onCall({region:'us-central1'},async request=>{try{return await election.register(db,actorFor(request))}catch(e){if(typeof e.code==='string')throw new HttpsError(e.code,e.message);throw new HttpsError('internal','Register report could not be loaded.');}});

exports.electionLegacy=onCall({region:'us-central1'},async request=>{try{return await election.legacy(db,actorFor(request),request.data?.part)}catch(e){throw new HttpsError(typeof e.code==='string'?e.code:'internal',typeof e.code==='string'?e.message:'Migration data is unavailable.');}});

exports.submitElectionCorrection=onCall({region:'us-central1'},async request=>{try{return await election.submitCorrection(db,actorFor(request),request.data||{})}catch(e){throw new HttpsError(typeof e.code==='string'?e.code:'internal',typeof e.code==='string'?e.message:'The correction could not be saved.');}});

exports.submitPaymentDetails=onCall({region:'us-central1'},async request=>{try{return await election.submitPayment(db,actorFor(request),request.data||{})}catch(e){throw new HttpsError(typeof e.code==='string'?e.code:'internal',typeof e.code==='string'?e.message:'The payment details could not be saved.');}});

// QR cards and Attendance Center: deploy these named functions only.
const memberServices=require('./member-services');
const memberCallable=handler=>onCall({region:'us-central1',timeoutSeconds:120},async request=>{try{return sessions.json(await handler(db,actorFor(request),request.data||{}))}catch(e){if(typeof e.code==='string')throw new HttpsError(e.code,e.message);console.error('Member service failed',e);throw new HttpsError('internal','The member operation could not be completed. Refresh and try again.')}});
exports.memberCard=memberCallable(memberServices.card);
exports.attendanceData=memberCallable(memberServices.data);
exports.attendanceCommand=memberCallable(memberServices.execute);

const platform=require('./platform-service');
exports.financeGovernance=memberCallable(async(db,actor,d)=>{actor.passwordSession=await sessions.verify(db,actor,d.session);return platform.command(db,actor,d)});
exports.staffAccess=memberCallable(async(db,actor,d)=>{actor.passwordSession=await sessions.verify(db,actor,d.session);return require('./staff-service').execute(db,actor,d)});
exports.memberZelle=memberCallable(platform.memberZelle);
exports.financePublicLink=memberCallable(platform.publicLink);

'use strict';
const {FieldValue,Timestamp}=require('firebase-admin/firestore');
const {createHash}=require('node:crypto');
const {getStorage}=require('firebase-admin/storage');
const V=require('./finance-validation');
const P=require('./finance-policy');
const hash=v=>createHash('sha256').update(v).digest('hex');
const roles=['chairman','admin','finance','finance_print','attendance','finance_assistant'];
const stamp=()=>FieldValue.serverTimestamp();
function audit(tx,db,actor,action,target,before,after,reason){tx.create(db.collection('financeAudit').doc(),{actorUid:actor.uid,actorEmail:actor.email,action,target,before:before||null,after:after||null,reason:reason||'',at:stamp()})}
function latestDues(member,payments){const dates=payments.filter(p=>V.confirmed(p)&&p.qualifiesForGoodStanding&&P.validDate(p.paymentDate)).map(p=>p.paymentDate);if(P.validDate(member.financeLegacyDuesBaseline))dates.push(member.financeLegacyDuesBaseline);return dates.sort().pop()||null}
function descendants(id,records){const map=new Map(records.map(p=>[p.id,p]));return records.filter(p=>{const seen=new Set();let parent=p.replacesReceipt;while(parent&&!seen.has(parent)){if(parent===id)return true;seen.add(parent);parent=map.get(parent)?.replacesReceipt}return false})}
function replacementSummary(original,records){const linked=descendants(original.id,records),paid=linked.filter(V.confirmed).reduce((n,p)=>n+Number(p.amountCents??Math.round(Number(p.amount)*100)),0),required=Number(original.amountCents??Math.round(Number(original.amount)*100));return {replacementState:paid>=required?'Settled':paid>0?'Partially paid':linked.some(p=>!p.voidedAt&&String(p.status||p.verificationStatus).startsWith('Pending'))?'Awaiting confirmation':'Required',replacementPaidCents:paid}}
function reconcile(tx,db,actor,records,reason){for(const p of records.filter(p=>p.status==='Bounced / returned')){const summary=replacementSummary(p,records);if(p.replacementState!==summary.replacementState||p.replacementPaidCents!==summary.replacementPaidCents){tx.update(db.doc('payments/'+p.id),{...summary,revision:Number(p.revision||0)+1});audit(tx,db,actor,'replacementReconciliation',p.id,{replacementState:p.replacementState||'Required'},summary,reason)}}}
async function execute(db,actor,command,now=new Date()){
 if(!actor?.uid||!actor.emailVerified)V.fail('Sign in with a verified email address.','unauthenticated');
 if(actor.passwordSession!==true)V.fail('Unlock the finance workspace with your password.','unauthenticated');
 const action=V.text(command.action,60,true),d=command.data||{},nonce=V.id(command.requestId),requestHash=hash(JSON.stringify({action,data:d}));
 return db.runTransaction(async tx=>{
  const profile=await tx.get(db.doc('users/'+actor.uid));
  const role=profile.exists?(['chairman','admin'].includes(profile.data().role)?profile.data().role:profile.data().financeRole||profile.data().role):actor.email==='dunkas@gmail.com'?'chairman':null;
  if(!roles.includes(role)||profile.exists&&(profile.data().disabled===true||profile.data().active===false))V.fail('Finance access is required.','permission-denied');
  if(!['chairman','admin','finance'].includes(role)){
   const allowed=(['attendance','finance_assistant'].includes(role)&&['attendanceEntry','importAttendanceRows'].includes(action))||(['finance_print','finance_assistant'].includes(role)&&action==='logReceiptPrint');
   if(!allowed)V.fail('Your role does not allow this finance action.','permission-denied');
  }
  const reqRef=db.doc('financeRequests/'+nonce),prior=await tx.get(reqRef);
  if(prior.exists){const saved=prior.data();if(saved.uid!==actor.uid||saved.hash!==requestHash)V.fail('This request identifier is already used.','already-exists');return saved.result}
  let result;
  const reason=V.text(d.reason,2000);
  if(action==='bootstrapTypes'){
   if(!['chairman','admin'].includes(role))V.fail('Chairman or administrator access required.','permission-denied');
   const seeds=[['annual-dues','Annual dues',true],['convention-levy','Convention levy',false],['donation','Donation',false]],snaps=[];
   for(const [typeId] of seeds)snaps.push(await tx.get(db.doc('paymentTypes/'+typeId)));
   const configRef=db.doc('financeConfig/main'),config=await tx.get(configRef);
   if(!config.exists)tx.create(configRef,{emailSender:'dunkas@gmail.com',emailSenderName:'MPU Finance',emailProvider:'Gmail',emailDeliveryEnabled:false,phoneDeliveryEnabled:false,deliverySetupStatus:'Not configured',receiptPrefix:'MPU',organizationName:'Mbaise Progressive Union',checkContactDays:7,evidenceMaxMB:10,enabledPaymentMethods:['Cash','Check','Zelle'],updatedAt:stamp()});
   seeds.forEach(([typeId,name,qualifiesForDues],i)=>{if(!snaps[i].exists){const value={name,qualifiesForDues,createdAt:stamp(),createdBy:actor.uid,revision:1};tx.create(snaps[i].ref,value);audit(tx,db,actor,action,typeId,null,{name,qualifiesForDues},'Initial payment categories')}});result={ok:true};
  }else if(action==='reviewPaymentSubmission'){
   const ref=db.doc('paymentSubmissions/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Submission not found.','not-found');const old=snap.data();if(Number(d.revision)!==Number(old.revision||0))V.fail('Submission changed. Refresh before reviewing.','aborted');const status=V.text(d.status,40,true);if(!['Under Review','Rejected','Recorded'].includes(status)||!reason)V.fail('Select a review status and provide a reason.');let recordId='';if(status==='Recorded'){recordId=V.id(d.recordId);const receipt=await tx.get(db.doc('payments/'+recordId));if(!receipt.exists||receipt.data().voidedAt)V.fail('Select an active recorded receipt.');if(receipt.data().paymentMethod!=='Zelle'||receipt.data().referenceNumber!==old.reference||Number(receipt.data().amount)!==old.amount)V.fail('The receipt method, amount and Zelle reference must match the submitted details.');const member=await tx.get(db.doc('members/'+receipt.data().memberId));if(!member.exists||member.data().email!==old.email)V.fail('The receipt member must match the signed-in submitter.');}
   const value={status,recordId,reviewReason:reason,reviewedBy:actor.email,reviewedAt:stamp(),revision:Number(old.revision||0)+1};tx.update(ref,value);audit(tx,db,actor,action,ref.path,old,value,reason);result={ok:true};
  }else if(action==='recordPayment'){
   const config=await tx.get(db.doc('financeConfig/main')),cfg=config.exists?config.data():{};
   const input=V.paymentInput(d,now),memberRef=db.doc('members/'+input.memberId),memberSnap=await tx.get(memberRef);
   if(Array.isArray(cfg.enabledPaymentMethods)&&!cfg.enabledPaymentMethods.includes(input.paymentMethod))V.fail('This payment method is disabled in Configuration.','failed-precondition');
   if(!memberSnap.exists)V.fail('Select an existing registered member.','not-found');const member=memberSnap.data();
   const types=[];for(const item of input.allocations){const s=await tx.get(db.doc('paymentTypes/'+item.typeId));if(!s.exists||s.data().voidedAt)V.fail('A payment type is unavailable.','failed-precondition');types.push(s.data())}
   const original=input.replacesReceipt?await tx.get(db.doc('payments/'+input.replacesReceipt)):null;
   if(original&&(!original.exists||original.data().memberId!==input.memberId||original.data().status!=='Bounced / returned'))V.fail('Replacement must refer to this memberâ€™s returned check.','failed-precondition');
   const counterRef=db.doc('financeCounters/receipts'),counter=await tx.get(counterRef),number=Number(counter.data()?.number||0)+1;
   const existing=await tx.get(db.collection('payments').where('memberId','==',input.memberId));
   const existingRecords=existing.docs.map(s=>({...s.data(),id:s.id}));
   if(original?.exists&&replacementSummary({...original.data(),id:original.id},existingRecords).replacementState==='Settled')V.fail('This returned check is already settled.','failed-precondition');
   const allocations=input.allocations.map((a,i)=>({...a,amount:a.amountCents/100,purpose:types[i].name,qualifiesForDues:types[i].qualifiesForDues===true}));
   const payment={...input,allocations,id:nonce,receiptOrganizationName:cfg.organizationName||'Mbaise Progressive Union',receiptFooter:cfg.receiptFooter||'',receiptNumber:(cfg.receiptPrefix||'MPU')+'-'+String(number).padStart(7,'0'),memberName:member.fullName||member.name||'',email:member.email||'',phone:member.phone||'',userUid:member.userUid||'',status:V.initialStatus(input.paymentMethod),verificationStatus:input.paymentMethod==='Cash'?'Verified':'Pending',paymentType:allocations.map(a=>a.purpose).join(' + '),qualifiesForGoodStanding:allocations.some(a=>a.qualifiesForDues),receivedBy:actor.email,createdAt:stamp(),revision:1};
   const baseline=member.financeBaselineInitialized?member.financeLegacyDuesBaseline:member.lastQualifyingPaymentDate||null;
   const effective={...member,financeLegacyDuesBaseline:baseline};
   tx.create(db.doc('payments/'+nonce),payment);tx.set(counterRef,{number});
   tx.set(memberRef,{financeBaselineInitialized:true,financeLegacyDuesBaseline:baseline,lastQualifyingPaymentDate:latestDues(effective,[...existingRecords,payment])},{merge:true});
   if(original){tx.update(original.ref,{replacementReceipt:nonce});reconcile(tx,db,actor,[...existingRecords,payment],reason);audit(tx,db,actor,'linkReplacement',original.id,null,{replacementReceipt:nonce},reason)}
   audit(tx,db,actor,action,nonce,null,payment,reason);result={id:nonce,receiptNumber:payment.receiptNumber};
   tx.create(db.doc('notificationsQueue/receipt-'+nonce),{type:'Payment receipt',memberId:input.memberId,receiptId:nonce,toEmail:member.email||'',message:input.paymentMethod==='Check'?'Thank you for your payment and for supporting MPU. We have received your check and will confirm your payment as soon as it clears.':input.paymentMethod==='Zelle'?'Thank you for your payment and support of MPU. We will confirm it after checking the transfer.':'Thank you for your payment and support of MPU. Your payment is recorded.',status:'Queued',deliveryStatus:'Not sent',createdAt:stamp()});
  }else if(action==='paymentStatus'||action==='voidPayment'){
   if(!reason)V.fail('A correction reason is required.');const paymentRef=db.doc('payments/'+V.id(d.id)),snap=await tx.get(paymentRef);if(!snap.exists)V.fail('Payment not found.','not-found');const old=snap.data();
   if(Number(d.revision)!==Number(old.revision||0))V.fail('This record changed. Refresh before correcting it.','aborted');
   if(old.voidedAt)V.fail('This payment is already voided.','failed-precondition');
   const next=action==='voidPayment'?'Voided':V.paymentTransition(old,V.text(d.status,40,true));
   const memberRef=db.doc('members/'+V.id(old.memberId)),member=await tx.get(memberRef),all=await tx.get(db.collection('payments').where('memberId','==',old.memberId));
   const config=await tx.get(db.doc('financeConfig/main')),cfg=config.exists?config.data():{};
   const changed={...old,status:next,verificationStatus:['Recorded','Cleared','Verified'].includes(next)?'Verified':next==='Rejected'||next==='Voided'||next==='Bounced / returned'?'Rejected':'Pending',revision:Number(old.revision||0)+1,updatedAt:stamp(),updatedBy:actor.email};
   if(next==='Bounced / returned'){changed.bankReturnDate=V.date(d.bankReturnDate,now);changed.notifyBy=P.addDays(changed.bankReturnDate,Number(cfg.checkContactDays)||7);changed.bankReference=V.text(d.bankReference,200,true);changed.replacementState='Required'}
   if(next==='Cleared'){changed.bankReference=V.text(d.bankReference,200,true);changed.clearedAt=stamp()}
   if(next==='Voided'){changed.voidedAt=stamp();changed.voidReason=reason}
   tx.update(paymentRef,changed);
   if(member.exists){const m=member.data();if(!m.financeBaselineInitialized)V.fail('Historical payment needs baseline reconciliation before correction.','failed-precondition');tx.update(memberRef,{lastQualifyingPaymentDate:latestDues(m,all.docs.map(s=>s.id===snap.id?changed:s.data()))})}
   reconcile(tx,db,actor,all.docs.map(s=>({...s.data(),...(s.id===snap.id?changed:{}),id:s.id})),reason);
   const message=next==='Bounced / returned'?'Thank you for your continued support of MPU. Unfortunately, the bank returned your check unpaid. Kindly contact the Financial Secretary to arrange a replacement payment. We appreciate your assistance.':next==='Cleared'?'Your check has cleared and your payment is confirmed. Thank you.':next==='Voided'?'This payment record was voided. Please contact the Financial Secretary if you need assistance.':'Your payment status has been updated. Thank you for your support.';
   tx.create(db.doc('notificationsQueue/payment-'+nonce),{type:'Payment status',memberId:old.memberId,receiptId:snap.id,toEmail:old.email||'',message,status:'Queued',deliveryStatus:'Not sent',createdAt:stamp()});
   if(next==='Voided')tx.create(db.doc('notificationsQueue/chairman-'+nonce),{type:'Voided payment',toEmail:'dunkas@gmail.com',receiptId:snap.id,message:'Payment '+(old.receiptNumber||snap.id)+' was voided by '+actor.email+'. Reason: '+reason,status:'Queued',deliveryStatus:'Not sent',createdAt:stamp()});
   audit(tx,db,actor,action,snap.id,old,changed,reason);result={id:snap.id,status:next};
  }else if(['createType','editType','voidType','unlockType'].includes(action)){
   const ref=db.doc('paymentTypes/'+(action==='createType'?nonce:V.id(d.id))),snap=await tx.get(ref),old=snap.exists?snap.data():null;
   if(action!=='createType'&&!old)V.fail('Payment type not found.','not-found');if(action!=='createType'&&!reason)V.fail('A reason is required.');
   if(action==='unlockType'&&role!=='chairman')V.fail('Only the chairman can unlock a payment type.','permission-denied');
   if(action==='editType'||action==='voidType'){if(!V.editableType(old,now.getTime()))V.fail('Payment type is locked. Request chairman unlock.','failed-precondition');if(Number(d.revision)!==old.revision)V.fail('Payment type changed. Refresh first.','aborted')}
   const value=action==='createType'?{name:V.text(d.name,100,true),qualifiesForDues:d.qualifiesForDues===true,createdAt:stamp(),createdBy:actor.uid,revision:1}:action==='unlockType'?{unlockUntil:Timestamp.fromMillis(now.getTime()+300000),unlockBy:actor.uid,revision:old.revision+1}:action==='voidType'?{voidedAt:stamp(),voidReason:reason,revision:old.revision+1}:{name:V.text(d.name,100,true),revision:old.revision+1,unlockUntil:null};
   if(action==='unlockType'&&old.voidedAt)V.fail('Voided payment types cannot be unlocked.','failed-precondition');
   if(action==='createType')tx.create(ref,value);else tx.update(ref,value);audit(tx,db,actor,action,ref.id,old,value,reason);
   if(action==='voidType')tx.create(db.doc('notificationsQueue/type-'+nonce),{type:'Voided payment type',toEmail:'dunkas@gmail.com',message:'Payment type '+old.name+' was voided by '+actor.email+'. Reason: '+reason,status:'Queued',deliveryStatus:'Not sent',createdAt:stamp()});result={id:ref.id};
  }else if(action==='registerMember'){
   const fullName=V.text(d.fullName,150,true),email=V.text(d.email,200).toLowerCase(),phone=V.text(d.phone,50),phoneKey=phone.replace(/\D/g,'');
   if(!email&&!phoneKey)V.fail('An email or phone number is required.');if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))V.fail('Enter a valid email address.');
   const members=await tx.get(db.collection('members'));
   if(members.docs.some(s=>email&&String(s.data().email||'').trim().toLowerCase()===email||phoneKey&&String(s.data().phone||'').replace(/\D/g,'')===phoneKey))V.fail('A member with this contact already exists.','already-exists');
   if(members.docs.some(s=>s.data().financeSnapshotId&&!s.data().email&&!s.data().phone&&String(s.data().fullName||'').trim().toLowerCase()===fullName.toLowerCase()))V.fail('A historical member with this name exists. Update that memberâ€™s contact details rather than creating a duplicate.','already-exists');
   const value={id:nonce,memberId:nonce,fullName,email,phone,lga:V.text(d.lga,100),memberSince:V.date(d.memberSince,now),membershipStatus:'Active',amountOwed:null,attendanceCount:null,lastQualifyingPaymentDate:null,notes:V.text(d.notes,2000),createdAt:stamp(),createdBy:actor.uid};
   tx.create(db.doc('members/'+nonce),value);audit(tx,db,actor,action,nonce,null,value,'New member registration');result={id:nonce};
  }else if(action==='attendanceEntry'){
   const memberId=V.id(d.memberId),member=await tx.get(db.doc('members/'+memberId));if(!member.exists)V.fail('Member not found.','not-found');
   const day=V.date(d.date,now),meeting=V.text(d.meeting,150,true),status=V.text(d.status,20,true);if(!['Present','Absent'].includes(status))V.fail('Choose Present or Absent.');if(!reason)V.fail('Record the source or correction reason.');
   const entryId=hash(memberId+'|'+day+'|'+meeting),ref=db.doc('attendanceEntries/'+entryId),old=await tx.get(ref),value={memberId,date:day,meeting,status,reason,updatedAt:stamp(),updatedBy:actor.uid};
   tx.set(ref,value);audit(tx,db,actor,action,entryId,old.exists?old.data():null,value,reason);result={id:entryId};
  }else if(action==='importAttendanceRows'){
   if(!reason)V.fail('Record the attendance import source.');if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>50)V.fail('Import one to fifty reviewed attendance rows.');
   const planned=[];
   for(const row of d.rows){const memberId=V.id(row.memberId),member=await tx.get(db.doc('members/'+memberId));if(!member.exists)V.fail('A selected member does not exist.','not-found');const date=V.date(row.date,now),meeting=V.text(row.meeting,150,true),status=V.text(row.status,20,true);if(!['Present','Absent'].includes(status))V.fail('Attendance must be Present or Absent.');const entryId=hash(memberId+'|'+date+'|'+meeting),ref=db.doc('attendanceEntries/'+entryId),old=await tx.get(ref);planned.push({ref,old,value:{memberId,date,meeting,status,reason:V.text(row.reason,2000)||reason,updatedAt:stamp(),updatedBy:actor.uid}})}
   if(new Set(planned.map(p=>p.ref.id)).size!==planned.length)V.fail('Duplicate member / meeting rows exist in this batch.');
   for(const p of planned){tx.set(p.ref,p.value);audit(tx,db,actor,action,p.ref.id,p.old.exists?p.old.data():null,p.value,reason)}result={imported:planned.length};
  }else if(action==='payerContact'){
   const ref=db.doc('payments/'+V.id(d.id)),old=await tx.get(ref);if(!old.exists||old.data().status!=='Bounced / returned')V.fail('Select a returned check.','failed-precondition');if(!reason)V.fail('A contact note is required.');
   const value={payerContactedAt:V.date(d.date,now),contactMethod:V.text(d.method,50,true),contactEvidence:reason,updatedAt:stamp(),revision:Number(old.data().revision||0)+1};tx.update(ref,value);audit(tx,db,actor,action,ref.id,old.data(),value,reason);result={id:ref.id};
  }else if(action==='duesContact'||action==='duesOverride'){
   const ref=db.doc('members/'+V.id(d.id)),old=await tx.get(ref);if(!old.exists)V.fail('Member not found.','not-found');if(!reason)V.fail('A reason is required.');
   let value;if(action==='duesContact')value={lastFinanceContactDate:V.date(d.date,now),lastFinanceContactMethod:V.text(d.method,50,true)};
   else{const status=V.text(d.status,50);if(!['','Current','Approaching suspension','Suspended','Needs review'].includes(status))V.fail('Invalid membership finance status.');value={financeStatusOverride:status,financeOverrideReason:reason,financeOverrideBy:actor.uid,financeOverrideAt:stamp(),financeOverrideUntil:null}}
   tx.update(ref,value);audit(tx,db,actor,action,ref.id,old.data(),value,reason);result={id:ref.id};
  }else if(action==='savePolicy'){
   if(!reason)V.fail('A reason is required.');const warningMonths=Number(d.warningMonths),suspensionMonths=Number(d.suspensionMonths),repeatDays=Number(d.repeatDays),attendanceYear=Number(d.attendanceYear),attendanceMinimum=Number(d.attendanceMinimum),finalDateRule=d.finalDateRule==='manual'?'manual':'thirdSundayNovember',finalMeetingDate=finalDateRule==='manual'?V.text(d.finalMeetingDate,10,true):P.thirdSundayNovember(attendanceYear);
   if(!P.validDate(finalMeetingDate)||!finalMeetingDate.startsWith(String(attendanceYear)))V.fail('The final meeting date must be in the selected year.');
   const value={warningMonths,suspensionMonths,repeatDays,attendanceYear,attendanceMinimum,finalDateRule,finalMeetingDate,updatedAt:stamp(),updatedBy:actor.uid};P.duesState({lastQualifyingPaymentDate:P.nyDate(now)},P.nyDate(now),value);P.attendanceState({id:''},[],P.nyDate(now),value);
   const ref=db.doc('financeConfig/main'),old=await tx.get(ref);tx.set(ref,value,{merge:true});audit(tx,db,actor,action,ref.path,old.exists?old.data():null,value,reason);result={ok:true};
  }else if(action==='saveSecuritySettings'){
   if(!['chairman','admin'].includes(role))V.fail('Chairman or administrator access required.','permission-denied');if(!reason)V.fail('A reason is required.');const sessionMinutes=Number(d.sessionMinutes),idleMinutes=Number(d.idleMinutes);if(!Number.isInteger(sessionMinutes)||sessionMinutes<15||sessionMinutes>240||!Number.isInteger(idleMinutes)||idleMinutes<5||idleMinutes>30||idleMinutes>sessionMinutes)V.fail('Session must be 15–240 minutes and inactivity 5–30 minutes, within the session limit.');const ref=db.doc('financeConfig/main'),old=await tx.get(ref),value={sessionMinutes,idleMinutes,updatedAt:stamp(),updatedBy:actor.uid};tx.set(ref,value,{merge:true});audit(tx,db,actor,action,ref.path,old.exists?old.data():null,value,reason);result={ok:true};
  }else if(action==='saveOrganizationSettings'||action==='saveDeliverySettings'){
   if(!['chairman','admin'].includes(role))V.fail('Chairman or administrator access required.','permission-denied');if(!reason)V.fail('A reason is required.');
   const ref=db.doc('financeConfig/main'),old=await tx.get(ref);let value;
   if(action==='saveDeliverySettings'){const emailSender=V.text(d.emailSender,200,true);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailSender))V.fail('Enter a valid sender email.');value={emailSender,emailSenderName:V.text(d.emailSenderName,100,true),emailProvider:'Gmail',emailDeliveryEnabled:false,phoneDeliveryEnabled:false,deliverySetupStatus:'Not configured'};}
   else{const receiptPrefix=V.text(d.receiptPrefix,12,true).toUpperCase();if(!/^[A-Z0-9-]+$/.test(receiptPrefix))V.fail('Use letters, digits or hyphens for the receipt prefix.');const methods=d.enabledPaymentMethods;if(!Array.isArray(methods)||!methods.length||methods.some(v=>!['Cash','Check','Zelle'].includes(v)))V.fail('Enable at least one supported payment method.');const checkContactDays=Number(d.checkContactDays),evidenceMaxMB=Number(d.evidenceMaxMB);if(!Number.isInteger(checkContactDays)||checkContactDays<1||checkContactDays>7||!Number.isInteger(evidenceMaxMB)||evidenceMaxMB<1||evidenceMaxMB>10)V.fail('Check contact deadline must be 1â€“7 days; file limit must be 1â€“10 MB.');value={organizationName:V.text(d.organizationName,150,true),receiptPrefix,receiptFooter:V.text(d.receiptFooter,500),contactEmail:V.text(d.contactEmail,200),contactPhone:V.text(d.contactPhone,50),enabledPaymentMethods:[...new Set(methods)],checkContactDays,evidenceMaxMB,defaultSnapshotProvisional:d.defaultSnapshotProvisional===true,importSourceLabel:V.text(d.importSourceLabel,150,true)};}
   tx.set(ref,{...value,updatedAt:stamp(),updatedBy:actor.uid},{merge:true});audit(tx,db,actor,action,ref.path,old.exists?old.data():null,value,reason);result={ok:true};
  }else if(action==='logReceiptPrint'){
   const ref=db.doc('payments/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Receipt not found.','not-found');const p=snap.data(),receipt=Object.fromEntries(['receiptNumber','memberName','paymentMethod','paymentDate','amount','status','verificationStatus','paymentType','allocations','referenceNumber','checkNumber','receivedBy','voidedAt','replacementState','receiptOrganizationName','receiptFooter'].filter(k=>p[k]!==undefined).map(k=>[k,p[k]]));receipt.id=ref.id;audit(tx,db,actor,action,ref.id,null,{format:V.text(d.format,30,true)},'Receipt print / PDF request');result={receipt};
  }else if(action==='queueReceipt'){
   const ref=db.doc('payments/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Payment not found.','not-found');const p=snap.data(),member=await tx.get(db.doc('members/'+V.id(p.memberId))),recipient=member.data()?.email||p.email;if(!recipient)V.fail('Add the memberâ€™s email before queuing a receipt.','failed-precondition');const message=p.status==='Voided'?'This payment record has been voided. Please contact the Financial Secretary for assistance.':p.status==='Bounced / returned'?'Thank you for your support. Your check was returned unpaid; please contact the Financial Secretary to arrange a replacement.':p.paymentMethod==='Check'&&!V.confirmed(p)?'Thank you for your payment and support of MPU. We have received your check and will confirm your payment as soon as it clears.':V.confirmed(p)?'Thank you for your payment and support of MPU. Your payment is confirmed.':'Thank you for your support. Your payment is awaiting verification.';tx.create(db.doc('notificationsQueue/receipt-request-'+nonce),{type:'Payment receipt',receiptId:snap.id,memberId:p.memberId,toEmail:recipient,message,status:'Queued',deliveryStatus:'Not sent',createdAt:stamp()});audit(tx,db,actor,action,snap.id,null,{toEmail:recipient,deliveryStatus:'Not sent'},reason);result={queued:true,sent:false};
  }else if(action==='importSnapshotRows'){
   const sourceKey=V.text(d.sourceKey,150,true),sourceName=V.text(d.sourceName,200,true);if(!reason)V.fail('An import reason is required.');if(!Array.isArray(d.rows)||!d.rows.length||d.rows.length>50)V.fail('Import between one and fifty reviewed rows per batch.');
   const planned=[];
   for(const row of d.rows){
    const serial=Number(row.source_serial),snapshotDate=V.date(row.snapshot_date,now);if(!Number.isInteger(serial)||serial<1)V.fail('Source serial must be a positive whole number.');
    const snapshotId=hash(sourceKey+'|'+snapshotDate+'|'+serial),snapshotRef=db.doc('financeSnapshots/'+snapshotId),oldSnapshot=await tx.get(snapshotRef),memberId=row.matchMemberId?V.id(row.matchMemberId):'historic-'+hash(sourceKey+'|'+serial).slice(0,32),memberRef=db.doc('members/'+memberId),member=await tx.get(memberRef);
    if(row.matchMemberId&&!member.exists)V.fail('A selected member match no longer exists.','not-found');
    const name=V.text(row.member_name,150,true),rawBalance=row.stated_balance,amountOwed=rawBalance===null||rawBalance===undefined||String(rawBalance).trim()===''?null:Number(rawBalance);if(amountOwed!==null&&!Number.isFinite(amountOwed))V.fail('An ambiguous balance must be left unknown and marked for review.');
    const categories={};for(const [k,v]of Object.entries(row)){if(/^[a-z0-9_]+_(paid_amount|record_status|source_note)$/.test(k)){if(k.endsWith('_paid_amount')){const n=v===null||v===undefined||String(v).trim()===''?null:Number(v);if(n!==null&&(!Number.isFinite(n)||n<0))V.fail('Invalid historical paid amount.');categories[k]=n}else categories[k]=V.text(String(v??''),500)}}
    const value={sourceKey,sourceName,sourceSerial:serial,sourceRow:Number(row.source_row)||null,memberId,memberName:name,snapshotDate,snapshotDateProvisional:row.snapshot_date_provisional===true||row.snapshot_date_provisional==='true',amountOwed,sourceStandingNote:V.text(row.source_standing_note,500),reviewRequired:row.review_required===true||row.review_required==='true',categories};
    const digest=hash(JSON.stringify(value));if(oldSnapshot.exists&&oldSnapshot.data().contentHash===digest)continue;
    planned.push({snapshotRef,oldSnapshot,memberRef,member,memberId,value,digest});
   }
   if(new Set(planned.map(p=>p.snapshotRef.id)).size!==planned.length)V.fail('Duplicate source serial/date rows exist in this batch.');
   if(new Set(planned.map(p=>p.memberId+'|'+p.value.snapshotDate)).size!==planned.length)V.fail('Two source rows are assigned to the same member and snapshot date. Review the matches.');
   for(const p of planned){const value={...p.value,contentHash:p.digest,updatedAt:stamp(),updatedBy:actor.uid};
    if(p.oldSnapshot.exists){tx.create(db.doc('financeSnapshotVersions/'+nonce+'-'+p.snapshotRef.id),p.oldSnapshot.data());tx.set(p.snapshotRef,value)}else tx.create(p.snapshotRef,value);
    const m=p.member.exists?p.member.data():{},update=!m.financeSnapshotDate||p.value.snapshotDate>=m.financeSnapshotDate;
    if(update)tx.set(p.memberRef,{...(!p.member.exists?{id:p.memberId,memberId:p.memberId,fullName:p.value.memberName,email:'',phone:'',lga:'',memberSince:null,membershipStatus:'Needs identity review',attendanceCount:null,lastQualifyingPaymentDate:null,createdAt:stamp()}:{}),amountOwed:p.value.amountOwed,financeSnapshotDate:p.value.snapshotDate,financeSnapshotId:p.snapshotRef.id,financeSnapshotReviewRequired:p.value.reviewRequired},{merge:true});
    audit(tx,db,actor,action,p.snapshotRef.id,p.oldSnapshot.exists?p.oldSnapshot.data():null,value,reason);
   }result={imported:planned.length,reviewRequired:planned.filter(p=>p.value.reviewRequired).length};
  }else if(action==='updateMemberContact'){
   if(!reason)V.fail('A correction reason is required.');const ref=db.doc('members/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Member not found.','not-found');const email=V.text(d.email,200).toLowerCase(),phone=V.text(d.phone,50);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))V.fail('Enter a valid email.');const all=await tx.get(db.collection('members')),digits=phone.replace(/\D/g,'');if(all.docs.some(s=>s.id!==snap.id&&(email&&String(s.data().email||'').toLowerCase()===email||digits&&String(s.data().phone||'').replace(/\D/g,'')===digits)))V.fail('These contacts belong to another member.','already-exists');const value={email,phone,lga:V.text(d.lga,100),contactUpdatedAt:stamp(),contactUpdatedBy:actor.uid};tx.update(ref,value);audit(tx,db,actor,action,ref.id,snap.data(),value,reason);result={id:ref.id};
  }else if(action==='recordCardSnapshot'){
   const balance=Number(d.balance);if(!Number.isFinite(balance)||Math.abs(balance)>1000000)V.fail('Use a valid statement balance.');const last4=V.text(d.cardLast4,4,true);if(!/^\d{4}$/.test(last4))V.fail('Use only four card digits.');const cardType=V.text(d.cardType,30,true);if(!['Debit card','Credit card'].includes(cardType))V.fail('Select Debit card or Credit card.');const value={id:nonce,accountLabel:V.text(d.accountLabel,100,true),cardType,cardLast4:last4,balance:Math.round(balance*100)/100,asOf:V.date(d.asOf,now),statementReference:V.text(d.statementReference,200,true),notes:V.text(d.notes,2000),createdAt:stamp(),createdBy:actor.uid};tx.create(db.doc('financeCardAccounts/'+nonce),value);audit(tx,db,actor,action,nonce,null,value,reason);result={id:nonce};
  }else if(action==='recordOutgoing'){
   const method=V.text(d.method,30,true);if(!['Cash','Check','Zelle','Debit card','Credit card','Bank transfer'].includes(method))V.fail('Select a supported outgoing payment method.');
   const status=V.text(d.status,30,true);if(!['Pending approval','Paid','Reconciled'].includes(status))V.fail('Invalid outgoing payment status.');
   const kind=V.text(d.kind,40,true);if(!['Expense','Card repayment','Refund received'].includes(kind))V.fail('Invalid outgoing payment kind.');
   const last4=V.text(d.cardLast4,4);if(last4&&!/^\d{4}$/.test(last4))V.fail('Use only the last four card digits.');
   const value={id:nonce,date:V.date(d.date,now),payee:V.text(d.payee,150,true),amountCents:V.cents(d.amount),amount:V.cents(d.amount)/100,method,status,kind,category:V.text(d.category,100,true),reference:V.text(d.reference,200),notes:V.text(d.notes,2000),cardLabel:V.text(d.cardLabel,100),cardLast4:last4,createdAt:stamp(),createdBy:actor.uid,revision:1};
   tx.create(db.doc('financeOutgoing/'+nonce),value);audit(tx,db,actor,action,nonce,null,value,reason);result={id:nonce};
  }else if(action==='outgoingStatus'){
   const ref=db.doc('financeOutgoing/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Outgoing record not found.','not-found');if(!reason)V.fail('A reason is required.');const old=snap.data(),status=V.text(d.status,30,true);if(old.status==='Voided'||!['Paid','Reconciled','Voided'].includes(status))V.fail('This status change is unavailable.','failed-precondition');if(Number(d.revision)!==old.revision)V.fail('Record changed. Refresh first.','aborted');const value={status,revision:old.revision+1,updatedAt:stamp(),updatedBy:actor.uid,...(status==='Voided'?{voidedAt:stamp(),voidReason:reason}:{})};tx.update(ref,value);audit(tx,db,actor,action,ref.id,old,value,reason);result={id:ref.id};
  }else if(action==='recordHandover'){
   const recipientEmail=V.text(d.recipientEmail,200,true).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)||recipientEmail===actor.email)V.fail('Use a different recipientâ€™s email address.');const value={id:nonce,date:V.date(d.date,now),amountCents:V.cents(d.amount),amount:V.cents(d.amount)/100,giverUid:actor.uid,giverEmail:actor.email,recipientEmail,batchReference:V.text(d.batchReference,200,true),notes:V.text(d.notes,2000),status:'Awaiting recipient acknowledgment',createdAt:stamp()};tx.create(db.doc('financeHandovers/'+nonce),value);audit(tx,db,actor,action,nonce,null,value,reason);result={id:nonce};
  }else if(action==='acknowledgeHandover'){
   const ref=db.doc('financeHandovers/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Handover not found.','not-found');const old=snap.data();if(old.recipientEmail!==actor.email||old.giverUid===actor.uid)V.fail('Only the named recipient can acknowledge this handover.','permission-denied');if(old.status!=='Awaiting recipient acknowledgment')V.fail('This handover is already acknowledged.','failed-precondition');if(!reason)V.fail('An acknowledgment note is required.');const value={status:'Acknowledged',acknowledgedBy:actor.uid,acknowledgedAt:stamp(),acknowledgmentNote:reason};tx.update(ref,value);audit(tx,db,actor,action,ref.id,old,value,reason);result={id:ref.id};
  }else if(action==='startEvidence'){
   const kind=V.text(d.recordKind,40,true),collection={Payment:'payments',Outgoing:'financeOutgoing',Handover:'financeHandovers'}[kind];if(!collection)V.fail('Select Payment, Outgoing or Handover.');const recordId=V.id(d.recordId),record=await tx.get(db.doc(collection+'/'+recordId));if(!record.exists)V.fail('Linked record not found.','not-found');
   const config=await tx.get(db.doc('financeConfig/main')),maxMB=Number(config.data()?.evidenceMaxMB)||10;
   const mime=V.text(d.contentType,100,true),size=Number(d.size);if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(mime)||!Number.isInteger(size)||size<=0||size>maxMB*1048576)V.fail('Choose an image or PDF up to '+maxMB+' MB.');
   const path='finance-evidence/'+actor.uid+'/'+nonce,value={id:nonce,recordKind:kind,recordId,filename:V.text(d.filename,200,true),category:V.text(d.category,100,true),notes:V.text(d.notes,2000),ownerUid:actor.uid,contentType:mime,size,path,status:'Awaiting upload',createdAt:stamp()};tx.create(db.doc('financeEvidence/'+nonce),value);audit(tx,db,actor,action,nonce,null,value,reason);result={id:nonce,path};
  }else if(action==='completeEvidence'){
   const ref=db.doc('financeEvidence/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Upload ticket not found.','not-found');const old=snap.data();if(old.ownerUid!==actor.uid)V.fail('Only the uploader can finalize evidence.','permission-denied');if(old.status==='Stored'){result={id:ref.id};}else{
    const file=getStorage().bucket().file(old.path),[metadata]=await file.getMetadata();if(Number(metadata.size)!==old.size||metadata.contentType!==old.contentType)V.fail('Uploaded file differs from its ticket.','failed-precondition');const [bytes]=await file.download(),sha256=hash(bytes);const value={status:'Stored',sha256,storedAt:stamp(),storageGeneration:String(metadata.generation)};tx.update(ref,value);audit(tx,db,actor,action,ref.id,null,value,reason);result={id:ref.id};
   }
  }else if(action==='correctPaymentReference'){
   if(!reason)V.fail('A correction reason is required.');const ref=db.doc('payments/'+V.id(d.id)),snap=await tx.get(ref);if(!snap.exists)V.fail('Payment not found.','not-found');const old=snap.data();if(old.voidedAt)V.fail('A voided record cannot be changed.','failed-precondition');if(Number(d.revision)!==Number(old.revision||0))V.fail('Record changed. Refresh first.','aborted');const value={referenceNumber:V.text(d.referenceNumber,200),notes:V.text(d.notes,2000),revision:Number(old.revision||0)+1,updatedAt:stamp(),updatedBy:actor.uid};tx.update(ref,value);audit(tx,db,actor,action,ref.id,old,value,reason);result={id:ref.id};
  }else V.fail('Unknown finance action.');
  tx.create(reqRef,{uid:actor.uid,hash:requestHash,action,result,at:stamp()});return result;
 });
}
module.exports={execute,latestDues,descendants,replacementSummary};

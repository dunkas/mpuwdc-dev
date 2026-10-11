const statuses=['Pending','Verified','Needs Review','Rejected'];
export function cents(value){
 const text=String(value??'').trim();
 if(!/^\d+(\.\d{1,2})?$/.test(text))throw Error('Enter a non-negative amount with no more than two decimal places.');
 const result=Math.round(Number(text)*100);if(!Number.isSafeInteger(result))throw Error('Amount is too large.');return result;
}
function date(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw Error('Enter a valid date.');return value}
async function key(value){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
function context(roles){const C=window.MPUCloud,s=C?.state();if(!s?.enabled||!s.auth.currentUser)throw Error('Sign in to the connected Firebase service to save official records.');if(!roles.includes(C.role()))throw Error('Your role cannot change these records.');return {s,F:s.sdk.fsMod,actor:s.auth.currentUser.email,now:new Date().toISOString()}}
function audit(tx,F,s,actor,now,action,target,details){tx.set(F.doc(F.collection(s.db,'auditLog')),{actorEmail:actor,actorUid:s.auth.currentUser.uid,actorRole:window.MPUCloud.role(),at:now,action,target,details})}
function financial(net){return {amountOwed:Math.max(net,0)/100,creditBalance:Math.max(-net,0)/100,financialStatus:net>0?'Balance due':net<0?'Credit on account':'Current'}}
function credit(p){return p.verificationStatus==='Verified'&&(p.appliesToBalance ?? !['Donation','Pledge'].includes(p.paymentType)) ? cents(p.amount) : 0}
export async function list(name){const {s,F}=context(name==='attendance'?['chairman','admin','voter_register']:name==='members'?['chairman','admin','finance','voter_register']:['chairman','admin','finance']);const docs=await F.getDocs(F.collection(s.db,name));return docs.docs.map(d=>({...d.data(),id:d.id}))}
export async function setBalance(memberId,owed,creditAmount,reason){
 const {s,F,actor,now}=context(['chairman','admin','finance']);const owedCents=cents(owed),creditCents=cents(creditAmount||'0');
 if(owedCents&&creditCents)throw Error('Enter either an amount owed or a credit, not both.');if(!reason.trim())throw Error('Add the reason for this balance adjustment.');
 const memberRef=F.doc(s.db,'members',memberId);
 await F.runTransaction(s.db,async tx=>{
  const snap=await tx.get(memberRef);if(!snap.exists())throw Error('Member no longer exists.');const member=snap.data();
  // The member read serializes our payment writers while the legacy ledger is read.
  const ledger=await F.getDocs(F.query(F.collection(s.db,'payments'),F.where('email','==',member.email)));
  if(ledger.size>400)throw Error('This account needs a batch migration before reconciliation. No changes were saved.');
  const rows=[];for(const entry of ledger.docs){const fresh=await tx.get(entry.ref);if(fresh.exists())rows.push({ref:entry.ref,id:entry.id,data:fresh.data()})}
  const dates={};for(const row of rows){const p=row.data;if(p.verificationStatus==='Verified'&&p.qualifiesForGoodStanding&&p.paymentDate)dates[row.id]=p.paymentDate}
  const knownDates=Object.values(dates);const baselineDate=knownDates.includes(member.lastQualifyingPaymentDate)?'':member.lastQualifyingPaymentDate||'';
  for(const row of rows)tx.update(row.ref,{balanceAppliedCents:credit(row.data),updatedAt:now,updatedBy:actor});
  tx.update(memberRef,{...financial(owedCents-creditCents),financeInitialized:true,financePaymentDates:dates,financeBaselineQualifyingDate:baselineDate,updatedAt:now,updatedBy:actor});
  audit(tx,F,s,actor,now,'balance adjustment','members/'+memberId,{reason:reason.trim(),beforeOwed:member.amountOwed??null,beforeCredit:member.creditBalance??0,amountOwed:owedCents/100,creditBalance:creditCents/100});
 });
}
export async function savePayment(memberId,input){
 const {s,F,actor,now}=context(['chairman','admin','finance']);const amount=cents(input.amount);if(amount<=0)throw Error('Payment must be greater than zero.');date(input.paymentDate);
 if(!statuses.includes(input.verificationStatus))throw Error('Choose a verification status.');
 if(input.verificationStatus==='Verified'&&!input.receivedConfirmed)throw Error('Confirm that Finance matched the payment to the received transaction.');
 const reference=String(input.referenceNumber||'').trim().toUpperCase().replace(/\s+/g,'');
 if(input.paymentMethod==='Zelle'&&!reference)throw Error('Enter the Zelle confirmation reference to prevent duplicate records.');
 const id=reference?'receipt-'+await key(input.paymentMethod.toLowerCase()+'|'+reference):'pay-'+crypto.randomUUID();
 await changePayment(memberId,id,{...input,amount:amount/100,referenceNumber:reference},true,{s,F,actor,now});return id;
}
export async function verifyPayment(memberId,id,status,receivedConfirmed=false){if(status==='Verified'&&!receivedConfirmed)throw Error('Finance must match this payment to the received transaction before verification.');if(!statuses.includes(status))throw Error('Choose a verification status.');return changePayment(memberId,id,{verificationStatus:status,receivedConfirmed:status==='Verified'&&receivedConfirmed},false,context(['chairman','admin','finance']))}
async function changePayment(memberId,id,input,create,{s,F,actor,now}){
 const memberRef=F.doc(s.db,'members',memberId),paymentRef=F.doc(s.db,'payments',id);
 await F.runTransaction(s.db,async tx=>{
  const memberSnap=await tx.get(memberRef),paymentSnap=await tx.get(paymentRef);
  if(!memberSnap.exists())throw Error('Select an existing member.');const member=memberSnap.data();
  if(create&&paymentSnap.exists())throw Error('This payment reference is already recorded. Review the existing ledger entry.');
  if(create&&input.referenceNumber){
   // Imported legacy receipts may use older, non-deterministic document IDs.
   const legacy=await F.getDocs(F.query(F.collection(s.db,'payments'),F.where('paymentMethod','==',input.paymentMethod)));
   const duplicate=legacy.docs.find(row=>String(row.data().referenceNumber||'').trim().toUpperCase().replace(/\s+/g,'')===input.referenceNumber);
   if(duplicate){await tx.get(duplicate.ref);throw Error('This payment reference is already recorded. Review the existing ledger entry.')}
  }
  if(!create&&!paymentSnap.exists())throw Error('Payment no longer exists.');
  const old=paymentSnap.exists()?paymentSnap.data():{};
  if(!create&&old.email!==member.email)throw Error('The payment does not match this member.');
  const p={...old,...input,id,memberId,email:member.email,memberName:member.fullName||'',updatedAt:now,updatedBy:actor};
  const next=credit(p),previous=old.balanceAppliedCents??0;
  if((next||previous)&&!member.financeInitialized)throw Error('Set and reconcile the member’s current balance before verifying payments.');
  if(!create&&old.verificationStatus==='Verified'&&old.balanceAppliedCents===undefined)throw Error('Reconcile the current balance first so this existing payment is not credited twice.');
  if(!create&&old.verificationStatus===p.verificationStatus&&previous===next)return;
  p.balanceAppliedCents=next;
  if(create)p.createdAt=now;
  p.verifiedAt=p.verificationStatus==='Verified'?now:null;p.verifiedBy=p.verificationStatus==='Verified'?actor:null;
  if(p.verificationStatus==='Verified'){p.receivedConfirmed=true;p.matchedBy=actor;p.matchedAt=now}
  const dates={...(member.financePaymentDates||{})};
  if(p.verificationStatus==='Verified'&&p.qualifiesForGoodStanding)dates[id]=p.paymentDate;else delete dates[id];
  const patch={updatedAt:now,updatedBy:actor,financePaymentDates:dates};
  if(member.financeInitialized)Object.assign(patch,financial(cents(member.amountOwed||0)-cents(member.creditBalance||0)-(next-previous)));
  patch.lastQualifyingPaymentDate=[member.financeInitialized?(member.financeBaselineQualifyingDate||''):(member.lastQualifyingPaymentDate||''),...Object.values(dates)].sort().at(-1)||'';
  tx.set(paymentRef,p);tx.update(memberRef,patch);
  audit(tx,F,s,actor,now,create?'record payment':'payment verification','payments/'+id,{memberId,before:old.verificationStatus||null,status:p.verificationStatus,balanceChangeCents:previous-next});
 });
}
export async function saveAttendance(memberId,input){
 const {s,F,actor,now}=context(['chairman','admin','voter_register']);date(input.meetingDate);const name=input.meetingName.trim();if(!name)throw Error('Enter the meeting name.');if(!['Present','Absent','Excused'].includes(input.status))throw Error('Choose an attendance status.');
 const meetingKey=await key(input.meetingDate+'|'+name.toLowerCase().replace(/\s+/g,' '));
 const memberRef=F.doc(s.db,'members',memberId);
 await F.runTransaction(s.db,async tx=>{
  const snapshot=await tx.get(memberRef);if(!snapshot.exists())throw Error('Member no longer exists.');const member=snapshot.data();
  const history=await F.getDocs(F.query(F.collection(s.db,'attendance'),F.where('email','==',member.email)));
  if(history.size>400)throw Error('This attendance history needs a batch migration. No changes were saved.');
  const records=[];for(const row of history.docs){const fresh=await tx.get(row.ref);if(fresh.exists())records.push({id:row.id,ref:row.ref,...fresh.data()})}
  const matches=records.filter(r=>r.meetingDate===input.meetingDate&&String(r.meetingName||'').trim().toLowerCase().replace(/\s+/g,' ')===name.toLowerCase().replace(/\s+/g,' '));
  if(matches.length>1)throw Error('Duplicate meeting records need review before this attendance can be saved.');
  const ref=matches[0]?.ref||F.doc(s.db,'attendance','attendance-'+await key(memberId+'|'+meetingKey));
  // Read a new deterministic ref too: concurrent duplicate submissions then retry safely.
  if(!matches.length)await tx.get(ref);
  const existingPresent=records.filter(r=>r.status==='Present').length;
  const baseline=member.attendanceBaselineCount??Math.max(0,(member.attendanceCount||0)-existingPresent);
  const count=baseline+existingPresent-(matches[0]?.status==='Present'?1:0)+(input.status==='Present'?1:0);
  tx.set(ref,{memberId,email:member.email,memberName:member.fullName||'',lga:member.lga||'',meetingDate:input.meetingDate,meetingName:name,status:input.status,meetingKey,updatedAt:now,updatedBy:actor});
  tx.update(memberRef,{attendanceCount:count,attendanceBaselineCount:baseline,attendanceStatus:`${count} meeting${count===1?'':'s'} recorded`,updatedAt:now,updatedBy:actor});
  audit(tx,F,s,actor,now,'record attendance','attendance/'+ref.id,{memberId,meetingDate:input.meetingDate,before:matches[0]?.status||null,status:input.status});
 });
}

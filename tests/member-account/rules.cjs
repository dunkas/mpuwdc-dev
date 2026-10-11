const {readFileSync}=require('node:fs');
const assert=require('node:assert/strict');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,getDoc,getDocs,collection,query,where,updateDoc,deleteDoc}=require('firebase/firestore');
const fixtures=require('./fixtures.cjs');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-mpu-members',firestore:{host:'127.0.0.1',port:8080,rules:readFileSync('firestore.rules','utf8')}});
 // Emulator only: never seed production projects or use production credentials.
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async ctx=>{for(const [name,records] of Object.entries(fixtures))for(const [id,data] of Object.entries(records))await setDoc(doc(ctx.firestore(),name,id),data)});
 let count=0;
 const pass=async(name,fn)=>{await fn();count++;console.log('PASS '+name)};
 const member=env.authenticatedContext('test-member-a',{email:'member.a@example.test',email_verified:true}).firestore();
 const finance=env.authenticatedContext('test-finance',{email:'finance@example.test',email_verified:true}).firestore();
 const secretary=env.authenticatedContext('test-secretary',{email:'secretary@example.test',email_verified:true}).firestore();
 for(const name of ['members','payments','attendance']){
  await pass('member reads only own '+name,async()=>{const s=await assertSucceeds(getDocs(query(collection(member,name),where('email','==','member.a@example.test'))));assert(s.size>0);s.forEach(d=>assert.equal(d.data().email,'member.a@example.test'))});
  await pass('member cannot list all '+name,()=>assertFails(getDocs(collection(member,name))));
 }
 await pass('member cannot read another membership',()=>assertFails(getDoc(doc(member,'members','test-member-b'))));
 await pass('member cannot record payment',()=>assertFails(setDoc(doc(member,'payments','test-member-created'),{email:'member.a@example.test',amount:50,verificationStatus:'Verified'})));
 await pass('member cannot verify payment',()=>assertFails(updateDoc(doc(member,'payments','test-pending'),{verificationStatus:'Verified'})));
 await pass('member cannot edit attendance',()=>assertFails(updateDoc(doc(member,'attendance','test-a-september'),{status:'Present'})));
 await pass('anonymous cannot read member record',()=>assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'members','test-member-a'))));
 await pass('unverified email cannot read account',()=>assertFails(getDoc(doc(env.authenticatedContext('unverified',{email:'member.a@example.test',email_verified:false}).firestore(),'members','test-member-a'))));
 await pass('member can view LGA directory',async()=>assert.equal((await assertSucceeds(getDocs(collection(member,'lgas')))).size,3));
 await pass('Finance cannot verify without received confirmation',()=>assertFails(updateDoc(doc(finance,'payments','test-pending'),{verificationStatus:'Verified'})));
 await pass('Finance cannot create an unconfirmed verified payment',()=>assertFails(setDoc(doc(finance,'payments','test-unconfirmed'),{email:'member.a@example.test',amount:10,verificationStatus:'Verified'})));
 await pass('Finance can record and verify payment',async()=>{await assertSucceeds(setDoc(doc(finance,'payments','test-finance-created'),{email:'member.a@example.test',amount:10,verificationStatus:'Pending'}));await assertSucceeds(updateDoc(doc(finance,'payments','test-finance-created'),{verificationStatus:'Verified',receivedConfirmed:true,verifiedBy:'finance@example.test',matchedBy:'finance@example.test'}))});
 await pass('Finance can update financial fields',()=>assertSucceeds(updateDoc(doc(finance,'members','test-member-a'),{id:'test-member-a',lastQualifyingPaymentDate:'2026-09-15',amountOwed:75,updatedAt:'2026-10-11',updatedBy:'finance@example.test'})));
 await pass('Finance cannot change member identifier',()=>assertFails(updateDoc(doc(finance,'members','test-member-a'),{id:'test-member-b'})));
 await pass('Finance cannot edit attendance summary',()=>assertFails(updateDoc(doc(finance,'members','test-member-a'),{attendanceCount:99})));
 await pass('Calendar staff can edit ordinary events but cannot bypass protected attendance meetings',async()=>{await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'users','calendar-secretary'),{role:'secretary'}));const calendar=env.authenticatedContext('calendar-secretary',{email:'calendar@example.test',email_verified:true}).firestore();await assertSucceeds(setDoc(doc(calendar,'events','ordinary-event'),{title:'Calendar fixture',start:'2026-10-11'}));await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'events','linked-event'),{title:'Quarter fixture',start:'2026-10-11',attendanceLinked:true,meetingId:'quarter-2026-1'}));await assertFails(updateDoc(doc(calendar,'events','linked-event'),{start:'2026-10-12'}));await assertFails(deleteDoc(doc(calendar,'events','linked-event')));await assertFails(setDoc(doc(calendar,'events','forged-link'),{attendanceLinked:true,meetingId:'fake'}));await assertSucceeds(updateDoc(doc(calendar,'events','ordinary-event'),{title:'Updated fixture'}));});
 await pass('Register staff cannot forge eligibility reviews or birth-date evidence',()=>assertFails(updateDoc(doc(secretary,'members','test-member-a'),{voterReview:{asOf:'2026-10-11',duesStatus:'Paid'},dateOfBirth:'1990-01-01'})));
 await pass('Register staff cannot create a preverified eligibility record',()=>assertFails(setDoc(doc(secretary,'members','forged-voter'),{fullName:'Fictional forged review',voterReview:{duesStatus:'Paid'},voterReviewRevision:1})));
 await pass('legacy attendance writes are disabled in favor of password-protected callables',()=>assertFails(updateDoc(doc(secretary,'attendance','test-a-september'),{status:'Present'})));
 const ec=env.authenticatedContext('test-ec',{email:'ec@example.test',email_verified:true}).firestore();
 const request={id:'test-ec-request',type:'question',senderUid:'test-member-a',senderEmail:'member.a@example.test',senderName:'Test Member A',message:'Please explain the review process.',nomineeName:'',nomineeEmail:'',office:'',candidateAction:'',reference:'',status:'New',createdAt:'2026-10-11'};
 await pass('verified member can submit an EC request',()=>assertSucceeds(setDoc(doc(member,'ecRequests',request.id),request)));
 await pass('request cannot impersonate another sender',()=>assertFails(setDoc(doc(member,'ecRequests','test-spoof'),{...request,id:'test-spoof',senderUid:'someone-else'})));
 await pass('member can read own request',()=>assertSucceeds(getDoc(doc(member,'ecRequests',request.id))));
 await pass('another member cannot read private request',()=>assertFails(getDoc(doc(env.authenticatedContext('test-member-b',{email:'member.b@example.test',email_verified:true}).firestore(),'ecRequests',request.id))));
 await pass('member cannot list all EC requests',()=>assertFails(getDocs(collection(member,'ecRequests'))));
 await pass('member cannot change request status or reply',()=>assertFails(updateDoc(doc(member,'ecRequests',request.id),{status:'Answered',response:'Forged reply',respondedBy:'member.a@example.test'})));
 await pass('EC can review and reply',()=>assertSucceeds(updateDoc(doc(ec,'ecRequests',request.id),{status:'Answered',response:'EC response',respondedAt:'2026-10-11',respondedBy:'ec@example.test'})));
 await pass('Finance cannot read EC requests',()=>assertFails(getDoc(doc(finance,'ecRequests',request.id))));

 const anon=env.authenticatedContext('anon-report',{firebase:{sign_in_provider:'anonymous'}}).firestore();
 const anonymousRequest={...request,id:'anonymous-incident',type:'incident',anonymous:true,senderUid:'anon-report',senderEmail:'',senderName:'Anonymous',senderPhone:'',nomineePhone:''};
 await pass('anonymous identity can report without phone/name/email',()=>assertSucceeds(setDoc(doc(anon,'ecRequests',anonymousRequest.id),anonymousRequest)));
 await pass('anonymous identity cannot submit nominations',()=>assertFails(setDoc(doc(anon,'ecRequests','anon-nomination'),{...anonymousRequest,id:'anon-nomination',type:'nominate'})));
 await pass('anonymous identity cannot impersonate member email',()=>assertFails(setDoc(doc(anon,'ecRequests','anon-forgery'),{...anonymousRequest,id:'anon-forgery',senderEmail:'member.a@example.test'})));
 await pass('optional phones are allowed for verified members',()=>assertSucceeds(setDoc(doc(member,'ecRequests','optional-phone'),{...request,id:'optional-phone',senderPhone:'555-0100',nomineePhone:'555-0101'})));
 await pass('oversized phone values are rejected',()=>assertFails(setDoc(doc(member,'ecRequests','invalid-phone'),{...request,id:'invalid-phone',senderPhone:'1'.repeat(41)})));
 await pass('anonymous report stays private from other members',()=>assertFails(getDoc(doc(member,'ecRequests',anonymousRequest.id))));

 const lesson={moduleId:'day1',title:'Day 1 · Voter Ready',answers:[0,1,1,1,1],completed:true,gradedQuestions:0,correctAnswers:0,totalQuestions:5,updatedAt:'2026-10-11',uid:'test-member-a',email:'member.a@example.test',participantName:'Test Member A',lga:'Ahiazu Mbaise'};
 await pass('verified member saves own practice learning progress',()=>assertSucceeds(setDoc(doc(member,'educationProgress','test-member-a','modules','day1'),lesson)));
 await pass('member cannot save progress for another person',()=>assertFails(setDoc(doc(member,'educationProgress','test-member-b','modules','day1'),{...lesson,uid:'test-member-b'})));
 await pass('another member cannot read private learning answers',()=>assertFails(getDoc(doc(env.authenticatedContext('test-member-b',{email:'member.b@example.test',email_verified:true}).firestore(),'educationProgress','test-member-a','modules','day1'))));
 await pass('EC can review education records',()=>assertSucceeds(getDoc(doc(ec,'educationProgress','test-member-a','modules','day1'))));
 await pass('anonymous reporters cannot save named learning records',()=>assertFails(setDoc(doc(anon,'educationProgress','anon-report','modules','day1'),{...lesson,uid:'anon-report'})));

 const correction={userUid:'test-member-a',userEmail:'member.a@example.test',status:'New',details:'Please correct this fictional attendance record.',contactPhone:''};
 await pass('verified member can submit own record correction without phone',()=>assertSucceeds(setDoc(doc(member,'registerCorrections','test-correction'),correction)));
 await pass('member cannot impersonate another correction sender',()=>assertFails(setDoc(doc(member,'registerCorrections','forged-correction'),{...correction,userUid:'test-member-b'})));

 await pass('unverified bootstrap address cannot access staff payments',()=>assertFails(getDocs(collection(env.authenticatedContext('unverified-chair',{email:'dunkas@gmail.com',email_verified:false}).firestore(),'payments'))));
 await pass('unverified Finance identity cannot access staff payments',()=>assertFails(getDocs(collection(env.authenticatedContext('test-finance',{email:'finance@example.test',email_verified:false}).firestore(),'payments'))));
 await pass('member cannot self-assign additional Finance Team access',()=>assertFails(updateDoc(doc(member,'users','test-member-a'),{financeRole:'finance'})));
 await pass('new user cannot self-assign receipt printing',()=>assertFails(setDoc(doc(env.authenticatedContext('new-finance',{email:'new@example.test',email_verified:true}).firestore(),'users','new-finance'),{email:'new@example.test',role:'pending',financeRole:'finance_print'})));
 await env.withSecurityRulesDisabled(c=>setDoc(doc(c.firestore(),'attendanceEntries','finance-meeting-a'),{memberId:'test-member-a',date:'2026-09-20',meeting:'Quarterly',status:'Present'}));
 await pass('member reads own Finance House attendance',async()=>assert.equal((await assertSucceeds(getDocs(query(collection(member,'attendanceEntries'),where('memberId','==','test-member-a'))))).size,1));
 await pass('member cannot read another Finance House attendance',()=>assertFails(getDocs(query(collection(member,'attendanceEntries'),where('memberId','==','test-member-b')))));
 await pass('member cannot write Finance House attendance',()=>assertFails(setDoc(doc(member,'attendanceEntries','fake'),{memberId:'test-member-a',date:'2026-10-11',status:'Present'})));
 await env.cleanup();console.log(`${count} checks passed; fictional fixtures retained in the local emulator.`);
})().catch(e=>{console.error(e);process.exit(1)});

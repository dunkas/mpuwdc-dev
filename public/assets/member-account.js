import {ownCard} from '/assets/membership-card.js';
const sourceArea=new URLSearchParams(location.search).get('from');const memberReturn='/member-account/'+(['education','finance','admin'].includes(sourceArea)?'?from='+sourceArea:'');
const el = id => document.getElementById(id);
const money = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
  ? new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Number(value)) : 'Not available';
let cloud, sample = false, loadVersion = 0;
const sampleMember = {fullName:'Sample Member', amountOwed:75, membershipStatus:'Active', financialStatus:'Balance due — sample', attendanceCount:1, attendanceStatus:'1 meeting recorded — sample', lga:'Ahiazu Mbaise'};
const samplePayments = [{paymentDate:'2026-09-15',paymentType:'Annual Dues',paymentMethod:'Zelle',amount:50,verificationStatus:'Verified'}, {paymentDate:'2026-10-01',paymentType:'Levy',paymentMethod:'Zelle',amount:25,verificationStatus:'Pending'}];
function clearAccount(){el('ledgerBreakdown').replaceChildren();el('membershipCard').replaceChildren(); el('account').hidden=true; el('history').replaceChildren(); el('attendanceHistory').replaceChildren(); el('memberLga').textContent=''; el('memberName').textContent='Member account'; ['balance','membership','attendance','financialStatus','attendanceStatus'].forEach(id=>el(id).textContent=''); }
function render(member, payments, attendance = [], ledger = null){
 el('membershipCard').textContent=sample?'Membership cards are issued only for real, verified member records.':'Loading membership card…';
 el('account').hidden=false; el('sampleNotice').hidden=!sample; el('refresh').hidden=sample;
 el('memberName').textContent=member?.fullName || 'Your member account';
 el('recordNote').textContent=sample?'Fictional preview • No official records changed':member?(member.financeSnapshotDate?'Balance from the finance snapshot dated '+member.financeSnapshotDate+'. Contact Finance for reconciliation; this is not a live bank balance.':'Records supplied by MPU. Contact Finance if they need updating.'):'No membership record was found for your signed-in email. Contact the membership team.';
 el('balance').textContent=money(ledger?.active?ledger.outstandingCents/100:member?.amountOwed);if(ledger?.active){el('recordNote').textContent='Calculated from reviewed charges and verified allocations through '+ledger.asOf+'. Available credit: '+money(ledger.creditCents/100)+'. Unallocated verified funds: '+money(ledger.unallocatedCents/100)+'.';el('financialStatus').textContent=ledger.status;}renderLedger(ledger);
 el('memberLga').textContent=member?.lga ? `LGA: ${member.lga}` : 'LGA not supplied';
 el('membership').textContent=member?.membershipStatus || 'Not available';
 if(!ledger?.active)el('financialStatus').textContent=(member?.financialStatus || 'Financial standing has not been supplied.') + (member?.creditBalance > 0 ? ` · Credit on account: ${money(member.creditBalance)}` : '');
 const count=member?.attendanceCount;
 el('attendance').textContent=Number.isInteger(count)&&count>=0?`${count} meeting${count===1?'':'s'}`:'Not available';
 el('attendanceStatus').textContent=member?.attendanceStatus || 'Attendance status has not been supplied.';
 el('attendanceHistory').replaceChildren();
 attendance.sort((a,b)=>String(b.meetingDate||'').localeCompare(String(a.meetingDate||''))).forEach(record=>{const row=document.createElement('tr');[record.meetingDate||'Not supplied',record.meetingName||'MPU meeting',record.status||'Not supplied'].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell)});el('attendanceHistory').append(row)});
 if(!attendance.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=3;cell.textContent='No meeting attendance records have been supplied.';row.append(cell);el('attendanceHistory').append(row)}
 el('history').replaceChildren();
 payments.sort((a,b)=>String(b.paymentDate||'').localeCompare(String(a.paymentDate||''))).forEach(p=>{
  const row=document.createElement('tr');
  [p.paymentDate||'Not supplied',p.paymentType||'Not supplied',p.paymentMethod||'Not supplied',money(p.amount),p.verificationStatus||'Not supplied'].forEach(value=>{const cell=document.createElement('td');cell.textContent=value;row.append(cell)});
  el('history').append(row);
 });
 if(!payments.length){const row=document.createElement('tr'), cell=document.createElement('td');cell.colSpan=5;cell.textContent='No payment records were found. Contact Finance about missing payments.';row.append(cell);el('history').append(row)}
}
async function load(){
 const version = ++loadVersion;
 sample=false;clearAccount();
 const state=cloud?.state(),user=state?.auth?.currentUser;
 el('signOut').hidden=!user;
 if(!state?.enabled){el('message').textContent='Live member access is not connected yet. You can view the sample account below.';el('sendLink').disabled=true;return}
 el('sendLink').disabled=false;
 if(!user){el('message').textContent='Sign in to view your personal records.';return}
 if(!user.emailVerified){el('message').textContent='Please verify your membership email before viewing records.';return}
 el('message').textContent='Loading your records…';
 try{
  // Server resolves one verified membership and approved historical aliases only.
  const {getApp}=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),fm=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js'),functions=fm.getFunctions(getApp(),'us-central1');if(state.configSource==='local-emulator')fm.connectFunctionsEmulator(functions,'127.0.0.1',5001);
  const result=(await fm.httpsCallable(functions,'memberZelle')({action:'account'})).data;const members=[result.member],payments=result.payments,attendance=result.attendance;
   if(attendance.length){const replaced=new Set(attendance.map(r=>r.legacySourceId).filter(Boolean));attendance.splice(0,attendance.length,...attendance.filter(r=>!replaced.has(r.id)));const meetings=new Map();for(const row of attendance){const key=row.meetingId||((row.meetingDate||'')+'|'+(row.meetingName||''));const prior=meetings.get(key);if(!prior||String(row.updatedAt||'')>=String(prior.updatedAt||''))meetings.set(key,row)}attendance.splice(0,attendance.length,...meetings.values());const year=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric'}).format(new Date());members[0].attendanceCount=attendance.filter(r=>r.status==='Present'&&String(r.meetingDate||'').startsWith(year)).length;members[0].attendanceStatus=members[0].attendanceCount+' meeting(s) recorded in '+year; }
  if(version !== loadVersion || state.auth.currentUser?.uid!==user.uid || sample)return;
  if(members.length>1)throw new Error('Multiple membership records require review');
  render(members[0],payments,attendance,result.ledger);if(members.length===1){const holder=el('membershipCard'),cardVersion=loadVersion;const staging=document.createElement('div');ownCard(staging).then(()=>{if(loadVersion===cardVersion&&!sample&&state.auth.currentUser?.uid===user.uid)holder.replaceChildren(...staging.childNodes)})}el('message').textContent='Your records are loaded. This account is read-only.';
 }catch{if(sample || version !== loadVersion)return;clearAccount();el('message').textContent='Your records could not be loaded. Contact MPU to check your account access, or try refreshing.'}
}
el('preview').onclick=()=>{++loadVersion;sample=true;render(sampleMember,samplePayments.slice(),[{meetingDate:'2026-09-20',meetingName:'General meeting — sample',status:'Present'}]);el('message').textContent='Viewing fictional sample records.'};
el('closePreview').onclick=()=>{++loadVersion;sample=false;clearAccount();el('message').textContent='Sample preview closed.'};
el('refresh').onclick=load;
el('signOut').onclick=async()=>{++loadVersion;sample=false;clearAccount();try{await cloud.signOutUser();await load()}catch{el('message').textContent='Sign-out failed. Please try again.'}};
el('memberLogin').onsubmit=async event=>{
 event.preventDefault();el('sendLink').disabled=true;
 try{
  const state=cloud.state(),email=el('memberEmail').value.trim();
  if(!state.enabled)throw Error('Unavailable');
  await state.sdk.authMod.sendSignInLinkToEmail(state.auth,email,{url:location.origin+memberReturn,handleCodeInApp:true});
  localStorage.setItem('mpu_member_login_email',email);
  el('message').textContent='Sign-in link sent. Open the link in your email to view your account.';
 }catch{el('message').textContent='Could not send a sign-in link. Check your email address or contact MPU.'}
 finally{el('sendLink').disabled=!cloud?.state().enabled}
};
async function init(){
 try{
  await import('/assets/firebase-client.js?v=build10');cloud=window.MPUCloud;await cloud.ready();
  const state=cloud.state();
  if(state.enabled&&state.sdk.authMod.isSignInWithEmailLink(state.auth,location.href)){
   const email=localStorage.getItem('mpu_member_login_email')||'';
   if(!email){el('message').textContent='Enter the email that received this link, then select Complete sign-in.';el('sendLink').textContent='Complete sign-in';
    el('memberLogin').onsubmit=async event=>{event.preventDefault();try{await state.sdk.authMod.signInWithEmailLink(state.auth,el('memberEmail').value.trim(),location.href);history.replaceState(null,'',memberReturn);location.reload()}catch{el('message').textContent='Sign-in failed. Check the email address or request a new link from the account page.'}};return}
   await state.sdk.authMod.signInWithEmailLink(state.auth,email,location.href);localStorage.removeItem('mpu_member_login_email');history.replaceState(null,'',memberReturn);
  }
  await load();
 }catch{el('sendLink').disabled=true;el('message').textContent='Live member access is unavailable. You can still view the sample account.'}
}
init();

function renderLedger(ledger){const holder=el('ledgerBreakdown');holder.replaceChildren();const title=document.createElement('h2');title.textContent='Charges, payments and outstanding balance';holder.append(title);if(!ledger?.active){const p=document.createElement('p');p.textContent='Finance has not activated a reconciled ledger yet. Your dated balance snapshot remains displayed.';holder.append(p);return}const t=document.createElement('table');t.className='table';for(const values of [['Charge','Year','Due date','Expected after adjustments','Applied','Remaining'],...ledger.rows.map(r=>[r.name,r.year||'Opening',r.dueDate||'',money(r.netChargeCents/100),money(r.appliedCents/100),money(r.outstandingCents/100)])]){const row=document.createElement('tr');for(const value of values){const cell=document.createElement('td');cell.textContent=value;row.append(cell)}t.append(row)}const wrap=document.createElement('div');wrap.className='table-wrap';wrap.append(t);holder.append(wrap);if(ledger.issues.length){const p=document.createElement('p');p.textContent='Needs review: '+ledger.issues.join('; ');holder.append(p)}}

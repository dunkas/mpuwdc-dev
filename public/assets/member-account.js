const sourceArea=new URLSearchParams(location.search).get('from');const memberReturn='/member-account/'+(['education','finance','admin'].includes(sourceArea)?'?from='+sourceArea:'');
const el = id => document.getElementById(id);
const money = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
  ? new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(Number(value)) : 'Not available';
let cloud, sample = false, loadVersion = 0;
const sampleMember = {fullName:'Sample Member', amountOwed:75, membershipStatus:'Active', financialStatus:'Balance due — sample', attendanceCount:1, attendanceStatus:'1 meeting recorded — sample', lga:'Ahiazu Mbaise'};
const samplePayments = [{paymentDate:'2026-09-15',paymentType:'Annual Dues',paymentMethod:'Zelle',amount:50,verificationStatus:'Verified'}, {paymentDate:'2026-10-01',paymentType:'Levy',paymentMethod:'Zelle',amount:25,verificationStatus:'Pending'}];
function clearAccount(){ el('account').hidden=true; el('history').replaceChildren(); el('attendanceHistory').replaceChildren(); el('memberLga').textContent=''; el('memberName').textContent='Member account'; ['balance','membership','attendance','financialStatus','attendanceStatus'].forEach(id=>el(id).textContent=''); }
function render(member, payments, attendance = []){
 el('account').hidden=false; el('sampleNotice').hidden=!sample; el('refresh').hidden=sample;
 el('memberName').textContent=member?.fullName || 'Your member account';
 el('recordNote').textContent=sample?'Fictional preview • No official records changed':member?'Records supplied by MPU. Contact Finance if they need updating.':'No membership record was found for your signed-in email. Contact the membership team.';
 el('balance').textContent=money(member?.amountOwed);
 el('memberLga').textContent=member?.lga ? `LGA: ${member.lga}` : 'LGA not supplied';
 el('membership').textContent=member?.membershipStatus || 'Not available';
 el('financialStatus').textContent=(member?.financialStatus || 'Financial standing has not been supplied.') + (member?.creditBalance > 0 ? ` · Credit on account: ${money(member.creditBalance)}` : '');
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
  const {collection,query,where,getDocs}=state.sdk.fsMod;
  // Always constrain reads to the authenticated email. Never fetch whole collections.
  const own=async name=>{const snapshot=await getDocs(query(collection(state.db,name),where('email','==',user.email)));return snapshot.docs.map(d=>d.data())};
  const [members,payments,attendance]=await Promise.all([own('members'),own('payments'),own('attendance')]);
  if(version !== loadVersion || state.auth.currentUser?.uid!==user.uid || sample)return;
  if(members.length>1)throw new Error('Multiple membership records require review');
  render(members[0],payments,attendance);el('message').textContent='Your records are loaded. This account is read-only.';
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

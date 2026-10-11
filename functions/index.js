const {onSchedule}=require('firebase-functions/v2/scheduler');
const {initializeApp}=require('firebase-admin/app');
const {getFirestore,FieldValue}=require('firebase-admin/firestore');
initializeApp();
const db=getFirestore();

function monthsBetween(a,b){const d1=new Date(a),d2=new Date(b);if(isNaN(d1)||isNaN(d2))return null;let m=(d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());if(d2.getDate()<d1.getDate())m--;return Math.max(0,m)}
function addMonths(v,n){const d=new Date(v);if(isNaN(d))return null;d.setMonth(d.getMonth()+n);return d.toISOString().slice(0,10)}
function monthKey(d=new Date()){return d.toISOString().slice(0,7)}

exports.financeComplianceDaily=onSchedule({schedule:'every day 08:00',timeZone:'America/New_York',retryCount:1},async()=>{
  const now=new Date();
  const cfgSnap=await db.doc('financeConfig/main').get();
  const cfg=cfgSnap.exists?cfgSnap.data():{};
  const warningMonths=Number(cfg.warningMonths||5), suspensionMonths=Number(cfg.suspensionMonths||6);
  const membersSnap=await db.collection('members').get();
  const usersSnap=await db.collection('users').where('role','in',['finance','chairman']).get();
  const oversightEmails=[...new Set(usersSnap.docs.map(d=>String(d.data().email||'').trim()).filter(Boolean))];
  const writes=[];
  for(const doc of membersSnap.docs){
    const m=doc.data(); const last=m.lastQualifyingPaymentDate||m.lastPaymentDate||m.memberSince;
    if(!last) continue;
    const months=monthsBetween(last,now); if(months===null||months<warningMonths) continue;
    const stage=months>=suspensionMonths?'Suspension Review':'5-Month Warning';
    const key=`finance-${doc.id}-${stage.replace(/\s+/g,'-').toLowerCase()}-${monthKey(now)}`;
    const ref=db.doc(`notificationsQueue/${key}`); if((await ref.get()).exists) continue;
    const projected=addMonths(last,suspensionMonths);
    const message=stage==='5-Month Warning'
      ?`Your MPU financial record shows five months without a qualifying payment. Please contact the Financial Secretary before the six-month threshold.`
      :`Your MPU financial record has reached the six-month non-payment threshold and has been placed on the authorized suspension-review list. Please contact the Financial Secretary.`;
    writes.push(ref.set({type:'Finance Compliance',memberId:doc.id,memberName:m.fullName||'',toEmail:m.email||'',stage,monthsUnpaid:months,projectedSuspensionDate:projected,status:'Queued',ccRoles:['finance','chairman'],message,createdAt:FieldValue.serverTimestamp(),source:'Scheduled finance compliance check'}));
    if(m.email){
      writes.push(db.doc(`mail/${key}`).set({to:[m.email],cc:oversightEmails,message:{subject:stage==='5-Month Warning'?'MPU Payment Warning — 5 Months':'MPU Financial Status — Suspension Review',html:`<p>Dear ${m.fullName||'Member'},</p><p>${message}</p><p><strong>Projected suspension-review date:</strong> ${projected||'Please contact Finance'}</p><p>MPU Financial Secretary / Chairman</p>`},createdAt:FieldValue.serverTimestamp()}));
    }
    writes.push(doc.ref.set({financeComplianceStatus:stage,monthsUnpaid:months,projectedSuspensionDate:projected,financeComplianceCheckedAt:FieldValue.serverTimestamp()},{merge:true}));
  }
  await Promise.all(writes); return null;
});

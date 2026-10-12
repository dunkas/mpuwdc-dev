'use strict';
const V=require('./finance-validation'),P=require('./finance-policy'),S=require('./finance-session'),calc=require('./voter-register');
async function report(db,actor,data,now=new Date()){
 if(!actor.emailVerified||!actor.passwordSession)V.fail('Unlock finance with your approved account password.','unauthenticated');const role=await S.roleFor(db,actor);if(!['chairman','admin','finance'].includes(role))V.fail('Full finance access required.','permission-denied');const asOf=V.date(data.asOf,now);
 const [members,canonical,classic,meetingDocs,paymentDocs]=await Promise.all(['members','attendanceEntries','attendance','meetings','payments'].map(n=>db.collection(n).get()));const meetings=meetingDocs.docs.map(d=>({...d.data(),id:d.id})),entries=[...canonical.docs.map(d=>({...d.data(),id:d.id})),...classic.docs.map(d=>({...d.data(),id:d.id,date:d.data().meetingDate,meeting:d.data().meetingName,__classic:true}))];
 const memberMap=new Map(members.docs.map(d=>[d.id,d.data()]));return {asOf,year:Number(asOf.slice(0,4)),generatedAt:now.toISOString(),status:'Draft — EC verification required',rows:members.docs.map(d=>{const ids=new Set([d.id,...(d.data().linkedMemberIds||[]).filter(id=>memberMap.get(id)?.mergedInto===d.id)]);return calc.calculate({...d.data(),id:d.id},entries.map(e=>ids.has(e.memberId)?{...e,memberId:d.id}:e),meetings,asOf,paymentDocs.docs.map(p=>({...p.data(),id:p.id,memberId:ids.has(p.data().memberId)?d.id:p.data().memberId})))})};
}
module.exports={report};

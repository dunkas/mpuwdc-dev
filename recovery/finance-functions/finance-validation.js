'use strict';
const {validDate,nyDate}=require('./finance-policy');
class FinanceError extends Error{constructor(code,message){super(message);this.code=code}}
const fail=(message,code='invalid-argument')=>{throw new FinanceError(code,message)};
function text(v,max=500,required=false){if(typeof v!=='string')v='';v=v.trim();if(required&&!v)fail('A required field is missing.');if(v.length>max)fail('A field is too long.');return v}
function id(v){const s=text(v,120,true);if(!/^[A-Za-z0-9_-]+$/.test(s))fail('Invalid record identifier.');return s}
function cents(v){const n=Number(v);if(!Number.isFinite(n)||n<=0||n>1000000||Math.abs(n*100-Math.round(n*100))>0.000001)fail('Enter a positive amount with no more than two decimal places.');return Math.round(n*100)}
function date(v,now=new Date()){if(!validDate(v)||v>nyDate(now))fail('Use a valid date that is not in the future.');return v}
function paymentInput(d,now=new Date()){
 const method=text(d.paymentMethod,20,true);if(!['Cash','Check','Zelle'].includes(method))fail('Choose Cash, Check or Zelle.');
 const allocations=d.allocations;if(!Array.isArray(allocations)||!allocations.length||allocations.length>20)fail('Select at least one payment type.');
 const items=allocations.map(a=>({typeId:id(a.typeId),amountCents:cents(a.amount)}));
 if(new Set(items.map(a=>a.typeId)).size!==items.length)fail('Combine allocations for the same payment type.');
 const amountCents=items.reduce((n,a)=>n+a.amountCents,0);if(amountCents>100000000)fail('Total exceeds the supported amount.');
 const checkNumber=text(d.checkNumber,100),referenceNumber=text(d.referenceNumber,200);
 if(method==='Check'&&!checkNumber)fail('Enter the check number.');if(method==='Zelle'&&!referenceNumber)fail('Enter the Zelle confirmation reference.');
 return {memberId:id(d.memberId),paymentMethod:method,paymentDate:date(d.paymentDate,now),amountCents,amount:amountCents/100,allocations:items,checkNumber,referenceNumber,zelleSenderName:text(d.zelleSenderName,120),notes:text(d.notes,2000),replacesReceipt:d.replacesReceipt?id(d.replacesReceipt):''};
}
function initialStatus(method){return method==='Cash'?'Recorded':method==='Check'?'Pending clearance':'Pending verification'}
function confirmed(p){return !p.voidedAt&&['Recorded','Verified','Cleared'].includes(p.status||p.verificationStatus)}
function paymentTransition(p,next){const status=p.status||p.verificationStatus;if(p.voidedAt)fail('A voided payment cannot be changed.','failed-precondition');const allowed=p.paymentMethod==='Check'?{'Pending clearance':['Cleared','Bounced / returned'],Pending:['Cleared','Bounced / returned'],Verified:['Bounced / returned'],Cleared:['Bounced / returned']}:p.paymentMethod==='Zelle'?{'Pending verification':['Verified','Rejected'],Pending:['Verified','Rejected'],Verified:['Rejected']}:{Recorded:['Voided'],Verified:['Voided']};if(!(allowed[status]||[]).includes(next))fail('This status change is not allowed.','failed-precondition');return next}
function editableType(t,now){const ms=t.createdAt?.toMillis?t.createdAt.toMillis():Date.parse(t.createdAt);const unlock=t.unlockUntil?.toMillis?t.unlockUntil.toMillis():Date.parse(t.unlockUntil);return !t.voidedAt&&(now-ms<600000||unlock>now)}
module.exports={FinanceError,fail,text,id,cents,date,paymentInput,initialStatus,confirmed,paymentTransition,editableType};

'use strict';
const DAY=86400000;
function validDate(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(new Date(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v}
function addDays(v,n){const d=new Date(v+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}
function addMonths(v,n){const d=new Date(v+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));return d.toISOString().slice(0,10)}
function thirdSundayNovember(year){const d=new Date(Date.UTC(year,10,1,12));d.setUTCDate(1+(7-d.getUTCDay())%7+14);return d.toISOString().slice(0,10)}
function nyDate(now=new Date()){const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>p.find(x=>x.type===k).value).join('-')}
function duesState(m,today,cfg={}){
 const warning=Number(cfg.warningMonths??5),suspend=Number(cfg.suspensionMonths??6),repeat=Number(cfg.repeatDays??7);
 if(!Number.isInteger(warning)||warning<1||!Number.isInteger(suspend)||suspend<=warning||!Number.isInteger(repeat)||repeat<1)throw Error('Invalid finance compliance policy');
 // Registration and undated historical balances are not evidence of a dues payment.
 const last=m.lastQualifyingPaymentDate;
 if(!validDate(last)||last>today)return {status:m.financeStatusOverride&&(!m.financeOverrideUntil||m.financeOverrideUntil>=today)?m.financeStatusOverride:'Needs review',reminderDue:false};
 const warningDate=addMonths(last,warning),suspensionDate=addMonths(last,suspend);
 const status=today>=suspensionDate?'Suspended':today>=warningDate?'Approaching suspension':'Current';
 const activeOverride=m.financeStatusOverride&&(!m.financeOverrideUntil||m.financeOverrideUntil>=today);
 const contact=validDate(m.lastFinanceContactDate)&&m.lastFinanceContactDate>=warningDate&&m.lastFinanceContactDate<=today?m.lastFinanceContactDate:null;
 const baseline=contact?addDays(contact,repeat):warningDate;
 const slot=Math.max(0,Math.floor((new Date(today+'T12:00:00Z')-new Date(baseline+'T12:00:00Z'))/DAY/repeat));
 return {status:activeOverride?m.financeStatusOverride:status,warningDate,suspensionDate,reminderDue:!activeOverride&&status==='Approaching suspension'&&today>=baseline,reminderKey:last+'|'+baseline+'|'+slot};
}
function duesMessage(m,s){return `Dear ${m.fullName||'Member'}, thank you for your support of MPU. Our records show that your dues are approaching the membership dues threshold on ${s.suspensionDate}. Please contact the Financial Secretary to arrange payment or let us know if a payment is missing from our records. We appreciate your continued participation.`}
function attendanceState(m,entries,today,cfg={}){
 const year=Number(cfg.attendanceYear||today.slice(0,4)),minimum=Number(cfg.attendanceMinimum??3);
 if(!Number.isInteger(year)||year<2000||!Number.isInteger(minimum)||minimum<1)throw Error('Invalid attendance policy');
 const finalDate=cfg.finalDateRule==='manual'&&validDate(cfg.finalMeetingDate)&&cfg.finalMeetingDate.startsWith(String(year))?cfg.finalMeetingDate:thirdSundayNovember(year);
 const records=entries.filter(a=>a.memberId===m.id&&validDate(a.date)&&a.date.startsWith(String(year))&&a.date<=today);
 const count=new Set(records.filter(a=>a.status==='Present').map(a=>a.date+'|'+a.meeting)).size;
 return {year,minimum,finalDate,count,known:records.length>0,reminderDue:records.length>0&&count===minimum-1&&today>=year+'-10-01'&&today<=finalDate};
}
function attendanceMessage(m,s){return `Dear ${m.fullName||'Member'}, thank you for being part of MPU. Our records show ${s.count} meetings attended in ${s.year}. We would be pleased to see you at the final quarterly meeting on ${s.finalDate}, so you can complete the ${s.minimum}-meeting attendance requirement. Please let the Secretary know if a meeting you attended is missing from our records. Thank you for your continued support.`}
module.exports={validDate,addDays,addMonths,thirdSundayNovember,nyDate,duesState,duesMessage,attendanceState,attendanceMessage};

/** MPU Payment Verification Bridge (transition backend)
 * Deploy as Apps Script Web App: execute as Me, access Anyone.
 * The public portal submits payment details here; Finance verifies against Zelle.
 * setupPaymentSystem() creates the Sheet and installable edit trigger.
 */
const PAYMENT_SHEET_NAME = 'MPU_2026_Payment_Verification';
const TAB = 'PAYMENTS';
const HEADERS = ['ID','Submitted At','Member Name','Email','Phone','Amount','Payment Type','Payment Date','Zelle Sender Name','Reference','Status','Verified By','Verified At','Notes','Email Sent'];

function setupPaymentSystem(){
  const ss=SpreadsheetApp.create(PAYMENT_SHEET_NAME);
  const sh=ss.getSheets()[0]; sh.setName(TAB); sh.getRange(1,1,1,HEADERS.length).setValues([HEADERS]); sh.setFrozenRows(1);
  sh.getRange('K2:K').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['Pending','Verified','Needs Review','Rejected'],true).build());
  ScriptApp.newTrigger('paymentStatusEdited').forSpreadsheet(ss).onEdit().create();
  PropertiesService.getScriptProperties().setProperty('PAYMENT_SHEET_ID',ss.getId());
  Logger.log(ss.getUrl()); return ss.getUrl();
}
function getSheet_(){
  const id=PropertiesService.getScriptProperties().getProperty('PAYMENT_SHEET_ID');
  if(!id) throw new Error('Run setupPaymentSystem() first.');
  return SpreadsheetApp.openById(id).getSheetByName(TAB);
}
function doGet(){return ContentService.createTextOutput(JSON.stringify({ok:true,service:'MPU Payment Verification'})).setMimeType(ContentService.MimeType.JSON);}
function doPost(e){
  try{
    const p=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(p.action!=='submitPayment') throw new Error('Unsupported action');
    ['name','email','phone','amount','type','date','sender'].forEach(k=>{if(!String(p[k]||'').trim()) throw new Error('Missing '+k)});
    const id='PAY-'+Utilities.getUuid().slice(0,8).toUpperCase(); const now=new Date();
    getSheet_().appendRow([id,now,p.name,p.email,p.phone,Number(p.amount),p.type,p.date,p.sender,p.reference||'', 'Pending','','',p.note||'','']);
    MailApp.sendEmail({to:p.email,subject:'MPU Payment Submission Received — '+id,htmlBody:`<p>Dear ${safe_(p.name)},</p><p>We received your MPU payment submission for <b>$${Number(p.amount).toFixed(2)}</b> (${safe_(p.type)}).</p><p>Status: <b>Pending Verification</b>.</p><p>Your reference is <b>${id}</b>. You will receive another email after an authorized Finance Verifier confirms the corresponding Zelle transaction.</p><p>MPU Electoral Committee</p>`});
    return json_({ok:true,id,status:'Pending'});
  }catch(err){return json_({ok:false,error:String(err.message||err)});}
}
function paymentStatusEdited(e){
  const r=e.range, sh=r.getSheet(); if(sh.getName()!==TAB || r.getRow()===1 || r.getColumn()!==11) return;
  const status=String(r.getValue()); if(status!=='Verified') return;
  const row=sh.getRange(r.getRow(),1,1,HEADERS.length).getValues()[0];
  if(row[14]==='VERIFIED_EMAIL_SENT') return;
  const email=row[3], name=row[2], amount=Number(row[5]), type=row[6], id=row[0];
  sh.getRange(r.getRow(),13).setValue(new Date());
  if(!sh.getRange(r.getRow(),12).getValue()) sh.getRange(r.getRow(),12).setValue(Session.getActiveUser().getEmail()||'Finance Verifier');
  MailApp.sendEmail({to:email,subject:'MPU Payment Verified — '+id,htmlBody:`<p>Dear ${safe_(name)},</p><p>Your MPU payment of <b>$${amount.toFixed(2)}</b> (${safe_(type)}) has been <b>verified and recorded</b>.</p><p>Reference: <b>${id}</b></p><p>Thank you.<br>MPU</p>`});
  sh.getRange(r.getRow(),15).setValue('VERIFIED_EMAIL_SENT');
}
function json_(o){return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON)}
function safe_(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

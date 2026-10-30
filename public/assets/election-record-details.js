export const decisions=['Under Screening','Clarification Required','Provisionally Qualified','Provisionally Not Qualified','Final Qualified','Final Not Qualified'];
export function dateLabel(value){
 if(!value)return 'Not recorded';
 const date=value.toDate?value.toDate():value.seconds!==undefined?new Date(value.seconds*1000):typeof value==='string'?new Date(value):null;
 return date&&!isNaN(date)?date.toLocaleString('en-US',{timeZone:'America/New_York'})+' ET':'Not recorded';
}
export function activity(parent,r={}){
 parent.replaceChildren();
 for(const [label,value]of [['Added by',r.createdByEmail||r.CREATED_BY||'Not recorded'],['Date added',dateLabel(r.createdAt)],['Last updated by',r.updatedBy||'Not recorded'],['Last updated',dateLabel(r.updatedAt)]]){
  const p=document.createElement('p');p.textContent=label+': '+value;parent.append(p);
 }
}
export function decisionOptions(parent,current=''){
 parent.replaceChildren();const legend=document.createElement('legend');legend.textContent='EC screening decision';parent.append(legend);
 for(const value of ['',...decisions,...(current&&!decisions.includes(current)?[current]:[])]){
  const label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:10px;min-height:44px';
  const input=document.createElement('input');input.type='radio';input.name='screeningDecision';input.value=value;input.checked=value===current;input.style.width='auto';
  label.append(input,document.createTextNode(value||'Not recorded / no decision'));parent.append(label);
 }
}
let rpc;
export async function electionSave(data){
 if(!rpc){const a=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),f=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js');rpc=f.httpsCallable(f.getFunctions(a.getApp(),'us-central1'),'electionCommand',{timeout:45000});}
 return (await rpc(data)).data;
}

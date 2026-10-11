(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v??'').trim();
  const low=v=>norm(v).toLowerCase();
  function isoDate(v){
    if(!v) return '';
    if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
    const s=String(v).trim();
    if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
    const d=new Date(s); return isNaN(d)?s:d.toISOString().slice(0,10);
  }
  function monthsBetween(a,b){
    const d1=new Date(a),d2=new Date(b); if(isNaN(d1)||isNaN(d2)) return null;
    let m=(d2.getFullYear()-d1.getFullYear())*12+(d2.getMonth()-d1.getMonth());
    if(d2.getDate()<d1.getDate()) m--; return Math.max(0,m);
  }
  function addMonths(date,months){ const d=new Date(date); if(isNaN(d)) return null; const x=new Date(d); x.setMonth(x.getMonth()+months); return x; }
  function money(v){ const n=Number(v||0); return Number.isFinite(n)?n:0; }
  function csv(rows,columns){
    const cols=columns?.length?columns:Object.keys(rows[0]||{});
    const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
    return [cols.map(q).join(','),...rows.map(r=>cols.map(c=>q(r[c])).join(','))].join('\r\n');
  }
  function download(name,blob,type='text/plain;charset=utf-8'){
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([blob],{type})); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),500);
  }
  function exportCSV(rows,name,columns){ download(name+'.csv',csv(rows,columns),'text/csv;charset=utf-8'); }
  function exportExcel(rows,name){
    if(window.XLSX){ const ws=XLSX.utils.json_to_sheet(rows); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Report'); XLSX.writeFile(wb,name+'.xlsx'); return true; }
    exportCSV(rows,name); return false;
  }
  function exportPDF(rows,name,title,columns){
    const cols=columns?.length?columns:Object.keys(rows[0]||{});
    if(window.jspdf?.jsPDF){
      const doc=new window.jspdf.jsPDF({orientation:cols.length>7?'landscape':'portrait'});
      doc.setFontSize(15); doc.text(title||name,14,16);
      doc.setFontSize(8); doc.text('Generated: '+new Date().toLocaleString(),14,22);
      if(typeof doc.autoTable==='function') doc.autoTable({startY:27,head:[cols],body:rows.map(r=>cols.map(c=>String(r[c]??''))),styles:{fontSize:7,cellPadding:1.8},headStyles:{fillColor:[10,53,96]}});
      doc.save(name+'.pdf'); return true;
    }
    const w=window.open('','_blank'); if(!w) return false;
    w.document.write(`<html><head><title>${esc(title||name)}</title><style>body{font-family:Arial;margin:24px}table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #bbb;padding:5px;text-align:left}th{background:#0a3560;color:#fff}h1{font-size:18px}</style></head><body><h1>${esc(title||name)}</h1><p>Generated: ${esc(new Date().toLocaleString())}</p><table><thead><tr>${cols.map(c=>`<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td>${esc(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table><script>setTimeout(()=>window.print(),300)<\/script></body></html>`); w.document.close(); return true;
  }
  function canonicalPayment(row={}){
    return {
      id: row.id||row.paymentId||'', memberId:row.memberId||'', memberName:row.memberName||row.name||row.fullName||'',
      email:low(row.email||row.memberEmail), phone:norm(row.phone), amount:money(row.amount),
      paymentMethod:norm(row.paymentMethod||row.method||'Zelle'), paymentType:norm(row.paymentType||row.category||'Annual Dues'),
      paymentDate:isoDate(row.paymentDate||row.date), referenceNumber:norm(row.referenceNumber||row.reference||row.confirmation),
      checkNumber:norm(row.checkNumber), cashReceivedBy:norm(row.cashReceivedBy), zelleSenderName:norm(row.zelleSenderName||row.senderName),
      qualifiesForGoodStanding: row.qualifiesForGoodStanding===true || String(row.qualifiesForGoodStanding||'').toLowerCase()==='true', verificationStatus:norm(row.verificationStatus||row.status||'Pending'), verifiedBy:norm(row.verifiedBy), verifiedAt:norm(row.verifiedAt), notes:norm(row.notes), importBatchId:norm(row.importBatchId)
    };
  }
  function canonicalMember(row={}){
    return {
      id:row.id||row.memberId||'', memberId:row.memberId||row.id||'', fullName:norm(row.fullName||row.name||row.memberName),
      email:low(row.email), phone:norm(row.phone), lga:norm(row.lga||row.LGA), memberSince:isoDate(row.memberSince||row.membershipDate),
      membershipStatus:norm(row.membershipStatus||row.status||'Active'), attendanceStatus:norm(row.attendanceStatus||row.attendance),
      attendanceCount:Number(row.attendanceCount||0)||0, financialStatus:norm(row.financialStatus), eligibilityStatus:norm(row.eligibilityStatus),
      lastQualifyingPaymentDate:isoDate(row.lastQualifyingPaymentDate||row.lastPaymentDate), amountOwed:money(row.amountOwed||row.balance),
      notes:norm(row.notes), importBatchId:norm(row.importBatchId)
    };
  }
  function suspensionStatus(member,asOf=new Date(),warningMonths=5,suspensionMonths=6){
    const last=member.lastQualifyingPaymentDate||member.lastPaymentDate||member.memberSince;
    if(!last) return {monthsUnpaid:null,status:'Needs Review',reason:'No qualifying payment date',projectedSuspensionDate:''};
    const months=monthsBetween(last,asOf); const projected=addMonths(last,suspensionMonths);
    if(months===null) return {monthsUnpaid:null,status:'Needs Review',reason:'Invalid payment date',projectedSuspensionDate:''};
    if(months>=suspensionMonths) return {monthsUnpaid:months,status:'Suspension Review',reason:`${months}+ months without qualifying payment`,projectedSuspensionDate:isoDate(projected)};
    if(months>=warningMonths) return {monthsUnpaid:months,status:'5-Month Warning',reason:'Approaching suspension threshold',projectedSuspensionDate:isoDate(projected)};
    if(months===warningMonths-1) return {monthsUnpaid:months,status:'Watch',reason:'Approaching 5-month warning',projectedSuspensionDate:isoDate(projected)};
    return {monthsUnpaid:months,status:'Current',reason:'Within payment window',projectedSuspensionDate:isoDate(projected)};
  }
  window.MPUDataTools={esc,norm,low,isoDate,monthsBetween,money,csv,download,exportCSV,exportExcel,exportPDF,canonicalPayment,canonicalMember,suspensionStatus};
})();

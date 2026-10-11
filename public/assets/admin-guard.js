import '/assets/firebase-client.js?v=build10';
const allowed=(document.body.dataset.allowedRoles||'chairman,admin').split(',').map(x=>x.trim()).filter(Boolean);
window.addEventListener('mpu-cloud-ready',async()=>{
  await MPUCloud.ready();
  const st=MPUCloud.state();
  if(st.enabled && st.user){ try{ await MPUCloud.ensureUserProfile(); }catch(e){ console.warn('Profile check failed',e); } }
  const r=MPUCloud.role();
  if(r==='pending'){ location.replace('/admin/pending/'); return; }
  const result=await MPUCloud.requireRole(allowed);
  if(!result.ok)return;
  MPUCloud.applyRoleVisibility();
  document.querySelectorAll('[data-role-label]').forEach(el=>el.textContent=MPUCloud.role()||'authorized');
  document.querySelectorAll('[data-cloud-status]').forEach(el=>el.textContent=MPUCloud.state().enabled?'Firebase connected':'DEV local preview');
});

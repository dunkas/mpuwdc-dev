
(function(){
  const EVENT_KEY='mpu_events';
  const SETTINGS_KEY='mpu_portal_settings';
  const REGISTER_KEY='mpu_register_records';
  const CORRECTIONS_KEY='mpu_register_corrections';

  const seedEvents=[
    {id:'edu-week',title:'Voter & Candidate Education Week',start:'2026-10-03',end:'2026-10-09',displayDate:'Oct 3–9, 2026',description:'Familiarize yourself with eligibility, nominations and voting procedures.',published:true,phaseType:'education',actionLabel:'Open Voter Education',actionUrl:'/voter-education/'},
    {id:'register-review',title:'Provisional Voter Register: Review & Correction Window',start:'2026-10-11',end:'2026-10-17',displayDate:'Oct 11–17, 2026',description:'Members review the provisional voter register and submit corrections before the review window closes.',published:true,phaseType:'register-review',actionLabel:'Check My Record',actionUrl:'/register-review/'},
    {id:'oct18',title:'Emergency In-Person Meeting, Eligibility Records Cutoff & Nomination Day',start:'2026-10-18T17:00',end:'2026-10-18T21:00',displayDate:'Sunday, Oct 18, 2026 • 5:00 PM',description:'Ekkonn Conference Center. Nomination forms are issued and submitted; election guidance, Q&A and eligibility confirmation.',published:true,phaseType:'meeting',actionLabel:'View Event Details',actionUrl:'/event-calendar/'},
    {id:'validation',title:'Record Updates, Eligibility Confirmation & Nomination Validation',start:'2026-10-19',end:'2026-10-25',displayDate:'Oct 19–25, 2026',description:'Records are updated, eligibility is confirmed, and nominations submitted on Oct 18 are reviewed and validated.',published:true,phaseType:'validation'},
    {id:'screening',title:'Candidate Screening by EC',start:'2026-10-26',end:'2026-10-28',displayDate:'Oct 26–28, 2026',description:'Candidate eligibility is reviewed using official records.',published:true,phaseType:'screening'},
    {id:'prov-candidates',title:'Publish Provisional Candidate List',start:'2026-10-31',displayDate:'Oct 31, 2026',description:'The provisional candidate list is published.',published:true,phaseType:'publication'},
    {id:'candidate-review',title:'Candidate List Review / Correction / Complaint Window',start:'2026-10-31',end:'2026-11-03',displayDate:'Oct 31–Nov 3, 2026',description:'Candidate list corrections and complaints are received and reviewed.',published:true,phaseType:'review'},
    {id:'withdrawal',title:'Regular Candidate Withdrawal Deadline',start:'2026-11-03T23:59',displayDate:'Nov 3, 2026 • 11:59 PM',description:'Regular candidate withdrawals close at 11:59 PM ET.',published:true,phaseType:'deadline'},
    {id:'final-lists',title:'Publish Final Voter Register & Final Candidate List',start:'2026-11-04',displayDate:'Nov 4, 2026',description:'Final voter and candidate lists are published.',published:true,phaseType:'publication'},
    {id:'campaign',title:'Official Campaign Period',start:'2026-11-05',end:'2026-11-14T23:59',displayDate:'Nov 5–14, 2026',description:'Official campaign period. Campaigning ends Nov 14 at 11:59 PM.',published:true,phaseType:'campaign'},
    {id:'campaign-end',title:'Campaign Ends — No Campaigning on Election Day',start:'2026-11-14T23:59',displayDate:'Nov 14, 2026 • 11:59 PM',description:'Campaigning ends at 11:59 PM. No campaigning on Election Day.',published:true,phaseType:'deadline'},
    {id:'election',title:'MPU 2026 General Election Meeting',start:'2026-11-15',displayDate:'Sunday, Nov 15, 2026',description:'Accreditation, secret paper-ballot voting, counting, reconciliation and declaration of results.',published:true,phaseType:'election'}
  ];

  const defaultSettings={
    importantNow:{enabled:true,severity:'important',headline:'Register Review: Check Your Record Early',body:'The provisional voter-register review window is Oct 11–17. Review your record early so any discrepancy can be verified and corrected before the window closes.',bullets:['Use Check My Record to review your provisional information','Report any discrepancy as soon as possible','Contact the Electoral Committee if you need help'],start:'2026-10-08',end:'2026-10-17'},
    contact:{label:'Need help?',email:'',phone:'',whatsapp:'',hours:'',show:true},
    homepage:{showPayment:true,showEducation:true,showIncident:true},
    registerReview:{enabled:true,lookupLabel:'Registered Email',correctionDeadline:'2026-10-17T23:59'}
  };

  const seedRegister=[
    {email:'test.member@mpu.dev',fullName:'Test Member',lga:'Ahiazu Mbaise',memberSince:'2024-03-01',membershipStatus:'Active',attendanceStatus:'Meets review threshold',financialStatus:'Verified / Good Standing',reviewStatus:'Provisional — Review Open'},
    {email:'sample.voter@mpu.dev',fullName:'Sample Voter',lga:'Aboh Mbaise',memberSince:'2023-08-15',membershipStatus:'Active',attendanceStatus:'Needs Review',financialStatus:'Pending Verification',reviewStatus:'Provisional — Action Needed'}
  ];

  function read(k,fallback){try{const v=localStorage.getItem(k);return v?JSON.parse(v):fallback}catch(e){return fallback}}
  function write(k,v){localStorage.setItem(k,JSON.stringify(v));return v}
  function ensure(){if(!localStorage.getItem(EVENT_KEY))write(EVENT_KEY,seedEvents);if(!localStorage.getItem(SETTINGS_KEY))write(SETTINGS_KEY,defaultSettings);if(!localStorage.getItem(REGISTER_KEY))write(REGISTER_KEY,seedRegister);if(!localStorage.getItem(CORRECTIONS_KEY))write(CORRECTIONS_KEY,[])}
  function parseDate(v,endOfDay=false){if(!v)return null; if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d,endOfDay?23:0,endOfDay?59:0,endOfDay?59:0)} return new Date(v)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function getEvents(){ensure();return read(EVENT_KEY,seedEvents)}
  function saveEvents(v){return write(EVENT_KEY,v)}
  function publishedEvents(){return getEvents().filter(x=>x.published!==false).sort((a,b)=>parseDate(a.start)-parseDate(b.start))}
  function getPhase(now=new Date()){
    const a=publishedEvents();
    const active=a.filter(x=>{const s=parseDate(x.start),e=x.end?parseDate(x.end,true):parseDate(x.start,true);return s<=now&&e>=now}).sort((x,y)=>parseDate(y.start)-parseDate(x.start));
    const current=active[0]||a.find(x=>parseDate(x.start)>=now)||a[a.length-1]||null;
    const idx=current?a.findIndex(x=>x.id===current.id):-1;
    const next=idx>=0?a[idx+1]||null:null;
    const upcoming=idx>=0?a[idx+2]||null:null;
    return {current,next,upcoming};
  }
  function daysLeft(event,now=new Date()){
    if(!event)return 0;const end=event.end?parseDate(event.end,true):parseDate(event.start,true);return Math.max(0,Math.ceil((end-now)/86400000));
  }
  function getSettings(){ensure();return read(SETTINGS_KEY,defaultSettings)}
  function saveSettings(v){return write(SETTINGS_KEY,v)}
  function getImportant(now=new Date()){
    const n=getSettings().importantNow||{};if(n.enabled===false)return null;const s=n.start?parseDate(n.start):null,e=n.end?parseDate(n.end,true):null;if(s&&now<s)return null;if(e&&now>e)return null;return n;
  }
  function getRegister(){ensure();return read(REGISTER_KEY,seedRegister)}
  function saveRegister(v){return write(REGISTER_KEY,v)}
  function findMember(email){return getRegister().find(x=>String(x.email).toLowerCase()===String(email).trim().toLowerCase())||null}
  function getCorrections(){ensure();return read(CORRECTIONS_KEY,[])}
  function saveCorrections(v){return write(CORRECTIONS_KEY,v)}
  function submitCorrection(d){const a=getCorrections();const item={id:'RC-'+Date.now(),createdAt:new Date().toISOString(),status:'New',...d};a.unshift(item);saveCorrections(a);return item}
  function updateCorrection(id,patch){const a=getCorrections();const i=a.findIndex(x=>x.id===id);if(i>=0){a[i]={...a[i],...patch,updatedAt:new Date().toISOString()};saveCorrections(a);return a[i]}return null}
  ensure();
  window.MPURuntime={seedEvents,defaultSettings,seedRegister,getEvents,saveEvents,publishedEvents,getPhase,daysLeft,getSettings,saveSettings,getImportant,getRegister,saveRegister,findMember,getCorrections,saveCorrections,submitCorrection,updateCorrection,parseDate,esc};
})();

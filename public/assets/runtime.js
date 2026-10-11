
(function(){
  const EVENT_KEY='mpu_events';
  const SETTINGS_KEY='mpu_portal_settings';
  const REGISTER_KEY='mpu_register_records';
  const CORRECTIONS_KEY='mpu_register_corrections';

  const previousSeedEvents=[
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
  const seedEvents=[
  {
    "id": "official-v2-1",
    "title": "EC Constituted & Activated - COMPLETED",
    "start": "2026-09-30",
    "displayDate": "Sept. 30 (Wed), 2026",
    "description": "The Electoral Committee was formally constituted. Ad hoc election work begins. No swearing-in is required for an ad hoc committee.",
    "published": true,
    "phaseType": "general",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-2",
    "title": "Adopt & Publish Election Guidelines",
    "start": "2026-10-01",
    "displayDate": "Oct. 1-2 (Thu-Fri), 2026",
    "description": "EC finalizes, adopts, and publishes election procedures. Voting must be by secret ballot, and the guidelines must remain consistent with the Constitution.",
    "published": true,
    "phaseType": "publication",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-10-02"
  },
  {
    "id": "official-v2-3",
    "title": "Voter & Candidate Education Week",
    "start": "2026-10-03",
    "displayDate": "Oct. 3-9, 2026",
    "description": "Explain who may vote, who may contest, attendance and financial requirements, nomination procedures, secret ballot, no-proxy voting, and Election Day expectations.",
    "published": true,
    "phaseType": "education",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-10-09",
    "actionLabel": "Open Voter Education",
    "actionUrl": "/voter-education/"
  },
  {
    "id": "official-v2-4",
    "title": "Publish Provisional Voter Register",
    "start": "2026-10-11",
    "displayDate": "Oct. 11 (Sun), 2026",
    "description": "Publish the preliminary list of members who appear eligible to vote based on official MPU membership, attendance, financial, and LGA records.",
    "published": true,
    "phaseType": "publication",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-5",
    "title": "Voter Register Review & Correction Window",
    "start": "2026-10-11",
    "displayDate": "Oct. 11-17, 2026",
    "description": "Members may report name, LGA, membership history, attendance, financial records, or other official-record discrepancies. Corrections must be supported by official MPU records.",
    "published": true,
    "phaseType": "register-review",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-10-17",
    "actionLabel": "Check My Record",
    "actionUrl": "/register-review/"
  },
  {
    "id": "official-v2-6",
    "title": "Official Eligibility Records Cutoff",
    "start": "2026-10-18",
    "displayDate": "Oct. 18 (Sun), 2026",
    "description": "Records supplied by the responsible MPU offices are frozen for election administration. The EC applies the constitutional eligibility requirements to those official records.",
    "published": true,
    "phaseType": "deadline",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-7",
    "title": "Nomination Period",
    "start": "2026-10-19",
    "displayDate": "Oct. 19-25, 2026",
    "description": "Nomination forms are issued and submitted. Only constitutionally eligible active members may nominate or be nominated.",
    "published": true,
    "phaseType": "validation",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-10-25"
  },
  {
    "id": "official-v2-8",
    "title": "Candidate Screening by EC",
    "start": "2026-10-26",
    "displayDate": "Oct. 26-28 (Mon-Wed), 2026",
    "description": "EC reviews candidate eligibility using official records, including age, membership duration, attendance, financial standing, prior-office history, and applicable restrictions.",
    "published": true,
    "phaseType": "screening",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-10-28"
  },
  {
    "id": "official-v2-9",
    "title": "Publish Provisional Candidate List",
    "start": "2026-10-31",
    "displayDate": "Oct. 31 (Sat), 2026",
    "description": "Publish the preliminary list of candidates cleared through EC screening, subject to correction, clarification, and any constitutionally proper complaint.",
    "published": true,
    "phaseType": "publication",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-10",
    "title": "Candidate List Review / Correction / Complaint Window",
    "start": "2026-10-31",
    "displayDate": "Oct. 31-Nov. 3 (Sat-Tue), 2026",
    "description": "Candidates or members may submit documented administrative or record discrepancies to the EC for correction or clarification. Written grievances, misconduct allegations, or constitutional-violation petitions within Article V, Section 8 may be submitted to the BOD.",
    "published": true,
    "phaseType": "review",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-11-03"
  },
  {
    "id": "official-v2-11",
    "title": "Regular Candidate Withdrawal Deadline",
    "start": "2026-11-03T23:59:00-05:00",
    "displayDate": "Nov. 3 (Tue) - 11:59 PM, 2026",
    "description": "Candidates who voluntarily withdraw by this deadline will be removed before publication of the Final Candidate List. Withdrawal must be confirmed through the candidate email on record using a verification code. Late withdrawals may still be accepted and documented, but ballot or publication changes will depend on the stage of election preparation.",
    "published": true,
    "phaseType": "deadline",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-12",
    "title": "Publish Final Voter Register & Final Candidate List",
    "start": "2026-11-04",
    "displayDate": "Nov. 4 (Wed), 2026",
    "description": "These lists become the controlling election-administration records after the regular withdrawal deadline. No routine additions or changes will be accepted after publication, except correction of a documented administrative error, a properly recorded late withdrawal, or action required under the Constitution.",
    "published": true,
    "phaseType": "publication",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-13",
    "title": "Official Campaign Period",
    "start": "2026-11-05",
    "displayDate": "Nov. 5-14 (Thu-Sat), 2026",
    "description": "Only qualified candidates may campaign. Campaign conduct must comply with MPU rules and the published Electoral Committee guidelines.",
    "published": true,
    "phaseType": "campaign",
    "source": "Official Election Timetable FINAL v2",
    "end": "2026-11-14"
  },
  {
    "id": "official-v2-14",
    "title": "Candidate Manifesto Night / Forum / Infomercials",
    "start": "2026-11-08",
    "displayDate": "Nov. 8 (Sun), 2026",
    "description": "Candidates present their plans under the EC's published forum rules, speaking order, time limits, and neutrality requirements.",
    "published": true,
    "phaseType": "meeting",
    "source": "Official Election Timetable FINAL v2"
  },
  {
    "id": "official-v2-15",
    "title": "MPU 2026 General Election Meeting",
    "start": "2026-11-15",
    "displayDate": "Nov. 15 (Sun), 2026",
    "description": "Accreditation, secret-ballot voting, counting, reconciliation, and declaration of results. No proxy voting. Eligible members receive the ballot(s) for which they are entitled to vote.",
    "published": true,
    "phaseType": "election",
    "source": "Official Election Timetable FINAL v2"
  }
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

  function read(k,fallback){try{const v=localStorage.getItem(k);return v?JSON.parse(v):(memory.get(k)||fallback)}catch(e){return memory.get(k)||fallback}}
  const memory=new Map();
  function write(k,v){memory.set(k,v);try{localStorage.setItem(k,JSON.stringify(v))}catch{}return v}
  function ensure(){if(JSON.stringify(read(EVENT_KEY,null))===JSON.stringify(previousSeedEvents))write(EVENT_KEY,seedEvents);for(const [key,value] of [[EVENT_KEY,seedEvents],[SETTINGS_KEY,defaultSettings],[REGISTER_KEY,seedRegister],[CORRECTIONS_KEY,[]]])if(read(key,null)===null)write(key,value)}
  function parseDate(v,endOfDay=false){if(!v)return null; if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d,endOfDay?23:0,endOfDay?59:0,endOfDay?59:0)} return new Date(v)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function getEvents(){ensure();const events=read(EVENT_KEY,seedEvents);return Array.isArray(events)?events.filter(e=>e&&e.start):seedEvents}
  function saveEvents(v){return write(EVENT_KEY,v)}
  function publishedEvents(){return getEvents().filter(x=>x.published!==false).sort((a,b)=>parseDate(a.start)-parseDate(b.start))}
  function getPhase(now=new Date()){
    const a=publishedEvents().filter(e=>e.phaseType!=='membership-meeting');
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

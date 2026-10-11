// Real Firebase SDK + local Auth/Firestore emulators. Run rules.cjs to seed first.
const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {initializeTestEnvironment}=require('@firebase/rules-unit-testing');
const {doc,updateDoc}=require('firebase/firestore');
const base=process.env.MPU_TEST_URL||'http://127.0.0.1:5000';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage();
  // curl verifies TLS using the cloud machine's trust store. Chromium lacks the
  // cloud proxy CA, so deliver the unchanged, verified official SDK responses.
  await page.route('https://www.gstatic.com/firebasejs/10.14.1/**',route=>{
   const body=execFileSync('curl',['--fail','--silent','--show-error','--max-time','30',route.request().url()],{maxBuffer:8*1024*1024});
   return route.fulfill({contentType:'text/javascript',body});
  });
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  // Override only public configuration; use real production SDK and page code.
  await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:`window.MPU_CONFIG={environment:'dev',authDevBypass:false,emulators:true,firebase:{dev:{apiKey:'demo-api-key',projectId:'demo-mpu-members',appId:'demo-app',authDomain:'localhost'}}};`}));
  await page.goto(base+'/member-account/');
  await page.waitForFunction(()=>document.getElementById('message').textContent==='Sign in to view your personal records.',{timeout:30000});
  await page.locator('#memberEmail').fill('member.a@example.test');await page.locator('#sendLink').click();
  await page.waitForFunction(()=>document.getElementById('message').textContent.startsWith('Sign-in link sent'));
  const response=await page.request.get('http://127.0.0.1:9099/emulator/v1/projects/demo-mpu-members/oobCodes');assert.equal(response.status(),200);
  const data=await response.json();const code=data.oobCodes.filter(x=>x.email==='member.a@example.test').at(-1);assert(code);
  const link=new URL(base+'/member-account/');const original=new URL(code.oobLink);link.search=original.search;
  await page.goto(link.href);
  await page.waitForFunction(()=>document.getElementById('message').textContent.includes('records are loaded'),{timeout:30000});
  assert.equal(await page.locator('#memberName').innerText(),'Test Member A');assert.equal(await page.locator('#balance').innerText(),'$75.00');assert.equal(await page.locator('#memberLga').innerText(),'LGA: Ahiazu Mbaise');assert.equal(await page.locator('#attendanceHistory tr').count(),2);assert.equal(await page.locator('#history tr').count(),3);assert(!(await page.locator('#account').innerText()).includes('Test Member B'));
  console.log('PASS real email-link sign-in → own member, LGA, balance, attendance and Finance ledger');
  const env=await initializeTestEnvironment({projectId:'demo-mpu-members',firestore:{host:'127.0.0.1',port:8080}});
  try {
   const finance=env.authenticatedContext('test-finance',{email:'finance@example.test',email_verified:true}).firestore();
   await updateDoc(doc(finance,'members','test-member-a'),{amountOwed:50,financialStatus:'Balance due'});
   await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('balance').textContent==='$50.00');
   console.log('PASS Finance updates balance → member refresh shows updated record');
   await updateDoc(doc(finance,'members','test-member-a'),{amountOwed:75});
  } finally {await env.cleanup()}

  await page.locator('#signOut').click();await page.waitForFunction(()=>document.getElementById('message').textContent==='Sign in to view your personal records.');assert(await page.locator('#account').isHidden());assert.deepEqual(errors,[]);console.log('PASS real sign-out clears private account; no uncaught errors');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

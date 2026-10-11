const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const fixtures=require('./fixtures.cjs');
const base=process.env.MPU_TEST_URL||'http://127.0.0.1:5000';
(async()=>{
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try{
 let count=0;
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const source=`const fixtures=${JSON.stringify(fixtures)};
 let user={uid:'test-member-a',email:'member.a@example.test',emailVerified:true};
 const state={enabled:true,auth:{get currentUser(){return user}},db:{},sdk:{fsMod:{collection:(_,name)=>name,where:(key,op,value)=>({key,op,value}),query:(name,filter)=>({name,filter}),getDocs:async ({name,filter})=>{if(window.testFail)throw Error('Test unavailable');if(filter.op!=='=='||(name==='attendanceEntries'?filter.key!=='memberId'||filter.value!==Object.keys(fixtures.members).find(id=>fixtures.members[id].email===user.email):filter.key!=='email'||filter.value!==user.email))throw Error('Unscoped query');window.testQueries=(window.testQueries||[]).concat(name);return {docs:Object.entries(fixtures[name]||{}).filter(([id,x])=>name==='attendanceEntries'?x.memberId===filter.value:x.email===user.email).map(([id,x])=>({id,data:()=>x}))}}},authMod:{isSignInWithEmailLink:()=>false,sendSignInLinkToEmail:async (_,email,options)=>{window.sentLink={email,options}}}}};
 window.testChangeUser=email=>{user={uid:email,email,emailVerified:true}};
 window.MPUCloud={ready:async()=>{},state:()=>state,signOutUser:async()=>{user=null}};`;
 await page.route('**/assets/firebase-client.js*',route=>route.fulfill({contentType:'text/javascript',body:source}));
 await page.goto(base+'/');await page.getByRole('link',{name:'My Member Account',exact:false}).first().click();
 await page.waitForFunction(()=>document.getElementById('message')?.textContent.includes('records are loaded'));
 await page.getByText('Test Member A',{exact:true}).waitFor();
 assert.equal(await page.locator('#balance').innerText(),'$75.00');assert.equal(await page.locator('#attendance').innerText(),'2 meetings');assert.equal(await page.locator('#memberLga').innerText(),'LGA: Ahiazu Mbaise');assert.equal(await page.locator('#attendanceHistory tr').count(),2);assert.equal(await page.locator('#history tr').count(),2);assert(!(await page.locator('#account').innerText()).includes('Test Member B'));
 assert.deepEqual(await page.evaluate(()=>testQueries.sort()),['attendance','attendanceEntries','members','payments']);console.log('PASS own-account display, scoped reads, LGA, attendance, pending/verified history');count++;
 await page.locator('#memberEmail').fill('member.a@example.test');await page.locator('#sendLink').click();await page.waitForFunction(()=>window.sentLink);assert.equal(await page.evaluate(()=>sentLink.options.url),base+'/member-account/');console.log('PASS sign-in link returns to member account');count++;
 await page.evaluate(()=>testChangeUser('member.b@example.test'));await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('memberName').textContent==='Test Member B');assert.equal(await page.locator('#balance').innerText(),'$0.00');assert.equal(await page.locator('#history tr').count(),1);assert.equal(await page.locator('#attendanceHistory tr').count(),1);console.log('PASS second member has separate records and true zero balance');count++;
 await page.evaluate(()=>testChangeUser('missing@example.test'));await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('balance').textContent==='Not available');assert((await page.locator('#recordNote').innerText()).includes('No membership record'));console.log('PASS missing membership does not show zero balance');count++;
 await page.evaluate(()=>window.testFail=true);await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('message').textContent.includes('could not be loaded'));assert(await page.locator('#account').isHidden());console.log('PASS failed reads clear personal records');count++;
 await page.locator('#preview').click();assert(await page.locator('#sampleNotice').isVisible());await page.locator('#closePreview').click();assert(await page.locator('#account').isHidden());console.log('PASS fictional preview is labeled and closes');count++;
 await page.locator('#signOut').click();await page.waitForFunction(()=>document.getElementById('message').textContent==='Sign in to view your personal records.');assert(await page.locator('#account').isHidden());console.log('PASS sign-out clears account');count++;
 await page.setViewportSize({width:390,height:844});await page.locator('#preview').click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));console.log('PASS mobile page fits viewport');count++;
 await page.goto(base+'/payment/');await page.waitForURL(/\/member-account\/?$/);console.log('PASS old payment URL reaches member account');count++;
 assert.deepEqual(errors,[]);console.log(`${count} browser checks passed using a mocked data adapter (not database security validation).`);
}finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});

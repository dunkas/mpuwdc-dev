const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const {readFileSync}=require('node:fs');
const base=process.env.MPU_TEST_URL||'http://127.0.0.1:5000',password='EmulatorOnly-2026!';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const cache=new Map(),errors=[];let passed=0;
 const pass=name=>{passed++;console.log('PASS '+name)};
 async function pageFor(email){
  const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://www.gstatic.com/firebasejs/10.14.1/**',route=>{const url=route.request().url();if(!cache.has(url))cache.set(url,execFileSync('curl',['--fail','--silent','--show-error','--max-time','30',url],{maxBuffer:8*1024*1024}));return route.fulfill({contentType:'text/javascript',body:cache.get(url)})});
  await page.route('**/config.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.MPU_CONFIG={environment:'dev',authDevBypass:false,emulators:true,firebase:{dev:{apiKey:'demo-api-key',projectId:'demo-mpu-finance',appId:'demo-app',authDomain:'localhost',storageBucket:'demo-mpu-finance.appspot.com'}}}"}));
  await page.goto(base+'/finance/workspace/');await page.locator('#finance-email').waitFor();
  await page.locator('#finance-email').fill(email);await page.locator('#finance-password').fill(password);await page.getByRole('button',{name:'Unlock finance',exact:true}).click();
  if(email==='attendance@example.com')await page.waitForURL(url=>url.pathname.replace(/\/$/,'')==='/attendance');else await page.waitForFunction(()=>document.querySelectorAll('#nav button').length>0);return page;
 }
 try{
  const page=await pageFor('finance@example.com');assert.equal(await page.locator('#nav button').count(),15);pass('Password unlock opens all 15 finance sections with attendance moved to its own center');
  for(const view of await page.locator('#nav button').evaluateAll(nodes=>nodes.map(n=>n.dataset.page))){await page.locator(`#nav [data-page="${view}"]`).click();assert(await page.locator('#content h1').count()>0,view)}pass('Every original workspace section renders without a missing view');
  await page.locator('#nav [data-page="receipts"]').click();await page.locator('#content').getByRole('button',{name:'View',exact:true}).first().click();
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download PDF',exact:true}).click();const pdf=await downloaded;const path=await pdf.path();assert.equal(readFileSync(path).subarray(0,4).toString(),'%PDF');await page.getByRole('button',{name:'Close',exact:true}).click();pass('Receipt PDF downloads after audited server print request');
  await page.locator('#nav [data-page="reports"]').click();const exportDownload=page.waitForEvent('download');await page.locator('#content').getByRole('button',{name:/Excel/}).first().click();const spreadsheet=await exportDownload;assert.equal(readFileSync(await spreadsheet.path()).subarray(0,2).toString(),'PK');pass('Finance report exports a real Excel workbook');
  const day=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
  await page.locator('#nav [data-page="maintenance"]').click();await page.getByRole('button',{name:'Excel / CSV finance import'}).click();
  await page.locator('#finance-import-file').setInputFiles({name:'finance-fixture.csv',mimeType:'text/csv',buffer:Buffer.from('source_serial,member_name,snapshot_date,stated_balance,review_required\n31,Test Ada Okeke,'+day+',75,false\n')});
  await page.getByRole('button',{name:'Read file and review'}).click();await page.locator('#finance-import-preview').waitFor();assert((await page.locator('#content').innerText()).includes('Test Ada Okeke'));await page.getByRole('button',{name:'Import reviewed snapshots'}).click();await page.waitForFunction(()=>document.querySelector('#content h1')?.textContent.includes('See the record'));assert((await page.locator('#member-table').innerText()).includes('$75.00'));pass('Finance CSV previews matches and persists the reviewed snapshot balance');
  await page.evaluate(()=>F.page('settings'));await page.getByRole('link',{name:'User access management'}).count();
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));pass('Full workspace fits mobile width');
  await page.evaluate(()=>F.lock());assert.equal(await page.locator('#nav button').count(),0);assert.equal(await page.locator('#finance-password').count(),1);assert(!(await page.locator('#content').innerText()).includes('Test Ada'));pass('Lock removes the workspace and private records from the displayed page');
  const printer=await pageFor('printer@example.com');assert.deepEqual(await printer.locator('#nav button').evaluateAll(nodes=>nodes.map(n=>n.dataset.page)),['receipts']);pass('Receipt printer has only the receipt book');
  const attendance=await pageFor('attendance@example.com');assert.equal(await attendance.locator('#unlockForm').count(),1);pass('Attendance recorder is routed to the password-protected Attendance Center');
  await page.goto(base+'/member-account/');await page.waitForFunction(()=>window.MPUCloud?.state().enabled);await page.evaluate(async password=>{const s=MPUCloud.state();await s.sdk.authMod.signInWithEmailAndPassword(s.auth,'member@example.com',password)},password);await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('message').textContent.includes('records are loaded'));assert((await page.locator('#attendanceHistory').innerText()).includes('Fictional old finance meeting'));assert.equal(await page.locator('#balance').innerText(),'$75.00');pass('Private member account displays original Finance House attendance and imported balance');
  assert.deepEqual(errors,[]);console.log(passed+' browser checks passed with actual emulator Auth, Functions and Firestore.');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});

const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {chromium}=require('playwright');
(async()=>{
  const root=path.join(__dirname,'dist');const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css'};
  const server=http.createServer((req,res)=>{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);if(!file.startsWith(root)||!fs.existsSync(file)){res.statusCode=404;return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'text/plain');res.end(fs.readFileSync(file));});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true});
  try{const p=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
    await p.goto(`http://127.0.0.1:${server.address().port}/`);await p.locator('#evaluate').click();assert((await p.locator('#assessment').textContent()).includes('請補齊'));
    await p.locator('#demo').click();assert((await p.locator('#assessment').textContent()).includes('優先考慮 APD'));assert((await p.locator('#bags').textContent()).includes('IEXTRA1'));assert.equal(await p.locator('#rxWarnings .danger').count(),0);
    await p.locator('#reviewed').check();const download=p.waitForEvent('download');await p.locator('#download').click();const file=await download;assert.equal(file.suggestedFilename(),'PD-consultation.txt');const saved=await file.path();assert(fs.readFileSync(saved,'utf8').includes('示範個案'));
    await p.locator('[data-rx="hours"]').fill('7');await p.locator('[data-rx="hours"]').dispatchEvent('change');assert((await p.locator('#rxWarnings').textContent()).includes('14–16'));
    await p.locator('#demo').click();await p.locator('#weight').fill('61');assert(await p.locator('#prescriptionPanel').isHidden());
    await p.locator('#evaluate').click();await p.locator('[data-rx="mode"]').selectOption('CAPD');await p.locator('[data-row="0"][data-field="product"]').selectOption('I25D25LU');assert((await p.locator('#bags').textContent()).includes('I25D25LU'));
    await p.locator('#potassium').fill('6.8');await p.locator('#evaluate').click();assert((await p.locator('#assessment').textContent()).includes('急性狀況'));assert(await p.locator('#prescriptionPanel').isHidden());
    await p.locator('#demo').click();await p.locator('[data-stage="initial"]').click();await p.locator('#evaluate').click();assert((await p.locator('#assessment').textContent()).includes('尚無有效 PET'));assert(await p.locator('.pet-panel').isHidden());
    await p.locator('#demo').click();await p.locator('#dp').fill('0.45');await p.locator('#preference').selectOption('either');await p.locator('#volume').selectOption('euvolemic');await p.locator('#evaluate').click();assert((await p.locator('#assessment').textContent()).includes('優先考慮 CAPD'));
    await p.setViewportSize({width:390,height:844});assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
    assert.deepEqual(errors,[]);console.log('Browser PASS: missing data, APD recommendation, physician-reviewed export, timing validation, stale data, exact order code, acute routing, no-PET initiation, slow transport and mobile width.');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin = process.env.VIEWER_URL ?? 'http://127.0.0.1:5193/';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const rows = [], errors = [], warnings = [];
try {
 for (const graphics of ['high','low']) {
  const context = await browser.newContext({ viewport: { width:1440, height:1000 }, reducedMotion:'reduce' });
  await context.addInitScript(g => {
   localStorage.setItem('muscle-map-graphics', g);
   window.__workerMessages = [];
   const Original = window.Worker;
   window.Worker = class extends Original { constructor(url, options) { super(url,options);
    this.addEventListener('message', event => { if (String(url).includes('softTissue.worker')) window.__workerMessages.push({error:event.data.error,parts:event.data.parts?.length}); });
   } };
  }, graphics);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='warning') warnings.push(m.text()); });
  for(const route of process.env.OPTIMIZATION_ROUTES?.split('|') ?? ['lower-leg','left-lower-leg','regions?region=lower-leg&region=right-upper-leg','regions?region=right-arm&region=back']) {
   const requests = [];
   const collect = r => { if (r.url().endsWith('.glb')) requests.push(new URL(r.url()).pathname); };
   page.on('request', collect);
   console.log('Checking', graphics, route);
   const start = Date.now();
   await page.goto(origin+'/#/'+route);
   await page.locator('#loading').waitFor({state:'detached',timeout:120000});
   await page.waitForFunction(() => window.__viewerDiagnostics?.pendingLoads===0 && document.querySelector('#viewport')?.dataset.boneAssets==='ready', undefined, {timeout:120000});
   await page.waitForFunction(() => document.querySelector('#viewport')?.dataset.loadedMuscles && document.querySelector('#viewport')?.dataset.softTissues==='ready',undefined,{timeout:120000});
   await page.waitForTimeout(1500);
   const idleStart = await page.evaluate(() => window.__viewerDiagnostics.frameTicks);
   await page.waitForTimeout(250);
   const idleEnd = await page.evaluate(() => window.__viewerDiagnostics.frameTicks);
   assert.equal(idleEnd, idleStart, 'Viewer RAF should sleep after motion, labels and TAA settle');
   const data = await page.evaluate(() => ({viewport:{...document.querySelector('#viewport').dataset},workers:window.__workerMessages,diagnostics:{...window.__viewerDiagnostics},heap:performance.memory?.usedJSHeapSize}));
   assert(!warnings.some(w=>w.includes('worker unavailable')||w.includes('worker timed out')), warnings.join('\n'));
   assert(data.diagnostics.activeWorkers===1,'Only the reusable picking worker should remain');
   if(route.includes('lower-leg')) assert(data.workers.length>0,'Fitting must run in the worker');
   if(route.includes('right-arm')) assert.equal(requests.filter(r=>r.endsWith('/arm-back/bones.glb')).length,1);
   assert(!requests.some(r=>r.endsWith('/neurovascular.glb')),'Supplemental anatomy stays lazy');
   await page.locator('[data-mode="neurovascular"]').click();
   await page.waitForFunction(()=>document.querySelector('#viewport')?.dataset.neurovascularAssets==='ready'&&window.__viewerDiagnostics?.pendingLoads===0,undefined,{timeout:90000});
   rows.push({graphics,route,readyMs:Date.now()-start,requests,...data});
   page.off('request',collect);
   await page.evaluate(()=>{location.hash='#/browser';});
   await page.waitForFunction(()=>window.__viewerDiagnostics?.activeViewers===0&&window.__viewerDiagnostics?.activeWorkers===0&&window.__viewerDiagnostics?.pendingLoads===0,undefined,{timeout:30000});
  }
  // Navigation during downloads/fitting must reject queued work quietly.
  await page.goto(origin+'/#/left-lower-leg');
  await page.waitForTimeout(100);
  await page.evaluate(()=>{location.hash='#/browser';});
  await page.waitForFunction(()=>!window.__viewerDiagnostics?.activeViewers&&!window.__viewerDiagnostics?.activeWorkers&&!window.__viewerDiagnostics?.pendingLoads,undefined,{timeout:30000});
  await context.close();
 }
 const fallbackContext = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await fallbackContext.addInitScript(()=>{localStorage.setItem('muscle-map-graphics','high');window.Worker=class{constructor(){throw new Error('Worker disabled for fallback regression');}};});
 const fallbackPage=await fallbackContext.newPage(),fallbackWarnings=[];
 fallbackPage.on('pageerror',e=>errors.push(e.message));
 fallbackPage.on('console',m=>{if(m.type()==='warning')fallbackWarnings.push(m.text());});
 await fallbackPage.goto(origin+'/#/lower-leg');
 await fallbackPage.locator('#loading').waitFor({state:'detached',timeout:120000});
 await fallbackPage.waitForFunction(()=>document.querySelector('#viewport')?.dataset.softTissues==='ready'&&window.__viewerDiagnostics?.pendingLoads===0,undefined,{timeout:90000});
 assert.equal(await fallbackPage.locator('#viewport').getAttribute('data-loaded-bones'),'30');
 assert.equal(await fallbackPage.locator('#viewport').getAttribute('data-loaded-muscles'),'13');
 assert.equal(await fallbackPage.evaluate(()=>window.__viewerDiagnostics.activeWorkers),0);
 assert(fallbackWarnings.some(w=>w.includes('BVH worker unavailable')));
 assert(fallbackWarnings.some(w=>w.includes('Fitting worker unavailable')));
 await fallbackContext.close();
 assert.deepEqual(errors,[]);
 await fs.writeFile(process.env.OPTIMIZATION_OUT ?? 'validation/optimization-browser-check.json',JSON.stringify({rows,errors,warnings,fallbackVerified:true},null,2));
 console.log(JSON.stringify({checks:rows.length,errors,warnings,rows:rows.map(({graphics,route,readyMs,heap})=>({graphics,route,readyMs,heap}))},null,2));
} finally { await browser.close(); }

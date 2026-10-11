import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.VIEWER_URL??'http://127.0.0.1:5183';
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[];
async function ready(p){await p.locator('#loading').waitFor({state:'detached',timeout:90000});await p.waitForFunction(()=>window.__viewerDiagnostics?.pendingLoads===0&&document.querySelector('#viewport')?.dataset.boneAssets==='ready'&&document.querySelector('#viewport')?.dataset.softTissues==='ready',undefined,{timeout:90000});}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.addInitScript(()=>{localStorage.setItem('muscle-map-graphics','high');localStorage.setItem('muscle-map-settings',JSON.stringify({labelsDefault:false}));});
 page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['lower-leg','left-lower-leg','right-upper-leg','left-upper-leg']){
  console.log('Original region',id);await page.goto(`${origin}/#/${id}`);await ready(page);
  assert.equal(await page.locator('#viewport').getAttribute('data-loaded-bones'),id.includes('upper')?'6':'30');
  assert.equal(await page.locator('#viewport').getAttribute('data-loaded-muscles'),id.includes('upper')?'27':'13');
  assert.equal(await page.locator('[data-layer="skin"]').count(),1);
  await page.locator('.structure-row').first().click();await page.locator('#focus-selected').click();await page.locator('#isolate').click();assert.equal(await page.locator('#isolate').getAttribute('aria-pressed'),'true');await page.locator('#isolate').click();
  await page.locator('[data-mode="neurovascular"]').click();await page.waitForFunction(()=>document.querySelector('#viewport')?.dataset.neurovascularAssets==='ready',undefined,{timeout:90000});
  checks.push(`${id}: bone/muscle counts, skin layer, selection, focus, isolation and neurovascular loading`);
 }
 await page.goto(`${origin}/#/regions?region=right-arm&region=back`);await ready(page);
 await page.locator('#search').fill('Right Infraspinatus');await page.locator('.structure-row[data-id="z-anatomy:infraspinatus-muscle-r"]').click();
 await page.locator('.attachment-details > summary').click();const cards=page.locator('.connection-focus');assert.equal(await cards.count(),3,'Three distinct source patches must appear once each');await cards.first().click();assert.equal(await cards.first().getAttribute('aria-pressed'),'true');await cards.first().click();
 await page.locator('#show-connections').click();assert.equal(await page.locator('#show-connections').getAttribute('aria-pressed'),'true');await page.locator('#show-connections').click();await page.locator('#highlight-connections').click();assert.equal(await page.locator('#highlight-connections').getAttribute('aria-pressed'),'true');
 checks.push('Combined: reviewed attachment focus toggles, cards deduplicate, Neighbors and connection highlighting');
 await page.locator('[data-mode="neurovascular"]').click();await page.waitForFunction(()=>document.querySelector('#viewport')?.dataset.neurovascularAssets==='ready',undefined,{timeout:90000});
 await page.locator('#search').fill('Right Suprascapular nerve');await page.locator('.structure-row[data-id="z-anatomy:suprascapular-nerve-r"]').click();
 await page.locator('.region-menu > summary').click();await page.locator('.region-menu input[value="right-arm"]').uncheck();await page.locator('.region-menu button[type="submit"]').click();await ready(page);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'suprascapular-nerve-r');
 checks.push('Shared nerve selection survives removing Right Arm');
 await page.goto(`${origin}/#/browser`);await page.waitForFunction(()=>window.__viewerDiagnostics?.activeViewers===0&&window.__viewerDiagnostics?.activeWorkers===0);
 for(const width of [1440,1024,768]){await page.setViewportSize({width,height:1000});await page.screenshot({path:`validation/arm-back-hub-${width}.png`});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.equal(await page.locator('[data-section="back"]').count(),1);}
 await page.setViewportSize({width:390,height:844});await page.waitForSelector('#phone-screen-title');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));checks.push('Hub fits desktop/tablet; existing phone notice and disposal remain intact');
 assert.deepEqual(errors,[]);await fs.writeFile('validation/arm-back-regression-check.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}


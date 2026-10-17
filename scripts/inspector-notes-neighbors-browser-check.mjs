import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=process.env.VIEWER_URL??'http://127.0.0.1:5187';
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[],errors=[];
async function ready(page){
 await page.locator('#loading').waitFor({state:'detached',timeout:90000});
 await page.waitForFunction(()=>window.__viewerDiagnostics?.pendingLoads===0&&document.querySelector('#viewport')?.dataset.boneAssets==='ready'&&document.querySelector('#viewport')?.dataset.softTissues==='ready',undefined,{timeout:90000});
}
async function choose(page,id){
 await page.locator('#search').fill('');
 const row=page.locator(`.structure-row[data-id="${id}"]`);
 await row.click();
 await page.locator('#details h2').waitFor();
}
async function layers(page){return page.locator('[data-layer]').evaluateAll(inputs=>inputs.filter(input=>input.checked).map(input=>input.dataset.layer).sort());}
async function notes(page,label){
 const text=await page.locator('#details').innerText();
 assert(!/Model provenance|Modeled (?:left|right|midline) component|Spans |Across regions/.test(text),label);
 const gap=await page.locator('.inspector-content').evaluate(el=>{
  const paragraph=el.querySelector('.structure-description > p:last-child');
  const action=el.querySelector('.quick-facts dt');
  return paragraph&&action?action.getBoundingClientRect().top-paragraph.getBoundingClientRect().bottom:null;
 });
 if(gap!==null)assert(gap>=0&&gap<=8,`${label}: description/facts gap ${gap}`);
 checks.push({check:label+': educational notes without provenance/membership text; compact facts',gap});
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await page.addInitScript(()=>{localStorage.setItem('muscle-map-graphics','high');localStorage.setItem('muscle-map-settings',JSON.stringify({labelsDefault:false}));});
 page.on('pageerror',e=>errors.push(e.message));
 for(const [route,bone,otherBone,muscle] of [
  ['right-arm','scapula-r','humerus-r','latissimus-dorsi-muscle-r'],
  ['back','scapula-l','clavicle-l','latissimus-dorsi-muscle-l'],
  ['regions?region=right-arm&region=back','z-anatomy:scapula-r','z-anatomy:humerus-r','z-anatomy:latissimus-dorsi-muscle-r'],
  ['lower-leg','tibia','fibula','soleus-distal'],
  ['left-lower-leg','tibia','fibula','soleus-distal'],
  ['right-upper-leg','femur','patella','rectus-femoris'],
  ['left-upper-leg','femur','patella','rectus-femoris'],
 ]){
  console.log('Checking '+route);
  await page.goto(`${origin}/#/${route}`);await ready(page);
  await choose(page,muscle);await notes(page,route);
  await page.locator('[data-mode="skeleton"]').click();await choose(page,bone);
  const baseline=await layers(page);
  await page.locator('#show-connections').click();
  const added=(await layers(page)).filter(tissue=>!baseline.includes(tissue));
  assert(added.length>0,route+': Neighbors must reveal hidden layers');
  assert.equal(await page.locator('#show-connections').getAttribute('aria-pressed'),'true');
  await page.locator('#show-connections').click();assert.deepEqual(await layers(page),baseline,route+': repeat click restores layers');
  await page.locator('#show-connections').click();await page.locator('#clear').click();assert.deepEqual(await layers(page),baseline,route+': clear restores layers');
  await choose(page,bone);await page.locator('#show-connections').click();await choose(page,otherBone);assert.deepEqual(await layers(page),baseline,route+': changing selection restores layers');
  await choose(page,bone);await page.locator('#show-connections').click();await page.locator('#isolate').click();assert.deepEqual(await layers(page),baseline,route+': isolate restores layers');
  await page.locator('#isolate').click();await page.locator('#show-connections').click();
  const keep=added[0],toggle=page.locator(`[data-layer="${keep}"]`);
  await toggle.uncheck();await toggle.check();await page.locator('#show-connections').click();
  assert.deepEqual(await layers(page),[...baseline,keep].sort(),route+': explicit manual enable survives restoration');
  await choose(page,bone);
  const beforeCloseup=await layers(page);
  if(await page.locator('.connection-focus').count()){
   await page.locator('#show-connections').click();
   await page.locator('.attachment-details > summary').click();
   await page.locator('.connection-focus').first().click();
   assert.deepEqual(await layers(page),beforeCloseup,route+': attachment close-up restores temporary layers');
   await page.locator('.connection-focus').first().click();
   checks.push({check:route+': opening an attachment close-up restores temporary Neighbors layers'});
  }
  await page.locator('#show-connections').click();await page.locator('[data-mode="skeleton"]').click();
  assert.deepEqual(await layers(page),baseline,route+': preset replaces temporary layers');
  checks.push({check:route+': Neighbors temporarily reveals layers and restores on toggle/clear/selection/isolate; preserves manual changes',baseline,added});
 }
 await page.goto(`${origin}/#/regions?region=right-arm&region=back`);await ready(page);
 const tags=[];
 for(const side of ['l','r']){
  await choose(page,'z-anatomy:ascending-part-of-trapezius-muscle-'+side);
  tags.push((await page.locator('.structure-tag').innerText()).trim());await notes(page,'Combined trapezius '+side);
 }
 assert.deepEqual(tags,['Back · Muscle','Back · Muscle']);checks.push({check:'Ascending trapezius has matching anatomical tags on both sides',tags});
 await page.locator('#atlas-area').selectOption('back:Back');
 const ids=await page.locator('.structure-row').evaluateAll(rows=>rows.map(row=>row.dataset.id));
 assert(ids.includes('z-anatomy:ascending-part-of-trapezius-muscle-l')&&ids.includes('z-anatomy:ascending-part-of-trapezius-muscle-r'));checks.push({check:'Anatomical area filter includes both trapezius sides'});
 await page.screenshot({path:'validation/inspector-notes-neighbors-1440.png'});
 await page.setViewportSize({width:1024,height:900});await page.screenshot({path:'validation/inspector-notes-neighbors-1024.png'});
 assert.deepEqual(errors,[]);
 await fs.writeFile('validation/inspector-notes-neighbors-browser.json',JSON.stringify({date:'2026-10-11',checks,errors},null,2)+'\n');
 console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}

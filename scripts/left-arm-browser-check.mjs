import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const origin=(process.env.VIEWER_URL??'http://127.0.0.1:5174/').replace(/\/$/,'');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[];
async function ready(page,neuro=false){await page.locator('#loading').waitFor({state:'detached',timeout:90000});await page.waitForFunction(n=>window.__viewerDiagnostics?.pendingLoads===0&&document.querySelector('#viewport')?.dataset.boneAssets==='ready'&&(!n||document.querySelector('#viewport')?.dataset.neurovascularAssets==='ready'),neuro,{timeout:90000});}
async function switchRegions(page,ids){const old=await page.locator('#viewport').elementHandle();const params=new URLSearchParams();ids.forEach(id=>params.append('region',id));await page.evaluate(hash=>{location.hash=hash;},'#/regions?'+params.toString());await page.waitForFunction(old=>!old.isConnected,old);await old.dispose();await ready(page);}

try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.addInitScript(()=>{localStorage.setItem('muscle-map-graphics','high');if(!localStorage.getItem('muscle-map-theme'))localStorage.setItem('muscle-map-theme','light');localStorage.setItem('muscle-map-settings',JSON.stringify({labelsDefault:false}));});
 const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
 const requests=[];page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
 console.log('Opening left arm');await page.goto(origin+'/#/left-arm');await ready(page);console.log('Left arm ready');
 assert(!requests.some(r=>r.endsWith('neurovascular.glb')));
 assert.equal(await page.locator('#viewport').getAttribute('data-loaded-bones'),'32');
 assert.equal(await page.locator('#viewport').getAttribute('data-loaded-muscles'),'61');
 for(const view of ['anterior','posterior','medial','lateral','overview']){await page.locator(`[data-view="${view}"]`).click();assert.equal(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed'),'true');}
 await page.locator('#search').fill('Left Median nerve');await page.locator('.structure-row[data-id="median-nerve-l"]').click();assert.match(await page.locator('#details').innerText(),/carpal tunnel/);
 await page.locator('#focus-selected').click();await page.locator('#isolate').click();await page.locator('#isolate').click();await page.keyboard.press('Escape');await page.locator('#search').fill('');
 await page.locator('[data-view="overview"]').click();
 checks.push('Left arm: native assets, lazy neurovascular loading, five camera views, median-nerve notes, focus and isolation');
 console.log('Checking thumbnails');
 // Capture actual left-arm thumbnails in both themes.
 for(const scheme of ['light','dark']){
  await page.evaluate(s=>{localStorage.setItem('muscle-map-theme',s);},scheme);await page.reload();await ready(page);
  const style=await page.addStyleTag({content:'.panel,.inspector-stack,.compass-wrap,.view-controls,.canvas-tools,#label-layer,.graphics-prompt{visibility:hidden!important}'});
  await page.waitForTimeout(500);await page.locator('#viewport > canvas').first().screenshot({path:`public/regions/left-arm${scheme==='dark'?'-dim':''}.png`});await style.evaluate(el=>el.remove());
 }
 await page.evaluate(()=>localStorage.setItem('muscle-map-theme','light'));await page.reload();await ready(page);
 console.log('Checking three-region body map');await page.goto(origin+'/#/browser');
 const left=page.locator('[data-section="left-arm-back"]');assert.equal(await left.getAttribute('data-state'),'available');
 for(const id of ['left-arm-back','back','right-arm-back'])await page.locator(`[data-section="${id}"]`).click();
 assert.match(await page.locator('[data-body-selection]').innerText(),/Left Arm/);assert.match(await page.locator('[data-body-selection]').innerText(),/Right Arm/);
 await page.locator('[data-body-go]').click();await ready(page);console.log('Three regions ready');
 assert.match(page.url(),/region=left-arm/);assert.match(page.url(),/region=right-arm/);assert.match(page.url(),/region=back/);
 assert.match(await page.locator('h1').innerText(),/Both Arms & Back/);
 assert.equal(await page.locator('.structure-row[data-id="z-anatomy:scapula-l"]').count(),1);assert.equal(await page.locator('.structure-row[data-id="z-anatomy:scapula-r"]').count(),1);
 await page.locator('[data-mode="neurovascular"]').click();await ready(page,true);
 await page.locator('#search').fill('Left Median nerve');await page.locator('.structure-row[data-id="z-anatomy:median-nerve-l"]').click();assert.match(await page.locator('#details').innerText(),/carpal tunnel/);
 await page.keyboard.press('Escape');await page.locator('#search').fill('');await page.locator('[data-mode="anatomy"]').click();await ready(page);
 await page.locator('[data-view="posterior"]').click();await page.waitForTimeout(500);
 await page.screenshot({path:'validation/left-arm-both-arms-back-1440.png'});
 const dataset=await page.locator('#viewport').evaluate(el=>({...el.dataset}));
 checks.push('Body map opens Left Arm + Back + Right Arm together; both scapulae deduplicate; neurovascular assets and notes load');
 await page.locator('#search').fill('Left Scapula');await page.locator('.structure-row[data-id="z-anatomy:scapula-l"]').click();
 await switchRegions(page,['left-arm','back']);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'z-anatomy:scapula-l');
 await switchRegions(page,['left-arm']);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'scapula-l');
 await switchRegions(page,['left-arm','right-arm']);await switchRegions(page,['left-arm','right-arm','back']);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'z-anatomy:scapula-l');
 checks.push('Selected left scapula survives navigating between single-arm, both-arm and three-region scenes');
 await page.keyboard.press('Escape');await page.locator('#search').fill('');
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'validation/left-arm-both-arms-back-390.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 checks.push('Existing phone-size screen notice fits at 390px without horizontal overflow');
 assert.deepEqual(errors,[]);
 await fs.writeFile('validation/left-arm-browser.json',JSON.stringify({origin,checks,errors,dataset},null,2));
 console.log(JSON.stringify({checks,errors,dataset},null,2));await context.close();
}finally{await browser.close();}

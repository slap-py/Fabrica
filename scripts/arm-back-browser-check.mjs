import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const origin=(process.env.VIEWER_URL??'http://127.0.0.1:5183/').replace(/#.*$/,'').replace(/\/$/,'');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],checks=[],performanceRows=[];
async function ready(page,neuro=false){await page.locator('#loading').waitFor({state:'detached',timeout:90000});await page.waitForFunction(n=>window.__viewerDiagnostics?.pendingLoads===0&&document.querySelector('#viewport')?.dataset.boneAssets==='ready'&&(!n||document.querySelector('#viewport')?.dataset.neurovascularAssets==='ready'),neuro,{timeout:90000});}
async function measure(page){const box=await page.locator('#viewport > canvas').first().boundingBox();await page.mouse.move(box.x+box.width*.53,box.y+box.height*.45);await page.mouse.down();await page.evaluate(()=>{window.__armFrames=[];window.__armSample=true;let previous=performance.now();const sample=t=>{if(!window.__armSample)return;window.__armFrames.push(t-previous);previous=t;requestAnimationFrame(sample);};requestAnimationFrame(sample);});for(let i=0;i<24;i++){await page.mouse.move(box.x+box.width*.53+Math.sin(i/24*Math.PI*2)*75,box.y+box.height*.45+Math.cos(i/24*Math.PI*2)*35);await page.waitForTimeout(16);}await page.mouse.up();return page.evaluate(()=>{window.__armSample=false;const a=window.__armFrames.slice(1).sort((a,b)=>a-b);return {frames:a.length,medianFrameMs:a[Math.floor(a.length*.5)],p95FrameMs:a[Math.floor(a.length*.95)],meanFrameMs:a.reduce((s,v)=>s+v,0)/a.length};});}
async function switchRegion(page,id,included){const old=await page.locator('#viewport').elementHandle();await page.evaluate(({id,included})=>{const route=location.hash;const params=new URLSearchParams(route.includes('?')?route.slice(route.indexOf('?')+1):'');let ids=params.getAll('region');if(!ids.length)ids=[route.slice(2).split('?')[0]];ids=included?[...new Set([...ids,id])]:ids.filter(value=>value!==id);const next=new URLSearchParams();ids.forEach(value=>next.append('region',value));location.hash='#/regions?'+next;},{id,included});await page.waitForFunction(old=>!old.isConnected,old);await old.dispose();await ready(page,true);}

try{
 for(const graphics of ['high','low']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(g=>{localStorage.setItem('muscle-map-graphics',g);localStorage.setItem('muscle-map-theme','system');localStorage.setItem('muscle-map-settings',JSON.stringify({labelsDefault:true}));},graphics);
  const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>errors.push(e.message));
  let requests=[];page.on('request',r=>{if(r.url().endsWith('.glb'))requests.push(r.url());});
  for(const [id,route,muscles,bones] of [['right-arm','right-arm',61,32],['back','back',82,55],['combined','regions?region=right-arm&region=back',131,85],['leg-baseline','lower-leg',13,30]]){
   console.log('Checking',graphics,id);
   requests=[];const start=Date.now();await page.goto(origin+'/#/'+route);await ready(page);
   const loadMs=Date.now()-start;
   assert(!requests.some(r=>r.endsWith('/neurovascular.glb')),'Neurovascular must remain lazy');
   await page.locator('[data-mode="anatomy"]').click();await ready(page);
   assert.equal(await page.locator('#viewport').getAttribute('data-loaded-muscles'),String(muscles));
   assert.equal(await page.locator('#viewport').getAttribute('data-loaded-bones'),String(bones));
   if(id!=='leg-baseline'){
    assert.equal(await page.locator('.structure-row[data-id*="spinal-cord"]').count(),0);
    assert.equal(await page.locator('[data-layer="skin"]').count(),0);
    if(await page.locator('#labels').getAttribute('aria-pressed')!=='true')await page.locator('#labels').click();
    await page.waitForFunction(()=>document.querySelectorAll('.model-label').length>0,undefined,{timeout:10000});
    for(const view of ['anterior','posterior','medial','lateral','overview']){await page.locator(`[data-view="${view}"]`).click();assert.equal(await page.locator(`[data-view="${view}"]`).getAttribute('aria-pressed'),'true');}
    await page.waitForTimeout(450);await page.screenshot({path:`validation/arm-back-${id}-${graphics}.png`});
    const selection=id==='combined'?'z-anatomy:scapula-r':'scapula-r';
    await page.locator('#search').fill('Right Scapula');const row=page.locator(`.structure-row[data-id="${selection}"]`);assert.equal(await row.count(),1);await row.click();assert.match(await page.locator('#details h2').innerText(),/Right Scapula/);
    await page.locator('#focus-selected').click();await page.locator('#isolate').click();await page.waitForTimeout(400);await page.screenshot({path:`validation/arm-back-${id}-${graphics}-focus.png`});
    await page.locator('#isolate').click();await page.keyboard.press('Escape');await page.locator('#search').fill('');
    await page.locator('[data-mode="skeleton"]').click();await ready(page);
    const box=await page.locator('#viewport > canvas').first().boundingBox();let picked=false;
    for(const dx of [.48,.55,.42,.6]){await page.mouse.click(box.x+box.width*dx,box.y+box.height*.43);if(await page.locator('#details h2').count()){picked=true;break;}}
    assert(picked,'Visible source bones should be selectable from the canvas');
    await page.keyboard.press('Escape');
    for(const layer of await page.locator('[data-layer]').all())if(await layer.isChecked())await layer.uncheck();
    await page.mouse.click(box.x+box.width*.5,box.y+box.height*.43);assert.equal(await page.locator('#details h2').count(),0,'Hidden anatomy must not intercept picking');
    await page.locator('[data-mode="neurovascular"]').click();await ready(page,true);assert.equal(await page.locator('#viewport').getAttribute('data-neurovascular-assets'),'ready');
    await page.locator('[data-mode="anatomy"]').click();await ready(page);
    checks.push(`${graphics}/${id}: complete loading, lazy neurovascular, source selection, focus/isolation, hidden picking, labels and five camera views`);
   }
   if(await page.locator('#labels').getAttribute('aria-pressed')==='true')await page.locator('#labels').click();
   performanceRows.push({graphics,id,loadMs,...await measure(page)});
  }
  await page.goto(origin+'/#/right-arm');await ready(page);await page.locator('[data-mode="neurovascular"]').click();await ready(page,true);
  await page.locator('#search').fill('Right Scapula');await page.locator('.structure-row[data-id="scapula-r"]').click();await page.locator('#labels').click();await page.locator('#neurovascular-opacity').fill('60');await page.locator('[data-view="posterior"]').click();
  await switchRegion(page,'back',true);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'z-anatomy:scapula-r');assert.equal(await page.locator('#atlas-area option[value="back"]').count(),1);assert.equal(await page.locator('#atlas-area option[value="right-arm"]').count(),1);assert.equal(await page.locator('#neurovascular-opacity').inputValue(),'60');
  for(const area of ['back','right-arm']){await page.locator('#atlas-area').selectOption(area);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'z-anatomy:scapula-r');}
  await switchRegion(page,'right-arm',false);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'scapula-r');await switchRegion(page,'right-arm',true);assert.equal(await page.locator('.structure-row.selected').getAttribute('data-id'),'z-anatomy:scapula-r');
  checks.push(`${graphics}: shared bone selection and view settings survive adding/removing either region`);
  await page.goto(origin+'/#/browser');await page.waitForFunction(()=>window.__viewerDiagnostics?.activeWorkers===0&&window.__viewerDiagnostics?.activeViewers===0&&window.__viewerDiagnostics?.pendingLoads===0);
  await page.locator('[data-section="right-arm-back"]').click();await page.locator('[data-section="back"]').click();assert.match(await page.locator('[data-body-selection]').innerText(),/Right Arm.*Back/);await page.locator('[data-body-go]').click();await ready(page);
  checks.push(`${graphics}: body-map selection opens both regions; viewer disposal releases workers and loads`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
 await fs.writeFile('validation/arm-back-browser-check.json',JSON.stringify({origin,checks,errors,performanceMethod:'Fresh Edge contexts; same Anatomy preset, 1440x1000, labels off; 24 real pointer-drag steps. RAF intervals include CPU and rendering. These local measurements are not device guarantees.',performanceRows},null,2));
 console.log(JSON.stringify({checks,errors,performanceRows},null,2));
}finally{await browser.close();}

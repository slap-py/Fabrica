import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const origin=(process.env.VIEWER_URL??'http://127.0.0.1:5183/').replace(/#.*$/,'').replace(/\/$/,'');
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const errors=[];
 for(const id of ['right-arm','back'])for(const scheme of ['light','dark']){
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await page.addInitScript(s=>{localStorage.setItem('muscle-map-graphics','high');localStorage.setItem('muscle-map-theme',s);localStorage.setItem('muscle-map-settings',JSON.stringify({labelsDefault:false}));},scheme);
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/#/'+id);
  await page.locator('#loading').waitFor({state:'detached',timeout:90000});
  await page.locator('[data-mode="anatomy"]').click();
  await page.waitForFunction(()=>window.__viewerDiagnostics?.pendingLoads===0&&document.querySelector('#viewport')?.dataset.boneAssets==='ready'&&document.querySelector('#viewport')?.dataset.softTissues==='ready',undefined,{timeout:90000});
  await page.addStyleTag({content:'.panel,.inspector-stack,.compass-wrap,.view-controls,.canvas-tools,#label-layer,.graphics-prompt{visibility:hidden!important}'});
  await page.waitForTimeout(600);
  await page.locator('#viewport > canvas').first().screenshot({path:`public/regions/${id}${scheme==='dark'?'-dim':''}.png`});
  await page.close();
 }
 await fs.writeFile('validation/arm-back-thumbnail-errors.json',JSON.stringify(errors,null,2));if(errors.length)throw new Error(errors.join('\n'));
}finally{await browser.close();}



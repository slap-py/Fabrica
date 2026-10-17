import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { viewerUrl } from './browser-url.mjs';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
const choose = async id => {
  await page.locator('#search').fill('');
  await page.locator(`.structure-row[data-id="${id}"]`).click();
};
try {
  for (const [region, selection] of [['lower-leg', 'achilles'], ['left-lower-leg', 'achilles'], ['right-upper-leg', 'femur'], ['left-upper-leg', 'femur'], ['right-arm', 'clavicle-r'], ['back', 'scapula-r']]) {
    await page.goto(viewerUrl('http://127.0.0.1:5174/', '/' + region), { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('#loading').waitFor({ state: 'hidden', timeout: 60000 });
    await page.locator('[data-mode="anatomy"]').click();
    await page.waitForFunction(() => Number(document.querySelector('#viewport')?.dataset.loadedMuscles) > 0, undefined, { timeout: 60000 });
    if (region.endsWith('upper-leg')) {
      await choose('sartorius');
      assert.equal(await page.locator('.connection-focus').filter({ hasText: 'Hip bone' }).count(), 0, region + ': no projected sartorius hip card');
      assert.match(await page.locator('#details').innerText(), /anterior superior iliac spine/i, region + ': written origin retained');
      await page.screenshot({ path: `validation/attachment-refinement-${region}.png` });
    }
    await choose(selection);
    const section = page.locator('.attachment-details');
    assert.equal(await section.count(), 1, region + ': supported cards remain');
    await section.locator('summary').first().click();
    const keys = await section.locator('.connection-focus').evaluateAll(buttons => buttons.map(button => button.dataset.connection));
    assert.equal(new Set(keys).size, keys.length);
    await section.locator('.connection-focus').first().click();
    assert.equal(await page.locator('#viewport').getAttribute('data-ghost'), 'true');
    await section.locator('.connection-focus[aria-pressed="true"]').click();
    assert.equal(await page.locator('#viewport').getAttribute('data-ghost'), 'false');
    if (region === 'lower-leg') {
      await choose('edl');
      const junctions = await page.locator('.connection-focus').filter({ hasText: 'Extensor digitorum longus' }).allTextContents();
      assert.equal(junctions.filter(text => /→ Extensor digitorum longus$/.test(text)).length, 1, 'Shared EDL junction appears once');
      assert.equal(await page.locator('.connection-focus').count(), 9, 'All eight EDL insertions retained');
    }
    checks.push({ region, selection, supportedCards: keys.length });
  }
  assert.deepEqual(errors, []);
  await fs.writeFile('validation/attachment-refinement-browser.json', JSON.stringify({ checks, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ checks, errors }));
} finally { await browser.close(); }

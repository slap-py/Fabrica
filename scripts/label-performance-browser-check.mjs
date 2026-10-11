import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.VIEWER_URL ?? 'http://127.0.0.1:5187';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const rows = [], errors = [];
const output = process.env.LABEL_PERF_OUT ?? 'validation/label-performance-current.json';
async function sample(page, action) {
  await page.evaluate(() => {
    window.__perfFrames = []; window.__perfSampling = true;
    let previous;
    function tick(time) {
      if (!window.__perfSampling) return;
      if (previous !== undefined) window.__perfFrames.push(time - previous);
      previous = time; requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  await action();
  return page.evaluate(() => {
    window.__perfSampling = false;
    const frames = window.__perfFrames.sort((a, b) => a - b);
    return { frames: frames.length, medianFrameMs: frames[Math.floor(frames.length * .5)],
      p95FrameMs: frames[Math.floor(frames.length * .95)], maxFrameMs: frames.at(-1),
      meanFrameMs: frames.reduce((sum, ms) => sum + ms, 0) / frames.length };
  });
}
try {
  for (const graphics of (process.env.LABEL_PERF_GRAPHICS ?? 'low,high').split(',')) {
    for (const route of (process.env.LABEL_PERF_ROUTES ?? 'right-arm,back,regions?region=right-arm&region=back,lower-leg').split(',')) {
      console.log('Checking', graphics, route);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      await context.addInitScript(graphics => {
        localStorage.setItem('muscle-map-graphics', graphics);
        localStorage.setItem('muscle-map-settings', JSON.stringify({ labelsDefault: true }));
      }, graphics);
      const page = await context.newPage(); page.setDefaultTimeout(30000);
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(`${origin}/#/${route}`);
      await page.locator('#loading').waitFor({ state: 'detached' });
      await page.waitForFunction(() => window.__viewerDiagnostics?.pendingLoads === 0 && document.querySelector('#viewport')?.dataset.softTissues === 'ready');
      await page.locator('[data-mode=anatomy]').click(); const overview = page.locator('[data-view=overview]'); await (await overview.count() ? overview : page.locator('[data-view=foot]')).click();
      if (await page.locator('#labels').getAttribute('aria-pressed') !== 'true') await page.locator('#labels').click();
      await page.waitForTimeout(1800);
      const box = await page.locator('#viewport > canvas').boundingBox();
      const x = box.x + box.width * .53, y = box.y + box.height * .45;
      await page.mouse.move(x, y); await page.mouse.down();
      const drag = await sample(page, async () => {
        for (let i = 0; i < 45; i++) {
          await page.mouse.move(x + Math.sin(i / 44 * Math.PI * 2) * 90, y + Math.cos(i / 44 * Math.PI * 2) * 35);
          await page.waitForTimeout(16);
        }
        await page.mouse.up(); await page.mouse.move(10, 10); await page.waitForTimeout(600);
      });
      const popup = await sample(page, async () => {
        for (let i = 0; i < 4; i++) {
          await page.locator('.structure-row').nth(i).click(); await page.waitForTimeout(260);
        }
        await page.locator('#clear').click(); await page.waitForTimeout(450);
      });
      await page.waitForTimeout(1500);
      const labels = await page.locator('.model-label.shown').count();
      const row = { graphics, route, labels, drag, popup }; rows.push(row); console.log(JSON.stringify(row));
      await fs.writeFile(output, JSON.stringify({ origin, rows, errors }, null, 2));
      assert(labels > 0, `${route} has passive labels after clearing selection`);
      if (process.env.LABEL_PERF_CAPTURE === 'true') await page.screenshot({ path: `validation/label-performance-${route.startsWith('regions') ? 'combined' : route}-${graphics}.png` });
      await page.mouse.move(10, 10); await page.locator('#labels').click(); await page.waitForTimeout(500);
      assert.equal(await page.locator('.model-label.shown').count(), 0);
      await page.locator('.structure-row').first().click(); await page.locator('#focus-selected').click(); await page.waitForTimeout(800);
      assert.equal(await page.locator('.model-label.selected.shown').count(), 1);
      await page.goto(`${origin}/#/browser`);
      await page.waitForFunction(() => window.__viewerDiagnostics?.activeViewers === 0 && window.__viewerDiagnostics?.activeWorkers === 0);
      await context.close();
    }
  }
  assert.deepEqual(errors, []);
  await fs.writeFile(output, JSON.stringify({ origin, method: 'Fresh Edge headless contexts per route, 1440x1000, labels on, normal animations; 45 pointer drag steps and four inspector selections. RAF intervals include rendering and label CPU work; local observations.', rows, errors }, null, 2));
} finally { await browser.close(); }

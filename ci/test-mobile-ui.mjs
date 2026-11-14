import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { chromium } from '@playwright/test';

const fixtures = path.resolve('ci/mobile-ui-services.ts');
const server = await createServer({
  configFile: false,
  plugins: [react(), tailwind()],
  optimizeDeps: { entries: ['ci/mobile-ui.html'] },
  resolve: { alias: [
    { find: /^(?:.*\/)?AuthContext$/, replacement: fixtures },
    { find: /^(?:.*\/)?inventoryService$/, replacement: fixtures },
    { find: /^(?:.*\/)?posService$/, replacement: fixtures },
  ] },
  server: { host: '127.0.0.1', port: 4179, strictPort: true, hmr: false,
    watch: { ignored: ['**/ui-evidence/**', '**/dist/**'] } },
});
await server.listen();
const browser = await chromium.launch({ headless: true });
await fs.mkdir('ui-evidence', { recursive: true });
try {
  for (const [width, height] of [[320, 568], [390, 844], [820, 900], [844, 390], [1280, 800]]) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
    // This test cannot communicate with Firebase or any other external service.
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
      return route.abort();
    });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4179/ci/mobile-ui.html');
    await page.getByRole('heading', { name: 'Talk of the Town master inventory · 144 items' }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 144);
    const nav = page.getByRole('navigation', { name: 'Quick navigation' });
    if (width < 1024) {
      await nav.waitFor({ state: 'visible' });
      const navRect = await nav.boundingBox();
      const mainRect = await page.locator('main').boundingBox();
      assert.ok(mainRect.y + mainRect.height <= navRect.y + 1, 'Navigation must not cover content');
      assert.ok(navRect.y + navRect.height <= height + 1, 'Navigation fits the viewport');
      await page.getByRole('button', { name: 'Open menu', exact: true }).tap();
      await page.getByRole('button', { name: 'Close menu', exact: true }).tap();
    } else {
      assert.equal(await nav.isVisible(), false);
      assert.equal(await page.getByRole('button', { name: 'Open menu', exact: true }).isVisible(), false);
    }
    await page.getByRole('button', { name: 'Account menu', exact: true }).tap();
    await page.getByRole('button', { name: 'Sign out', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Account menu', exact: true }).tap();
    assert.equal(await page.getByRole('button', { name: 'Sign out', exact: true }).count(), 0);
    await page.getByRole('searchbox', { name: 'Search master inventory' }).fill('TOT-144');
    await page.getByText('TOT-144', { exact: true }).scrollIntoViewIfNeeded();
    assert.equal(await page.locator('tbody tr').count(), 1);
    await page.screenshot({ path: `ui-evidence/inventory-${width}x${height}.png` });
    if (width < 1024) {
      await nav.getByRole('link', { name: 'POS', exact: true }).tap();
    } else {
      await page.locator('#app-sidebar').getByRole('link', { name: 'POS', exact: true }).tap();
    }
    await page.getByRole('heading', { name: 'Talk of the Town POS' }).waitFor();
    await page.getByRole('alert').filter({ hasText: 'access to the restaurant menu was denied' }).waitFor();
    assert.equal(await page.getByText(/No active items|No active menu items/).count(), 0, 'Denied reads must not be presented as an empty menu');
    if (width < 1024) {
      await page.getByRole('button', { name: /Review & Pay/ }).tap();
      await page.getByRole('heading', { name: 'Active Ticket' }).filter({ visible: true }).waitFor();
      await page.getByRole('button', { name: 'Close cart' }).tap();
    }
    await page.getByRole('link', { name: 'Manage Menu', exact: true }).tap();
    await page.getByRole('alert').filter({ hasText: 'Menu read unavailable (test)' }).waitFor();
    assert.equal(await page.getByText(/No saved menu items were returned/).count(), 0, 'A read error must not claim records are absent');
    await page.screenshot({ path: `ui-evidence/menu-${width}x${height}.png` });
    assert.deepEqual(errors, [], 'No unhandled UI exceptions');
    console.log(`PASS: ${width}x${height} navigation, account taps, inventory search/scroll, cart, menu read-error state`);
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { chromium } from '@playwright/test';

// Regression for an existing cache-first PWA hiding an APK's updated HTML.
// This isolated localhost fixture never accesses restaurant services or data.
const retirement = await readFile(new URL('./android-sw-retire.js', import.meta.url), 'utf8');
const legacy = `
self.addEventListener('install', event => event.waitUntil(
  caches.open('workbox-precache-old-apk').then(cache => cache.add('/index.html')).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(caches.match('/index.html'));
});`;
let upgraded = false;
const server = createServer((req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.url === '/sw.js') {
    res.setHeader('Content-Type', 'text/javascript');
    res.end(upgraded ? retirement : legacy);
  } else {
    res.setHeader('Content-Type', 'text/html');
    res.end(upgraded ? '<h1>Updated installed APK</h1>' :
      '<h1>Old cached APK</h1><script>navigator.serviceWorker.register("/sw.js")</script>');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    localStorage.setItem('upgrade-marker', 'preserve');
    const businessCache = await caches.open('restaurant-offline-data');
    await businessCache.put('/business-marker', new Response('preserve'));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('upgrade-preservation', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('data');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('data', 'readwrite');
        tx.objectStore('data').put('preserve', 'marker');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  assert.equal(await page.locator('h1').innerText(), 'Old cached APK');
  upgraded = true;
  // Reload runs the legacy registration again, which detects the new worker.
  await page.reload();
  await page.getByRole('heading', { name: 'Updated installed APK' }).waitFor({ timeout: 15000 });
  const retained = await page.evaluate(async () => ({
    local: localStorage.getItem('upgrade-marker'),
    cache: await (await (await caches.open('restaurant-offline-data')).match('/business-marker')).text(),
    cacheNames: await caches.keys(),
    registrations: (await navigator.serviceWorker.getRegistrations()).length,
    indexed: await new Promise((resolve, reject) => {
      const request = indexedDB.open('upgrade-preservation', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const value = db.transaction('data').objectStore('data').get('marker');
        value.onsuccess = () => { db.close(); resolve(value.result); };
        value.onerror = () => reject(value.error);
      };
    }),
  }));
  assert.equal(retained.local, 'preserve');
  assert.equal(retained.cache, 'preserve');
  assert.equal(retained.indexed, 'preserve');
  assert.equal(retained.registrations, 0);
  assert.deepEqual(retained.cacheNames, ['restaurant-offline-data']);
  console.log('PASS: old cached UI replaced; localStorage, IndexedDB and business cache preserved.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

// Native APK migration only. Copied to dist/sw.js by the Android workflow.
// Older APKs registered a PWA worker that can serve an obsolete index.html.
// Replace that worker before loading the new installed assets. Keep IndexedDB,
// localStorage, cookies, and non-Workbox caches (including business data).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-precache-'))
      .map(name => caches.delete(name)));
    await self.registration.unregister();
    const windows = await self.clients.matchAll({ type: 'window' });
    await Promise.all(windows.map(client => client.navigate(client.url)));
  })());
});

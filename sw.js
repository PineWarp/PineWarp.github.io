// Self-destructing service worker.
//
// PineWarp does not enable a service worker (ENABLE_SERVICE_WORKER is off), but
// browsers that visited an earlier deploy still have the old registration
// pinned. That old worker answered document requests with
// stale-while-revalidate, so a returning visitor could be handed an HTML page
// from a previous build whose chunk URLs pointed at bundles that the newest
// deploy had already removed - an unrecoverable ChunkLoadError.
//
// Emitting a byte-different sw.js makes the browser install this replacement.
// It drops every cache the old worker created, unregisters itself and stops
// intercepting fetches (there is no fetch handler below), so no document can be
// served stale again.
self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil((async () => {
        try {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        } catch (e) {
            // Cache storage unavailable: nothing to purge.
        }
        try {
            await self.registration.unregister();
        } catch (e) {
            // Registration already gone.
        }
        try {
            const clients = await self.clients.matchAll({type: 'window'});
            clients.forEach(client => {
                try {
                    client.navigate(client.url);
                } catch (e) {
                    // Detached or cross-origin client: skip.
                }
            });
        } catch (e) {
            // No client list available: skip.
        }
    })());
});
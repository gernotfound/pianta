const CACHE_NAME = 'pianta-app-cache-v5.8.5';

const offlineFallbackHtml = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offline</title>
  <style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;padding:2rem;background:#f7f8f3;color:#2e7d32;text-align:center;}</style>
</head>
<body>
  <div>
    <h1>Sei offline</h1>
    <p>La PWA sta usando la versione cache dell'app. Riconnettiti per aggiornare i dati.</p>
  </div>
</body>
</html>`;

const offlineFallbackResponse = new Response(offlineFallbackHtml, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200
});

// Asset essenziali pre-caricati al momento dell'installazione (AGGIORNATI CON I FILE DIVISI)
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    './js/globals.js',
    './js/router.js',
    './js/ui.js',
    './js/media.js',
    './js/plants-form.js',
    './js/plants-grid.js',
    './js/plants-detail.js',
    './js/diary.js',
    './js/stats.js',
    './js/tools.js',
    './js/io.js'
];

self.addEventListener('install', event => {
    // Forza l'attivazione immediata del nuovo SW scavalcando quello vecchio
    self.skipWaiting();

    event.waitUntil(
        caches.open(CACHE_NAME).then(async cache => {
            console.log('[SW] Inizio pre-caching asset locali essenziali (Strategia Resiliente)');
            for (const url of urlsToCache) {
                try {
                    await cache.add(url);
                } catch (err) {
                    console.warn(`[SW] Attenzione, impossibile mettere in cache iniziale: ${url}`, err);
                }
            }
        })
    );
});

self.addEventListener('activate', event => {
    // Il nuovo Service Worker prende subito il controllo delle pagine
    self.clients.claim();

    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // Elimina tutte le vecchie versioni della cache
                    if (cacheName !== CACHE_NAME) {
                        console.log(`[SW] Rimozione vecchia cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const req = event.request;

    if (req.method !== 'GET' || !(req.url.startsWith('http:') || req.url.startsWith('https:'))) {
        return;
    }

    const urlObj = new URL(req.url);

    if (urlObj.hostname.includes('api.open-meteo.com') || urlObj.hostname.includes('tile.openstreetmap.org')) {
        event.respondWith(
            fetch(req).catch(() => new Response(
                JSON.stringify({ error: 'Rete non disponibile per risorsa esterna' }),
                { status: 503, headers: { 'Content-Type': 'application/json' } }
            ))
        );
        return;
    }

    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then(networkResponse => {
                    if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put('./index.html', responseClone));
                    }
                    return networkResponse;
                })
                .catch(async () => {
                    const cachedPage = await caches.match('./index.html');
                    return cachedPage || offlineFallbackResponse;
                })
        );
        return;
    }

    event.respondWith(
        caches.match(req).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }

            const fetchPromise = fetch(req).then(networkResponse => {
                if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(req, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                console.log('[SW] Rete non disponibile per aggiornare la cache di:', req.url);
                return offlineFallbackResponse;
            });

            return fetchPromise;
        })
    );
});
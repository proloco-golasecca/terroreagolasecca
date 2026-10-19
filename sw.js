// La cache contiene solo le tre mappe e le immagini usate al loro interno.
const CACHE_NAME = 'terrore-map-v20261019-1';
const MAP_DIR = 'media/halloween%202026/mappa-del-terrore/';
const MAP_FILES = [
  'index.html',
  'mappa-percorsi.html',
  'mappa-tour.html',
  'map_ink_a4b.png',
  'map_routes_ink.png',
  'map_tour_ink.png',
  '0c2a45145412ceec2966f415a56f772b.jpg',
  '0cb7c88fb76d98e3a26b3ca5cc84ad91.jpg',
  '1ee8c9159a59bb3babd33d389c83dc0b.jpg',
  '1fe9df0be259c9d98c480b34315eca46.jpg',
  '467b5e95367334dcec909e7a81d56eb3.jpg',
  '667a323059e96df372f166390994756a.jpg',
  '7f6aa25da633f8e7b4e51c0ab7902134.jpg',
  '961bcd0e88193fc284842bcddac76857.jpg',
  '9999904605014d86f50af5b39a3b08c8.jpg',
  'd43bb7eec0634ea365ddd3d1cecda2de.jpg',
  'eabdd374cce0a71a0faf103c35b768bb.jpg'
];
const MAP_URLS = MAP_FILES.map(file => new URL(MAP_DIR + file, self.registration.scope).href);
const MAP_PATHS = new Set(MAP_URLS.map(url => new URL(url).pathname));

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('terrore-map-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function prefetchMaps() {
  const cache = await caches.open(CACHE_NAME);
  // Poche richieste alla volta: il caricamento avviene dopo la home.
  for (let i = 0; i < MAP_URLS.length; i += 3) {
    await Promise.allSettled(MAP_URLS.slice(i, i + 3).map(async url => {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) await cache.put(url, response);
    }));
  }
}

self.addEventListener('message', event => {
  if (event.data?.type === 'PREFETCH_MAPS') {
    event.waitUntil(prefetchMaps());
  }
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !MAP_PATHS.has(url.pathname)) return;

  // Ignora i parametri dell'iframe: la stessa mappa usa la stessa cache.
  const cacheKey = url.origin + url.pathname;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(cacheKey);
    if (cached) {
      // Risposta immediata dalla cache; la rete aggiorna la prossima apertura.
      event.waitUntil(fetch(event.request, { cache: 'no-cache' })
        .then(response => response.ok ? cache.put(cacheKey, response) : undefined)
        .catch(() => {}));
      return cached;
    }
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
    return response;
  })());
});

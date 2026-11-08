// Permite instalar la app y abrirla aunque haya poca señal.
const CACHE = 'mostrador-v2';
const ARCHIVOS = ['./', './index.html', './manifest.webmanifest', './iconos/icono-192.png', './iconos/icono-512.png', './modelo/recorte.json'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero intenta internet (para tener siempre la última versión); si no hay, usa lo guardado.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});

// Service worker : garde l'application en memoire pour qu'elle s'ouvre sans connexion.
// Les appels a la passerelle Google ne passent jamais par ici (autre domaine).
const CACHE = 'diginka-v4';
const FICHIERS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './logo.png', './logo-mini.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, {ignoreSearch: true}).then(enCache => {
      // Mise a jour discrete en arriere-plan (prise en compte au prochain lancement)
      const reseau = fetch(req).then(rep => {
        if (rep && rep.ok) {
          const copie = rep.clone();
          caches.open(CACHE).then(c => c.put(req, copie));
        }
        return rep;
      }).catch(() => null);
      if (enCache) { e.waitUntil(reseau); return enCache; }
      return reseau.then(rep => rep || caches.match('./index.html'));
    })
  );
});

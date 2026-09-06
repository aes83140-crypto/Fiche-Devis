/* Cache applicatif : la page s'ouvre même sans réseau.
   Les pages et les données passent par le réseau en priorité (toujours à jour),
   le cache ne sert qu'en secours hors connexion. */
const CACHE = 'record-outils-v11';
const ASSETS = ['./', './index.html', './fiche-devis.html', './vantaux-sav.html', './rideaux-metalliques.html', './contrat-maintenance.html',
  './listes.json', './config.js', './lame-p116.jpg', './manifest.webmanifest', './icone-192.png', './icone-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === location.origin;

  // Espace partagé (statistiques + listes) : appels ponctuels avec adresse toujours
  // unique (horodatage) — jamais à mettre en cache, et surtout jamais réinterprétés ici :
  // laisser le navigateur les traiter nativement (cookies, redirections Google...).
  if (/(^|\.)script\.google(usercontent)?\.com$/.test(url.hostname)) return;
  if (/(^|\.)supabase\.co$/.test(url.hostname)) return;

  // Pages, données et scripts du site : réseau d'abord, cache en secours
  const freshFirst = sameOrigin && (
    req.mode === 'navigate' ||
    /\.(html|json|webmanifest|js)$/.test(url.pathname) ||
    url.pathname.endsWith('/')
  );

  if (freshFirst) {
    e.respondWith((async () => {
      try {
        const r = await fetch(req, { cache: 'no-store' });
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return r;
      } catch (err) {
        const hit = await caches.match(req);
        return hit || caches.match('./index.html');
      }
    })());
    return;
  }

  // Images, polices, librairies : cache d'abord (elles ne changent pas)
  e.respondWith((async () => {
    const hit = await caches.match(req);
    if (hit) return hit;
    const r = await fetch(req);
    if (r && r.ok && sameOrigin) {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
    }
    return r;
  })());
});

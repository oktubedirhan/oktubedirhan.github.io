// İnternetsiz açılış: uygulama dosyaları önbellekten gelir. Supabase istekleri her zaman ağdan gider.
const SURUM = 'ev-butcem-v18';
const DOSYALAR = ['./', 'index.html', 'css/app.css', 'js/app.js', 'js/veri.js', 'js/plan-arayuz.js', 'js/kurulum.js', 'js/kategori.js', 'js/geri-bildirim.js', 'js/hesap.js', 'js/hizli.js', 'js/esitle.js', 'js/yz.js', 'js/hareket.js', 'ornek.json', 'manifest.webmanifest', 'icons/ikon.svg', 'icons/ikon-192.png', 'fonts/bricolage-latin.woff2', 'fonts/bricolage-latin-ext.woff2'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SURUM).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  // Yalnızca kendi eski önbelleklerini siler; aynı alan adındaki başka uygulamalara dokunmaz.
  e.waitUntil(caches.keys()
    .then((adlar) => Promise.all(adlar.filter((a) => a.startsWith('ev-butcem-') && a !== SURUM).map((a) => caches.delete(a))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Önce ağ, olmazsa önbellek: güncellemeler hemen gelsin, internet yoksa uygulama yine açılsın.
  e.respondWith(fetch(e.request)
    .then((yanit) => {
      if (yanit.ok) { const kopya = yanit.clone(); caches.open(SURUM).then((c) => c.put(e.request, kopya)); }
      return yanit;
    })
    .catch(() => caches.match(e.request, { ignoreSearch: true })));
});

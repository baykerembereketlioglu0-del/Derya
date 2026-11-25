/* Çevrimdışı çalışma: uygulama dosyaları telefonda önbelleğe alınır.
 * Önce önbellekten açılır, arka planda yeni sürüm varsa indirilir (bir sonraki açılışta görünür).
 * Not: Kullanıcı verileri burada değil, localStorage'da durur; önbellek silinse de kaybolmaz. */
var CACHE = 'derya-v1.1';
var FILES = [
  './', 'index.html', 'app.js', 'style.css', 'fonts.css', 'manifest.webmanifest',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      }).catch(function () { return hit; });
      if (hit) { try { e.waitUntil(net); } catch (err) {} return hit; }
      return net;
    });
  }));
});

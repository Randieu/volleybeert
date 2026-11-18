// Service worker: bewaart de app op het apparaat zodat hij offline werkt.
const CACHE = "volleybeert-v1.1.0";
const ASSETS = [
  "./", "./index.html", "./css/app.css", "./manifest.webmanifest",
  "./js/app.js", "./js/db.js", "./js/state.js", "./js/share.js", "./js/ui.js", "./js/board.js", "./js/bordview.js", "./js/opstelling.js", "./js/team.js", "./js/trainingen.js",
  "./vendor/mammoth.browser.min.js",
  "./fonts/barlow-latin-400-normal.woff2", "./fonts/barlow-latin-500-normal.woff2", "./fonts/barlow-latin-600-normal.woff2",
  "./fonts/barlow-condensed-latin-600-normal.woff2", "./fonts/barlow-condensed-latin-700-normal.woff2",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/apple-touch-icon.png"
];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => (req.mode === "navigate" ? caches.match("./index.html") : undefined))));
});

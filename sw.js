const CACHE_NAME = "quiz-cache-v4";

const urlsToCache = [
  "./",
  "./index.html",
  "./assets/css/style.css",
  "./assets/js/script.js",
  "./assets/js/data.js",
  "./assets/audio/right.mp3",
  "./assets/audio/error.mp3",
  "./assets/audio/remove.mp3",
  "./assets/favicon/favicon.png"
];

// instala e salva cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// intercepta requests
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

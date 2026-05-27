const CACHE_NAME = "pick-the-number-v63";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css",
  "./src/core.js",
  "./app.js?v=58",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./assets/slots/arena.png",
  "./assets/slots/basketball.png",
  "./assets/slots/bonus-free.png",
  "./assets/slots/fire-seven.png",
  "./assets/slots/jackpot-hoop.png",
  "./assets/slots/jersey.png",
  "./assets/slots/ring.png",
  "./assets/slots/scoreboard.png",
  "./assets/slots/sneaker.png",
  "./assets/slots/trophy.png",
  "./assets/slots/whistle.png",
  "./assets/slots/wild.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  if (new URL(request.url).origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(new Request(request, { cache: "reload" }))
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => {
        if (request.mode === "navigate") return caches.match("./index.html");
        return caches.match(request);
      }),
  );
});

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

var CACHE_NAME = 'digital-pager-v3';
var PRECACHE_URLS = [
  '/',
  '/alert.mp3',
  '/favicon.png',
  '/manifest.json',
  '/icon-72x72.png',
  '/icon-96x96.png',
  '/icon-128x128.png',
  '/icon-144x144.png',
  '/icon-152x152.png',
  '/icon-192x192.png',
  '/icon-384x384.png',
  '/icon-512x512.png',
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return initFirebase();
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  var url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(function(response) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseClone);
        });
        return response;
      }).catch(function() {
        return caches.match('/') || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  if (url.pathname.match(/\.(png|jpg|jpeg|svg|mp3|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        if (cached) return cached;
        return fetch(event.request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(function() { return new Response('', { status: 404 }); });
      })
    );
    return;
  }

  if (url.pathname.match(/\.(js|css)$/) || url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(function(cached) {
        var fetchPromise = fetch(event.request).then(function(response) {
          if (response.ok) {
            var responseClone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(function() {
          return cached || new Response('', { status: 404 });
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

var firebaseInitialized = false;

function initFirebase() {
  if (firebaseInitialized) return Promise.resolve();
  return fetch('/api/firebase-config')
    .then(function(r) { return r.json(); })
    .then(function(config) {
      if (config && config.apiKey && config.messagingSenderId) {
        firebase.initializeApp(config);
        var messaging = firebase.messaging();

        messaging.onBackgroundMessage(function(payload) {
          var title = (payload.notification && payload.notification.title) || "طلبك جاهز! 🔔";
          var body = (payload.notification && payload.notification.body) || "Your order is ready!";

          self.registration.showNotification(title, {
            body: body,
            icon: "/icon-192x192.png",
            badge: "/icon-96x96.png",
            vibrate: [500, 200, 500, 200, 800],
            requireInteraction: true,
            tag: "order-ready",
            renotify: true,
            data: payload.data || {},
          });
        });

        firebaseInitialized = true;
      }
    })
    .catch(function() {});
}

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

self.addEventListener('push', function(event) {
  if (firebaseInitialized) return;
  if (!event.data) return;
  try {
    var payload = event.data.json();
    var title = (payload.notification && payload.notification.title) || "طلبك جاهز! 🔔";
    var body = (payload.notification && payload.notification.body) || "Your order is ready!";

    event.waitUntil(
      self.registration.showNotification(title, {
        body: body,
        icon: "/icon-192x192.png",
        badge: "/icon-96x96.png",
        vibrate: [500, 200, 500, 200, 800],
        requireInteraction: true,
        tag: "order-ready",
        renotify: true,
        data: (payload.data || payload.notification || {}),
      })
    );
  } catch(e) {}
});

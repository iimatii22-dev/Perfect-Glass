// Service Worker for Perfect Glass PWA
const CACHE_NAME = 'perfect-glass-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache addAll warning:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and non-firebase/API requests with network first falling back to cache
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Push notification event listener
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.notification?.title || data.data?.title || data.title || 'Perfect Glass';
    const body = data.notification?.body || data.data?.body || data.body || '';
    const icon = data.notification?.icon || data.data?.icon || '/icon-192.svg';
    const url = data.data?.url || data.url || '/';

    const options = {
      body,
      icon,
      badge: '/icon-192.svg',
      vibrate: [200, 100, 200],
      tag: data.data?.tag || `pg-${Date.now()}`,
      renotify: true,
      data: {
        url,
        turnoId: data.data?.turnoId || data.turnoId,
        fecha: data.data?.fecha || data.fecha,
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    const text = event.data.text();
    event.waitUntil(
      self.registration.showNotification('Perfect Glass', {
        body: text,
        icon: '/icon-192.svg',
        badge: '/icon-192.svg',
        data: { url: '/' },
      })
    );
  }
});

// Notification click event listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate && urlToOpen) {
            client.navigate(urlToOpen);
          }
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            data: event.notification.data,
          });
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


// Firebase Cloud Messaging Service Worker for Gestion Servicios PWA
// Provides background push notifications for Vidriero & Clientes

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const urlParams = new URLSearchParams(self.location.search);
const apiKey = urlParams.get('apiKey') || "";
const authDomain = urlParams.get('authDomain') || "gestion-servicios-uy.firebaseapp.com";
const projectId = urlParams.get('projectId') || "gestion-servicios-uy";
const storageBucket = urlParams.get('storageBucket') || "gestion-servicios-uy.firebasestorage.app";
const messagingSenderId = urlParams.get('messagingSenderId') || "405657363471";
const appId = urlParams.get('appId') || "1:405657363471:web:41c81daad92c312340ef7a";

firebase.initializeApp({
  apiKey,
  authDomain,
  projectId,
  storageBucket,
  messagingSenderId,
  appId,
});

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[firebase-messaging-sw.js] Messaging init warning:', e);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background push payload received:', payload);
    const notificationTitle = payload.notification?.title || payload.data?.title || 'Perfect Glass';
    const notificationOptions = {
      body: payload.notification?.body || payload.data?.body || 'Nueva actualización de turno.',
      icon: payload.notification?.icon || '/icon-192.svg',
      badge: '/icon-192.svg',
      tag: payload.data?.tag || `perfect-glass-${Date.now()}`,
      renotify: true,
      vibrate: [200, 100, 200],
      data: payload.data || { url: '/' },
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Fallback direct Push event listener
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

// Notification Click Handler: Opens or navigates to the specific view
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus and navigate it
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate && urlToOpen) {
            client.navigate(urlToOpen);
          }
          // Post message to client window for active tab or state update
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            url: urlToOpen,
            data: event.notification.data,
          });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

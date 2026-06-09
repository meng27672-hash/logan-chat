// Service Worker for John Logan Chat
// Enables PWA install + Web Push notifications
// v6: Robust install — only precache critical files, meme files cached on-demand

const CACHE_NAME = 'logan-chat-v7';
const BASE = '/logan-chat/';

// Only precache the absolute minimum needed for PWA install + offline shell
const CRITICAL_ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'manifest.webmanifest',
  BASE + 'icon-192.png',
  BASE + 'icon-512.png',
];

// Install — precache only critical files (failures here would block PWA install)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        CRITICAL_ASSETS.map((url) =>
          fetch(url, { cache: 'no-cache' }).then((resp) => {
            if (resp.ok) return cache.put(url, resp);
            console.warn('SW: Failed to precache', url, resp.status);
          }).catch((err) => {
            console.warn('SW: Failed to fetch', url, err.message);
          })
        )
      );
    }).then(() => {
      // Only skip waiting AFTER critical assets are cached
      return self.skipWaiting();
    })
  );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network First, cache fallback
// This ensures PWA always gets the latest version, but works offline too
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Don't cache API calls
  if (event.request.url.includes('api.') || event.request.url.includes('supabase')) return fetch(event.request);
  
  event.respondWith(
    fetch(event.request).then((response) => {
      // Network succeeded — update cache for offline fallback
      if (response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
      }
      return response;
    }).catch(() => {
      // Network failed — serve from cache
      return caches.match(event.request);
    })
  );
});

// Push notification - receive from server
self.addEventListener('push', (event) => {
  let data = { title: 'John Logan', body: 'New message from Logan...' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    data.body = event.data ? event.data.text() : data.body;
  }

  const options = {
    body: data.body,
    icon: BASE + 'icon-192.png',
    badge: BASE + 'icon-192.png',
    tag: data.tag || 'logan-reply',
    vibrate: [200, 100, 200],
    data: { url: data.url || BASE },
    requireInteraction: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click - focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || BASE;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('logan-chat') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

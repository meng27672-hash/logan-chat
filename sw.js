// Service Worker for John Logan Chat
// Enables PWA install + push notification support

const CACHE_NAME = 'logan-chat-v3';
const BASE = '/logan-chat/';

const ASSETS = [
  BASE,
  BASE + 'manifest.json',
  BASE + 'icon.svg',
  BASE + 'memes/laughing_leo.jpg',
  BASE + 'memes/smug_wonka.jpg',
  BASE + 'memes/shocked_guy.jpg',
  BASE + 'memes/cry_cat.jpg',
  BASE + 'memes/disgusted_homelander.jpg',
  BASE + 'memes/bald_guy_stare.jpg',
  BASE + 'memes/surprised_pikachu.png',
  BASE + 'memes/distracted_boyfriend.jpg',
  BASE + 'memes/expanding_brain.jpg',
  BASE + 'memes/roll_safe.jpg',
  BASE + 'memes/this_is_fine.jpg',
  BASE + 'memes/change_my_mind.jpg',
  BASE + 'memes/crying_jordan.jpg',
  BASE + 'memes/disaster_girl.png',
  BASE + 'memes/shrug.jpg',
  BASE + 'memes/girl_explaining.jpg',
  BASE + 'memes/pointing_rick.jpg',
  BASE + 'memes/kermit_tea.jpg',
  BASE + 'memes/scumbag_steve.jpg',
  BASE + 'memes/staring_guy.jpg',
  BASE + 'memes/elmo_coke.jpg',
  BASE + 'memes/mother_ignoring.jpg',
];

// Install - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log('SW: Cache addAll partial failure:', err);
      });
    })
  );
  self.skipWaiting();
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

// Fetch - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Don't cache API calls
  if (event.request.url.includes('api.')) return fetch(event.request);
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      });
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
    icon: BASE + 'icon.svg',
    badge: BASE + 'icon.svg',
    tag: 'logan-reply',
    vibrate: [200, 100, 200],
    data: { url: BASE },
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

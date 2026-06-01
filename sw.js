// Service Worker for John Logan Chat
// Enables PWA install + push notification support

const CACHE_NAME = 'logan-chat-v2';
const ASSETS = [
  './standalone.html',
  './manifest.json',
  './memes/laughing_leo.jpg',
  './memes/smug_wonka.jpg',
  './memes/shocked_guy.jpg',
  './memes/cry_cat.jpg',
  './memes/disgusted_homelander.jpg',
  './memes/bald_guy_stare.jpg',
  './memes/surprised_pikachu.png',
  './memes/distracted_boyfriend.jpg',
  './memes/expanding_brain.jpg',
  './memes/roll_safe.jpg',
  './memes/this_is_fine.jpg',
  './memes/change_my_mind.jpg',
  './memes/crying_jordan.jpg',
  './memes/disaster_girl.png',
  './memes/shrug.jpg',
  './memes/girl_explaining.jpg',
  './memes/pointing_rick.jpg',
  './memes/kermit_tea.jpg',
  './memes/scumbag_steve.jpg',
  './memes/staring_guy.jpg',
  './memes/elmo_coke.jpg',
  './memes/mother_ignoring.jpg',
];

// Install - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => {
        console.log('SW: Cache addAll partial failure (some assets may be offline):', err);
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
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // Cache new successful responses
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
    icon: './memes/surprised_pikachu.png',
    badge: './memes/surprised_pikachu.png',
    tag: 'logan-reply',
    vibrate: [200, 100, 200],
    data: { url: './standalone.html' },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click - focus/open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || './standalone.html';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('standalone.html') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

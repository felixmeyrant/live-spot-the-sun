// ==========================================
// SPOT THE SUN - Service Worker
// ==========================================

const CACHE_NAME = 'spot-the-sun-v4';
const OFFLINE_URL = '/offline.html';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/bars_paris.json',
  '/manifest.json',
  'https://cdn.tailwindcss.com'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('☀️ Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('☀️ Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS.filter(url => !url.startsWith('http')));
      })
      .then(() => {
        console.log('☀️ Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('☀️ Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('☀️ Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('☀️ Service Worker: Deleting old cache', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('☀️ Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Google Maps API requests (need fresh data)
  if (url.hostname.includes('google') || url.hostname.includes('googleapis')) {
    return;
  }
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          console.log('☀️ Service Worker: Serving from cache', url.pathname);
          return cachedResponse;
        }
        
        // Fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse.ok) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseClone);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('☀️ Service Worker: Fetch failed', error);
            
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            
            throw error;
          });
      })
  );
});

// Background sync for check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    console.log('☀️ Service Worker: Syncing check-ins');
    // Could sync pending check-ins to a server here
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'Une terrasse ensoleillée vous attend !',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23fbbf24" width="192" height="192" rx="32"/><text x="96" y="130" text-anchor="middle" font-size="120">☀️</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect fill="%23fbbf24" width="96" height="96" rx="16"/><text x="48" y="70" text-anchor="middle" font-size="60">☀️</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'explore', title: 'Voir les terrasses', icon: '☀️' },
      { action: 'close', title: 'Fermer', icon: '✖️' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Spot The Sun ☀️', options)
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/?filter=sunny')
    );
  }
});

console.log('☀️ Service Worker: Script loaded');

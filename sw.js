// Modern Service Worker with Workbox-style patterns
const CACHE_VERSION = '2.0.0';
const STATIC_CACHE = `pwa-kit-static-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `pwa-kit-runtime-v${CACHE_VERSION}`;
const PRECACHE_MANIFEST = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/connectivity.js',
  '/manifest.webmanifest',
  '/offline.html',
  '/img/icons-192.png',
  '/img/icons-512.png',
  '/img/icons-512-maskable.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap'
];

// Install event - precache critical resources
self.addEventListener('install', event => {
  console.log('Service Worker: Installing v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.addAll(PRECACHE_MANIFEST.map(url => new Request(url, { cache: 'no-cache' })));
        console.log('Service Worker: Precaching completed');
        await self.skipWaiting();
      } catch (error) {
        console.error('Service Worker: Precaching failed', error);
        throw error;
      }
    })()
  );
});

// Activate event - cleanup and take control
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating v' + CACHE_VERSION);
  
  event.waitUntil(
    (async () => {
      try {
        // Clean up old caches
        const cacheNames = await caches.keys();
        const oldCaches = cacheNames.filter(name => 
          name.startsWith('pwa-kit-') && 
          !name.includes(CACHE_VERSION)
        );
        
        await Promise.all(oldCaches.map(name => caches.delete(name)));
        
        // Take control of all clients
        await self.clients.claim();
        
        // Update all clients
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
          client.postMessage({ 
            type: 'SW_UPDATED',
            version: CACHE_VERSION 
          });
        });
        
        console.log(`Service Worker: Activated, managing ${clients.length} clients`);
      } catch (error) {
        console.error('Service Worker: Activation failed', error);
      }
    })()
  );
});

// Fetch event with modern routing
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests and extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Route requests to appropriate handlers
  if (PRECACHE_MANIFEST.includes(url.pathname) || url.pathname === '/') {
    event.respondWith(cacheFirstStrategy(request));
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidateStrategy(request));
  } else if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2)$/)) {
    event.respondWith(cacheFirstStrategy(request));
  } else {
    event.respondWith(networkFirstWithFallback(request));
  }
});

// Modern caching strategies
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache-first strategy failed:', error);
    return await caches.match('/offline.html') || new Response('Offline');
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetchWithTimeout(request, 3000);
    if (networkResponse.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then(networkResponse => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || await fetchPromise;
}

async function networkFirstWithFallback(request) {
  try {
    return await networkFirstStrategy(request);
  } catch (error) {
    // Fallback to offline page for navigation requests
    if (request.mode === 'navigate') {
      return await caches.match('/offline.html');
    }
    throw error;
  }
}

// Helper function for fetch with timeout
function fetchWithTimeout(request, timeout = 5000) {
  return Promise.race([
    fetch(request),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Fetch timeout')), timeout)
    )
  ]);
}

// Background Sync for offline actions
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync triggered');
  
  if (event.tag === 'connectivity-check') {
    event.waitUntil(performConnectivityCheck());
  }
});

async function performConnectivityCheck() {
  try {
    const response = await fetch('/api/connectivity-check', {
      method: 'POST',
      body: JSON.stringify({ timestamp: Date.now() })
    });
    
    if (response.ok) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'CONNECTIVITY_RESTORED' });
      });
    }
  } catch (error) {
    console.log('Background connectivity check failed:', error);
  }
}

// Push notifications
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/img/icons-192.png',
    badge: '/img/badge-72.png',
    vibrate: [100, 50, 100],
    data: event.data ? JSON.parse(event.data.text()) : {},
    actions: [
      { action: 'view', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('PWA Kit', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Share target handling
self.addEventListener('fetch', event => {
  if (event.request.method === 'POST' && event.request.url.endsWith('/share-target/')) {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const title = formData.get('title') || '';
  const text = formData.get('text') || '';
  const url = formData.get('url') || '';
  
  // Store shared data
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put('/shared-data', new Response(JSON.stringify({ title, text, url })));
  
  return Response.redirect('/?shared=true', 303);
}

// Periodic Background Sync
self.addEventListener('periodicsync', event => {
  if (event.tag === 'content-sync') {
    event.waitUntil(periodicSync());
  }
});

async function periodicSync() {
  console.log('Performing periodic background sync');
  // Implement your periodic sync logic here
}
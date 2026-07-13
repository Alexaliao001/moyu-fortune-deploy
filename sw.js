// Service Worker for MoYu Fortune PWA
// v6 - navigate network-first (avoid stale index after FE deploy)

const CACHE_NAME = 'moyu-fortune-v6';
const STATIC_CACHE = 'moyu-fortune-static-v6';
const DYNAMIC_CACHE = 'moyu-fortune-dynamic-v6';
const CDN_CACHE = 'moyu-fortune-cdn-v6';

// CDN缓存限制
const CDN_CACHE_MAX_ITEMS = 100;
const DYNAMIC_CACHE_MAX_ITEMS = 50;

// 静态资源 - 预缓存
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/apple-touch-icon.png'
];

// 关键 CDN 资源 - 预缓存（铜钱正面图片，首屏关键资源）
const CRITICAL_CDN_ASSETS = [
  '/assets/moyu/yDgdvSFbrknFvFrI.webp',
];

// CDN域名列表 - 需要缓存的外部资源
const CDN_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];

// 需要缓存的动态资源模式
const CACHEABLE_PATTERNS = [
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.webp$/,
  /\.svg$/,
  /\.gif$/,
  /\.ico$/,
  /\.mp3$/,
  /\.wav$/,
];

// Install event - 预缓存静态资源
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v6');
  
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE)
        .then((cache) => {
          console.log('[SW] Pre-caching static assets');
          return cache.addAll(STATIC_ASSETS);
        })
        .catch((error) => {
          console.log('[SW] Static pre-cache failed:', error);
        }),
      // 预缓存关键 CDN 资源（铜钱图片）
      caches.open(CDN_CACHE)
        .then((cache) => {
          console.log('[SW] Pre-caching critical CDN assets');
          return Promise.all(
            CRITICAL_CDN_ASSETS.map(url =>
              fetch(url, { mode: 'cors' })
                .then(response => {
                  if (response.ok) cache.put(url, response);
                })
                .catch(() => console.log('[SW] CDN pre-cache skip:', url))
            )
          );
        })
        .catch((error) => {
          console.log('[SW] CDN pre-cache failed:', error);
        }),
    ])
  );
  
  // 立即激活
  self.skipWaiting();
});

// Activate event - 清理旧缓存
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v6');
  
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, CDN_CACHE, CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!currentCaches.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // 立即接管所有页面
  self.clients.claim();
});

// 判断是否为CDN资源
function isCDNResource(url) {
  const urlObj = new URL(url);
  return CDN_HOSTS.some(host => urlObj.hostname.includes(host));
}

// 判断是否为可缓存的资源
function isCacheable(url) {
  const urlObj = new URL(url);
  
  // 跳过 API 请求
  if (urlObj.pathname.startsWith('/api/')) {
    return false;
  }
  
  // 跳过 OAuth 相关
  if (urlObj.pathname.includes('oauth') || urlObj.pathname.includes('auth')) {
    return false;
  }
  
  // Assets only — HTML/navigate uses network-first below (P1.5).
  return CACHEABLE_PATTERNS.some(pattern => pattern.test(urlObj.pathname));
}

// Fetch event - 智能缓存策略
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 只处理 GET 请求
  if (request.method !== 'GET') {
    return;
  }
  
  // CDN资源 - 缓存优先，长期缓存（图片、字体等）
  if (isCDNResource(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 从网络获取并缓存
          return fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(CDN_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                    trimCache(CDN_CACHE, CDN_CACHE_MAX_ITEMS);
                  });
              }
              return networkResponse;
            })
            .catch(() => {
              // CDN不可用时返回空响应
              return new Response('', { status: 503 });
            });
        })
    );
    return;
  }
  
  // 跳过非同源请求（CDN已在上面处理）
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // API 请求 - 网络优先，失败时返回离线提示
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return new Response(
            JSON.stringify({ 
              error: 'offline',
              message: 'You are currently offline. Please check your connection.',
              offline: true 
            }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // 导航 / HTML — 网络优先，失败再回缓存（避免部署后仍吃旧 index）
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/') || caches.match('/index.html'))
        )
    );
    return;
  }
  
  // 静态资源 - Stale-While-Revalidate（缓存优先，后台更新）
  if (isCacheable(request.url)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          // 后台更新缓存
          const fetchPromise = fetch(request)
            .then((networkResponse) => {
              if (networkResponse.ok) {
                const responseClone = networkResponse.clone();
                caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, responseClone);
                    trimCache(DYNAMIC_CACHE, DYNAMIC_CACHE_MAX_ITEMS);
                  });
              }
              return networkResponse;
            })
            .catch(() => null);
          
          // 有缓存立即返回，没有则等网络
          if (cachedResponse) {
            event.waitUntil(fetchPromise);
            return cachedResponse;
          }
          
          return fetchPromise.then((response) => {
            if (response) return response;
            // 导航请求返回首页
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }
  
  // 其他请求 - 网络优先
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && isCacheable(request.url)) {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE)
            .then((cache) => cache.put(request, responseClone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (request.mode === 'navigate') {
              return caches.match('/');
            }
          });
      })
  );
});

// 监听来自页面的消息
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // 清除所有缓存
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// 后台同步 - 当网络恢复时同步数据
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-fortune-records') {
    console.log('[SW] Syncing fortune records');
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SYNC_RECORDS' });
      });
    });
  }
});

// 推送通知
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '今天的摸鱼运势已更新！',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || '摸了么', options)
    );
  }
});

// 点击通知
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

// 缓存大小限制 - 删除最旧的条目
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
    console.log(`[SW] Trimmed ${deleteCount} items from ${cacheName}`);
  }
}

console.log('[SW] Service Worker v6 loaded');

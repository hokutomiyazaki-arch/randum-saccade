// Service Worker for Random Saccade PWA
const CACHE_NAME = 'random-saccade-v1.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://hokutomiyazaki-arch.github.io/randum-saccade/FNT512.png',
  'https://hokutomiyazaki-arch.github.io/randum-saccade/FNT512-transparent.png'
];

// インストール時のキャッシュ
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Cache install failed:', error);
      })
  );
  // 即座にアクティベート
  self.skipWaiting();
});

// アクティベート時の古いキャッシュ削除
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // すぐにコントロールを取得
  self.clients.claim();
});

// フェッチイベントの処理
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // キャッシュがあればキャッシュから返す
        if (response) {
          return response;
        }
        
        // キャッシュになければネットワークから取得
        return fetch(event.request).then(response => {
          // 正常なレスポンスでない場合はそのまま返す
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // レスポンスをクローンしてキャッシュに保存
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
      .catch(error => {
        console.error('Fetch failed:', error);
        // オフライン時のフォールバック
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// バックグラウンド同期（オプション）
self.addEventListener('sync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

// キャッシュ更新関数
async function updateCache() {
  const cache = await caches.open(CACHE_NAME);
  const requests = await cache.keys();
  
  const updatePromises = requests.map(async request => {
    try {
      const response = await fetch(request);
      if (response && response.status === 200) {
        await cache.put(request, response);
      }
    } catch (error) {
      console.error('Cache update failed for:', request.url);
    }
  });
  
  return Promise.all(updatePromises);
}

// プッシュ通知（将来の拡張用）
self.addEventListener('push', event => {
  const options = {
    body: event.data ? event.data.text() : 'トレーニングの時間です！',
    icon: 'https://hokutomiyazaki-arch.github.io/randum-saccade/FNT512.png',
    badge: 'https://hokutomiyazaki-arch.github.io/randum-saccade/FNT512.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('ランダムサッカード', options)
  );
});

// 通知クリック処理
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});

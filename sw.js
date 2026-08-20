// Service Worker for ランダムサッカード認知トレーニング
const CACHE_NAME = 'random-saccade-v1.1.1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './FNT512.png',
    './FNT512-transparent.png'
];

// インストール時にキャッシュを作成
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching app shell');
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('[SW] Install complete');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Cache failed:', err);
            })
    );
});

// アクティベート時に古いキャッシュを削除
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== CACHE_NAME)
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// フェッチリクエストの処理（キャッシュファースト戦略）
self.addEventListener('fetch', (event) => {
    // ナビゲーションリクエストの場合
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html')
                .then((response) => {
                    return response || fetch(event.request)
                        .catch(() => caches.match('./index.html'));
                })
        );
        return;
    }
    
    // その他のリクエスト
    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // キャッシュがあれば返す
                if (cachedResponse) {
                    // バックグラウンドで更新をチェック
                    fetch(event.request)
                        .then((networkResponse) => {
                            if (networkResponse && networkResponse.ok) {
                                caches.open(CACHE_NAME)
                                    .then((cache) => {
                                        cache.put(event.request, networkResponse);
                                    });
                            }
                        })
                        .catch(() => {});
                    
                    return cachedResponse;
                }
                
                // キャッシュになければネットワークから取得
                return fetch(event.request)
                    .then((networkResponse) => {
                        // 有効なレスポンスならキャッシュに保存
                        if (networkResponse && networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then((cache) => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return networkResponse;
                    })
                    .catch(() => {
                        // オフラインでキャッシュもない場合
                        console.log('[SW] Fetch failed, returning offline fallback');
                        return new Response('Offline', {
                            status: 503,
                            statusText: 'Service Unavailable'
                        });
                    });
            })
    );
});

// プッシュ通知（将来的な拡張用）
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'トレーニングの時間です！',
        icon: './FNT512.png',
        badge: './FNT512.png',
        vibrate: [100, 50, 100],
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
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('./')
    );
});

// バックグラウンド同期（将来的な拡張用）
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-training-data') {
        console.log('[SW] Syncing training data...');
    }
});

// メッセージ受信（キャッシュクリア等）
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('[SW] Cache cleared');
        });
    }
});

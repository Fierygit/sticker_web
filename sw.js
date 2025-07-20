const CACHE_NAME = 'stickers-cache-v1';
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7天

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    // 只缓存图片和视频文件
    if (url.pathname.startsWith('/stickers/')) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    if (response) {
                        // 检查缓存是否过期
                        const cachedTime = response.headers.get('sw-cached-time');
                        if (cachedTime && Date.now() - parseInt(cachedTime) < CACHE_DURATION) {
                            return response;
                        }
                    }
                    
                    // 从网络获取
                    return fetch(event.request).then(networkResponse => {
                        if (networkResponse.ok) {
                            const responseClone = networkResponse.clone();
                            const headers = new Headers(responseClone.headers);
                            headers.set('sw-cached-time', Date.now().toString());
                            
                            const modifiedResponse = new Response(responseClone.body, {
                                status: responseClone.status,
                                statusText: responseClone.statusText,
                                headers: headers
                            });
                            
                            cache.put(event.request, modifiedResponse);
                        }
                        return networkResponse;
                    });
                });
            })
        );
    }
});
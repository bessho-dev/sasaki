const CACHE_NAME = 'sasaki-cache-v1';
const FONT_BASE = 'https://bessho-dev.github.io/sasaki/font/';

// キャッシュしたいリソース
const URLS_TO_CACHE = [
    './',
    './index.html',
    // ここにフォントURLを明示的に指定
    FONT_BASE + 'ZenKurenaido-Regular.ttf',
    FONT_BASE + 'Yomogi-Regular.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(URLS_TO_CACHE);
        })
    );
});

self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);

    // フォントファイルへのリクエストの場合
    if (requestUrl.href.startsWith(FONT_BASE)) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache => {
                return cache.match(event.request).then(response => {
                    // キャッシュにあればそれを返す（超高速）
                    if (response) return response;

                    // なければネットワークから取得してキャッシュに入れる
                    return fetch(event.request).then(networkResponse => {
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
        );
        return; // ここで処理終了
    }

    // その他のリクエスト (Cache First Strategy)
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

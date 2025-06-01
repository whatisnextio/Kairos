import { precacheAndRoute } from &#39;workbox-precaching&#39;;
import { registerRoute } from &#39;workbox-routing&#39;;
import { StaleWhileRevalidate, CacheFirst, NetworkFirst } from &#39;workbox-strategies&#39;;
import { ExpirationPlugin } from &#39;workbox-expiration&#39;;

precacheAndRoute(self.\_\_WB\_MANIFEST || []);

registerRoute(
({url}) =\> url.origin === 'https://fonts.googleapis.com',
new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' })
);

registerRoute(
({url}) =\> url.origin === 'https://fonts.gstatic.com',
new CacheFirst({
cacheName: 'google-fonts-webfonts',
plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 \* 60 \* 24 \* 365, maxEntries: 30 })],
})
);

registerRoute(
({request}) =\> request.destination === 'script' ||
request.destination === 'style' ||
request.destination === 'font' ||
request.destination === 'image',
new StaleWhileRevalidate({
cacheName: 'static-resources',
plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 \* 24 \* 60 \* 60 })],
})
);

// Cache Stripe.js
registerRoute(
({url}) =\> url.origin === 'https://js.stripe.com',
new CacheFirst({
cacheName: 'stripe-js',
plugins: [
new ExpirationPlugin({
maxAgeSeconds: 60 \* 60 \* 24 \* 7, // Cache for a week
maxEntries: 1,
}),
],
})
);

self.addEventListener('message', (event) =\> {
if (event.data && event.data.type === 'SKIP\_WAITING') {
self.skipWaiting();
}
});

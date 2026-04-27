import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
// biome-ignore lint/suspicious/noExplicitAny: Workbox injects __WB_MANIFEST at build time; type is not exported
precacheAndRoute((self as any).__WB_MANIFEST);

registerRoute(
  /^https:\/\/fonts\.googleapis\.com\/.*/i,
  new StaleWhileRevalidate({ cacheName: 'google-fonts-stylesheets' }),
);

registerRoute(
  /^https:\/\/fonts\.gstatic\.com\/.*/i,
  new CacheFirst({
    cacheName: 'google-fonts-webfonts',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 30 })],
  }),
);

registerRoute(
  /^https:\/\/js\.stripe\.com\/.*/i,
  new CacheFirst({
    cacheName: 'stripe-js',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 7, maxEntries: 1 })],
  }),
);

self.addEventListener('push', (event: PushEvent) => {
  let title = '12K';
  let body = 'Time to check in.';

  if (event.data) {
    try {
      const data = event.data.json() as { title?: string; body?: string };
      if (data.title) title = data.title;
      if (data.body) body = data.body;
    } catch {
      // malformed payload, use defaults
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'daily-nudge',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return (client as WindowClient).focus();
      }
      return self.clients.openWindow('/#/');
    }),
  );
});

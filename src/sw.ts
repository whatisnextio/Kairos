import { clientsClaim } from 'workbox-core';
import { ExpirationPlugin } from 'workbox-expiration';
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
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

self.addEventListener('push', (event: PushEvent) => {
  let title = '12K';
  let body = 'Time to check in.';
  let url = '/#/';

  if (event.data) {
    try {
      const data = event.data.json() as { title?: string; body?: string; url?: string };
      if (data.title) title = data.title;
      if (data.body) body = data.body;
      if (data.url) url = data.url;
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
      data: { url },
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const rawUrl =
    typeof event.notification.data === 'object' &&
    event.notification.data &&
    'url' in event.notification.data
      ? String(event.notification.data.url)
      : '/#/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            const windowClient = client as WindowClient;
            if ('navigate' in windowClient && windowClient.url !== targetUrl) {
              await windowClient.navigate(targetUrl);
            }
            return windowClient.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});

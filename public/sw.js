/* Lenzo Party Live — Production Web Push & Notification Service Worker */

const APP_ICON = '/app-icon.png';
const APP_BADGE = '/app-icon.png';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    const rawText = event.data ? event.data.text() : '';
    data = {
      title: 'Lenzo Party Live',
      body: rawText || 'You have a new notification',
    };
  }

  const title = typeof data.title === 'string' && data.title.trim() ? data.title.trim() : 'Lenzo Party Live';
  const body = typeof data.body === 'string' && data.body.trim()
    ? data.body.trim()
    : (typeof data.message === 'string' ? data.message : 'New activity on Lenzo Party Live');
  const icon = typeof data.icon === 'string' && data.icon.trim() ? data.icon : APP_ICON;
  const tag = typeof data.tag === 'string' && data.tag.trim()
    ? data.tag
    : `lenzo-${data.type || 'general'}-${data.id || Date.now()}`;

  const notificationOptions = {
    body,
    icon,
    badge: APP_BADGE,
    tag,
    renotify: true,
    vibrate: data.priority === 'urgent' ? [180, 80, 180, 80, 180] : [100, 50, 100],
    requireInteraction: data.priority === 'urgent' || data.priority === 'high',
    timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
    data: {
      id: data.id || '',
      type: data.type || 'system',
      actionType: data.actionType || 'open_notifications',
      targetId: data.targetId || '',
      actionUrl: data.actionUrl || '/',
      senderId: data.senderId || '',
    },
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const payload = event.notification.data || {};
  const actionType = payload.actionType || 'open_notifications';
  const targetId = payload.targetId || '';
  const query = `?pushAction=${encodeURIComponent(actionType)}${targetId ? `&targetId=${encodeURIComponent(targetId)}` : ''}`;
  const targetUrl = new URL(query, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({
            type: 'LENZO_PUSH_NOTIFICATION_CLICK',
            payload,
          });
          return;
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

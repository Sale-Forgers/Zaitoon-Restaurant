/*
 * Zaitoon service worker.
 * Its only job is notifications: it receives Web Push messages from the
 * restaurant's own server (VAPID, no third-party notification service) and
 * shows them, even when the menu page is closed or the phone is locked.
 */

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Zaitoon Family Restaurant", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Zaitoon Family Restaurant";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-96.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    vibrate: [120, 60, 120],
    timestamp: Date.now(),
    data: { url: data.url || "/menu", kind: data.kind || "" },
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Open pages refresh instantly and can show the message in-app too.
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: "zr-push", payload: data });
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || "/menu", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          await client.focus();
          if (client.url !== target && "navigate" in client) await client.navigate(target);
          return;
        } catch {
          /* fall through to opening a new window */
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

// The browser rotated the subscription: tell open pages to re-register it.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) client.postMessage({ type: "zr-resubscribe" });
    })(),
  );
});

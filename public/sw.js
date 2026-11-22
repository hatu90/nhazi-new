/* Nhazi service worker: shows pushed notifications (FCM data messages) and opens the right page on click. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { data: { body: event.data ? event.data.text() : "" } };
  }
  // FCM wraps our data map as { data: {...} }; accept a bare map too.
  const d = payload.data || payload;
  event.waitUntil(
    self.registration.showNotification(d.title || "Nhazi", {
      body: d.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: d.notificationId || undefined,
      data: { url: d.url || "/dashboard" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const open = clients.find((c) => c.url.startsWith(self.location.origin));
      if (open) {
        await open.focus();
        if ("navigate" in open) return open.navigate(url);
      }
      return self.clients.openWindow(url);
    }),
  );
});

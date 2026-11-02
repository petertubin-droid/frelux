// =========================================================
// FRELUX: Web Push service worker (workflow notifications)
//
// Minimal, single-purpose: show notifications pushed by the
// workflow-push edge function and focus/open the dashboard when
// they are clicked. Registered ONLY by the push subscribe flow
// (src/lib/workflow/push.ts); it does not intercept fetches.
// =========================================================

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = (data && data.title) || "Frelux update";
  const options = {
    body: (data && data.body) || "",
    tag: (data && data.tag) || "frelux-workflow",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: (data && data.url) || "/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});

self.addEventListener("push", event => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(self.registration.showNotification(data.title || "Améns", {
    body: data.body || "Você recebeu uma nova notificação.",
    icon: "/icons/amens-192.png",
    badge: "/icons/amens-notification-96.png",
    data: { url: data.url || "/messages" },
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});

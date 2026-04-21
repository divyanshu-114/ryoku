/**
 * Ryoku Service Worker — handles push notifications.
 * This file lives in /public so browsers can register it at the root scope.
 */

// eslint-disable-next-line no-restricted-globals
self.addEventListener("push", function (event) {
    if (!event.data) return;

    const data = event.data.json();

    const options = {
        body: data.body || "You have a new notification",
        icon: data.icon || "/icon-192.png",
        badge: "/icon-192.png",
        tag: data.tag || "ryoku-notification",
        data: { url: data.url || "/dashboard" },
        vibrate: [200, 100, 200],
        actions: [
            { action: "open", title: "View conversation" },
            { action: "dismiss", title: "Dismiss" },
        ],
    };

    event.waitUntil(
        // eslint-disable-next-line no-restricted-globals
        self.registration.showNotification(data.title || "Ryoku", options)
    );
});

// eslint-disable-next-line no-restricted-globals
self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data?.url || "/dashboard";

    event.waitUntil(
        // eslint-disable-next-line no-restricted-globals, no-undef
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
            // Focus an existing window if open
            for (const client of clientList) {
                if (client.url.includes("/dashboard") && "focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            // eslint-disable-next-line no-undef
            return clients.openWindow(url);
        })
    );
});

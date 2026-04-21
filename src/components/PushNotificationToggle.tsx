"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

/**
 * PushNotificationToggle
 * 
 * Drop-in component that handles:
 * 1. Service worker registration
 * 2. Push permission request
 * 3. Subscription to /api/push/subscribe
 * 4. Toggle on/off
 */
export default function PushNotificationToggle() {
    const [supported, setSupported] = useState(false);
    const [permission, setPermission] = useState<NotificationPermission>("default");
    const [subscribed, setSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    // Check support & current state
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

        setSupported(true);
        setPermission(Notification.permission);

        // Check if already subscribed
        navigator.serviceWorker.ready.then(async (registration) => {
            const sub = await registration.pushManager.getSubscription();
            setSubscribed(!!sub);
        });
    }, []);

    const subscribe = useCallback(async () => {
        setLoading(true);
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            // Request permission
            const perm = await Notification.requestPermission();
            setPermission(perm);
            if (perm !== "granted") {
                setLoading(false);
                return;
            }

            // Subscribe to push
            const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidKey) {
                console.error("[Push] No VAPID public key configured");
                setLoading(false);
                return;
            }

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                applicationServerKey: urlBase64ToUint8Array(vapidKey) as any,
            });

            // Send subscription to server
            const res = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON()),
            });

            if (res.ok) {
                setSubscribed(true);
            }
        } catch (err) {
            console.error("[Push] Subscribe error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const unsubscribe = useCallback(async () => {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                // Notify server
                await fetch("/api/push/subscribe", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });

                await subscription.unsubscribe();
            }
            setSubscribed(false);
        } catch (err) {
            console.error("[Push] Unsubscribe error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    if (!supported) return null;

    const denied = permission === "denied";

    return (
        <button
            onClick={subscribed ? unsubscribe : subscribe}
            disabled={loading || denied}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer disabled:opacity-40 ${
                subscribed
                    ? "bg-[var(--accent-glow)] text-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
            style={!subscribed ? { background: "var(--bg-card)", border: "1px solid var(--border-subtle)" } : {}}
            title={denied ? "Notifications were denied. Enable them in browser settings." : undefined}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : subscribed ? (
                <Bell className="w-3.5 h-3.5" />
            ) : (
                <BellOff className="w-3.5 h-3.5" />
            )}
            {denied
                ? "Notifications blocked"
                : subscribed
                ? "Push notifications on"
                : "Enable push notifications"
            }
        </button>
    );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

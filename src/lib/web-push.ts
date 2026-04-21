/**
 * Web Push notification helper for Ryoku.
 *
 * Uses the Web Push protocol (VAPID) for browser-native push notifications.
 * Generate VAPID keys: npx web-push generate-vapid-keys
 */

import webpush from "web-push";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// Configure VAPID keys
webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "support@ryoku.app"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
    process.env.VAPID_PRIVATE_KEY || ""
);

/**
 * Send a push notification to all subscriptions for a given user.
 * Automatically cleans up expired/invalid subscriptions.
 */
export async function sendPushToUser(
    userId: string,
    payload: {
        title: string;
        body: string;
        url?: string;
        icon?: string;
        tag?: string;
    }
) {
    const subs = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, userId));

    if (subs.length === 0) return { sent: 0, failed: 0 };

    let sent = 0;
    let failed = 0;

    for (const sub of subs) {
        try {
            await webpush.sendNotification(
                {
                    endpoint: sub.endpoint,
                    keys: { p256dh: sub.p256dh, auth: sub.auth },
                },
                JSON.stringify(payload)
            );
            sent++;
        } catch (err) {
            // 410 Gone or 404 = subscription expired, remove it
            const statusCode = (err as { statusCode?: number })?.statusCode;
            if (statusCode === 410 || statusCode === 404) {
                await db
                    .delete(pushSubscriptions)
                    .where(eq(pushSubscriptions.id, sub.id));
            }
            failed++;
        }
    }

    return { sent, failed };
}

/**
 * Send escalation notification to a business owner.
 */
export async function notifyOwnerOfEscalation(
    userId: string,
    businessName: string,
    conversationId: string,
    reason: string
) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ryoku.app";
    return sendPushToUser(userId, {
        title: `🚨 ${businessName}: Customer needs help`,
        body: reason.length > 100 ? reason.slice(0, 97) + "..." : reason,
        url: `${appUrl}/dashboard/conversations/${conversationId}`,
        icon: "/icon-192.png",
        tag: `escalation-${conversationId}`,
    });
}

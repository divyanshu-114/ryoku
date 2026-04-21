import crypto from "crypto";
import { db } from "@/lib/db";
import { webhookEndpoints, returnRequests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export type WebhookEvent =
    | "ryoku.return.requested"
    | "ryoku.return.cancelled"
    | "ryoku.escalation.created"
    | "ryoku.ping";

export interface WebhookPayload {
    event: WebhookEvent;
    id: string;          // event id (returnRequest.id or uuid)
    businessId: string;
    timestamp: number;   // unix seconds
    data: Record<string, unknown>;
    callbackUrl?: string; // so business knows where to call back
}

/**
 * Sign a webhook payload the same way Stripe does:
 *   HMAC_SHA256(secret, `${timestamp}.${body}`)
 */
export function signPayload(secret: string, timestamp: number, body: string): string {
    const signed = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${body}`)
        .digest("hex");
    return `sha256=${signed}`;
}

/**
 * Verify an inbound callback signature from the business.
 * Returns true if valid.
 */
export function verifySignature(
    secret: string,
    timestamp: string | null,
    signature: string | null,
    body: string
): boolean {
    if (!timestamp || !signature) return false;

    // Reject stale timestamps (>5 minutes)
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

    const expected = signPayload(secret, ts, body);
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expected)
        );
    } catch {
        return false;
    }
}

interface DeliveryResult {
    success: boolean;
    statusCode?: number;
    error?: string;
    attempts: number;
}

/**
 * Deliver an outbound webhook to all active registered endpoints for this business.
 * Tries up to 3 times with exponential backoff (500ms, 1s, 2s).
 * On success, updates returnRequest.webhookDelivered if a returnId is provided.
 */
export async function deliverWebhook(
    businessId: string,
    event: WebhookEvent,
    data: Record<string, unknown>,
    returnId?: string
): Promise<DeliveryResult[]> {
    // Get active endpoints subscribed to this event
    const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(and(
            eq(webhookEndpoints.businessId, businessId),
            eq(webhookEndpoints.active, true)
        ));

    if (endpoints.length === 0) {
        return [{ success: false, error: "No active webhook endpoints registered", attempts: 0 }];
    }

    const eventId = returnId || crypto.randomUUID();
    const ts = Math.floor(Date.now() / 1000);

    const payload: WebhookPayload = {
        event,
        id: eventId,
        businessId,
        timestamp: ts,
        data,
        ...(returnId && {
            callbackUrl: `${process.env.NEXTAUTH_URL}/api/returns/${returnId}/callback`,
        }),
    };

    const body = JSON.stringify(payload);

    const results: DeliveryResult[] = await Promise.all(
        endpoints.map(async (endpoint) => {
            // Filter by events list
            const subscribedEvents = (endpoint.events as string[]) ?? ["*"];
            if (!subscribedEvents.includes("*") && !subscribedEvents.includes(event)) {
                return { success: true, error: "Skipped (not subscribed)", attempts: 0 };
            }

            const signature = signPayload(endpoint.signingSecret, ts, body);
            let lastError = "";
            let lastStatus = 0;

            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const res = await fetch(endpoint.url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Ryoku-Signature": signature,
                            "X-Ryoku-Timestamp": String(ts),
                            "X-Ryoku-Business-Id": businessId,
                            "X-Ryoku-Event": event,
                            "User-Agent": "Ryoku-Webhook/1.0",
                        },
                        body,
                        signal: AbortSignal.timeout(10000), // 10s timeout
                    });

                    lastStatus = res.status;

                    if (res.ok) {
                        // Mark return request as delivered
                        if (returnId) {
                            await db
                                .update(returnRequests)
                                .set({ webhookDelivered: true, webhookDeliveredAt: new Date(), updatedAt: new Date() })
                                .where(eq(returnRequests.id, returnId));
                        }
                        return { success: true, statusCode: res.status, attempts: attempt };
                    }

                    lastError = `HTTP ${res.status}`;
                } catch (err) {
                    lastError = String(err);
                }

                // Exponential backoff: 500ms, 1000ms
                if (attempt < 3) {
                    await new Promise((r) => setTimeout(r, 500 * attempt));
                }
            }

            return { success: false, statusCode: lastStatus, error: lastError, attempts: 3 };
        })
    );

    return results;
}

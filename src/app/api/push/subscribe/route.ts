import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * POST /api/push/subscribe
 * Store a push subscription for the authenticated user.
 *
 * Body: { endpoint: string, keys: { p256dh: string, auth: string } }
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { endpoint, keys } = await req.json();
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
        }

        // Check if this subscription already exists (same endpoint)
        const existing = await db
            .select({ id: pushSubscriptions.id })
            .from(pushSubscriptions)
            .where(and(
                eq(pushSubscriptions.userId, session.user.id),
                eq(pushSubscriptions.endpoint, endpoint)
            ))
            .limit(1);

        if (existing.length > 0) {
            // Update existing subscription (keys may change)
            await db.update(pushSubscriptions)
                .set({ p256dh: keys.p256dh, auth: keys.auth })
                .where(eq(pushSubscriptions.id, existing[0].id));
        } else {
            await db.insert(pushSubscriptions).values({
                userId: session.user.id,
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
            });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push Subscribe]", err);
        return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
    }
}

/**
 * DELETE /api/push/subscribe
 * Remove a push subscription (when user toggles notifications off).
 *
 * Body: { endpoint: string }
 */
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { endpoint } = await req.json();
        if (!endpoint) {
            return NextResponse.json({ error: "endpoint required" }, { status: 400 });
        }

        await db.delete(pushSubscriptions)
            .where(and(
                eq(pushSubscriptions.userId, session.user.id),
                eq(pushSubscriptions.endpoint, endpoint)
            ));

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[Push Unsubscribe]", err);
        return NextResponse.json({ error: "Failed to unsubscribe" }, { status: 500 });
    }
}

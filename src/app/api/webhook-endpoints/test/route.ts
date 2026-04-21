import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { webhookEndpoints, businesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { deliverWebhook } from "@/lib/webhook-sender";
import crypto from "crypto";

// POST /api/webhook-endpoints/test — send a test ping to verify endpoint
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, slug } = await req.json();
    if (!id || !slug) return NextResponse.json({ error: "Missing id or slug" }, { status: 400 });

    const [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id)))
        .limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // Verify endpoint belongs to this business
    const [endpoint] = await db
        .select()
        .from(webhookEndpoints)
        .where(and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.businessId, business.id)))
        .limit(1);

    if (!endpoint) return NextResponse.json({ error: "Endpoint not found" }, { status: 404 });

    // Send test ping
    const results = await deliverWebhook(
        business.id,
        "ryoku.ping",
        {
            message: "This is a test ping from Ryoku",
            endpointId: endpoint.id,
            testId: crypto.randomUUID(),
        }
    );

    // Update lastPingedAt
    await db.update(webhookEndpoints)
        .set({ lastPingedAt: new Date() })
        .where(eq(webhookEndpoints.id, endpoint.id));

    const result = results[0];
    return NextResponse.json({
        success: result?.success ?? false,
        statusCode: result?.statusCode,
        attempts: result?.attempts,
        error: result?.error,
    });
}

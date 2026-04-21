import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, returnRequests, orders, apiKeys } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { deliverWebhook } from "@/lib/webhook-sender";
import crypto from "crypto";

// POST /api/returns — AI tool calls this to create a return request + fire webhook
// Can be called by:
//   1. Authenticated dashboard user (viewing/testing)
//   2. AI agent via API key (most common)
export async function POST(req: Request) {
    const body = await req.json();
    const { slug, orderId, reason, details, customerName, customerEmail, conversationId } = body;

    if (!slug || !orderId || !reason) {
        return NextResponse.json({ error: "Missing slug, orderId, or reason" }, { status: 400 });
    }

    // Auth: check API key header (used by AI tool) OR session (used by dashboard)
    let business = null;

    // Try API key auth first
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
        const rawKey = authHeader.slice(7);
        const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

        const [biz] = await db.select().from(businesses).where(eq(businesses.slug, slug)).limit(1);
        if (biz) {
            const [key] = await db.select().from(apiKeys).where(
                and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.businessId, biz.id), eq(apiKeys.active, true))
            ).limit(1);
            if (key) { business = biz; await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id)); }
        }
    }

    // Fall back to session auth
    if (!business) {
        const session = await auth();
        if (session?.user?.id) {
            const [biz] = await db.select().from(businesses).where(
                and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id))
            ).limit(1);
            if (biz) business = biz;
        }
    }

    if (!business) return NextResponse.json({ error: "Unauthorized or business not found" }, { status: 401 });

    // Verify order actually exists
    const [order] = await db.select().from(orders).where(
        and(eq(orders.businessId, business.id), eq(orders.orderId, orderId))
    ).limit(1);

    if (!order) {
        return NextResponse.json({ error: `Order #${orderId} not found in your system` }, { status: 404 });
    }

    // Create the return request record
    const [returnReq] = await db.insert(returnRequests).values({
        businessId: business.id,
        orderId,
        reason,
        details: details ?? null,
        customerName: customerName ?? order.customerName,
        customerEmail: customerEmail ?? order.customerEmail,
        conversationId: conversationId ?? null,
        status: "pending",
        webhookDelivered: false,
    }).returning();

    // Fire outbound webhook (non-blocking to response)
    deliverWebhook(business.id, "ryoku.return.requested", {
        returnRequestId: returnReq.id,
        orderId,
        reason,
        details,
        customerName: returnReq.customerName,
        customerEmail: returnReq.customerEmail,
        orderItems: order.items,
        orderTotal: order.totalAmount,
        orderedAt: order.createdAt,
    }, returnReq.id);

    return NextResponse.json({
        success: true,
        returnRequestId: returnReq.id,
        status: "pending",
        message: `Return request for order #${orderId} submitted. Your refund will be processed by the business — you'll receive confirmation once done.`,
    }, { status: 201 });
}

// GET /api/returns — list return requests for a business (dashboard)
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    const [business] = await db.select().from(businesses).where(
        and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id))
    ).limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const returns = await db.select().from(returnRequests)
        .where(eq(returnRequests.businessId, business.id))
        .orderBy(desc(returnRequests.createdAt))
        .limit(50);

    return NextResponse.json({ returns });
}

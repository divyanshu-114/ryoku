import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, orders, apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// POST /api/webhook/[slug]/orders — Inbound webhook for order updates
export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    // Authenticate via API key
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Missing API key" }, { status: 401 });
    }

    const rawKey = authHeader.slice(7);
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    // Find business by slug
    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, slug))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Verify API key belongs to this business
    const [key] = await db
        .select()
        .from(apiKeys)
        .where(and(
            eq(apiKeys.keyHash, keyHash),
            eq(apiKeys.businessId, business.id),
            eq(apiKeys.active, true)
        ))
        .limit(1);

    if (!key) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Update last used
    await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, key.id));

    // Parse order data
    const body = await req.json();
    const orderList = Array.isArray(body) ? body : [body];

    const results = await Promise.all(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        orderList.map(async (order: any) => {
            if (!order.orderId) return { error: "Missing orderId", order };

            // Upsert: update if exists, insert if not
            const [existing] = await db
                .select()
                .from(orders)
                .where(and(
                    eq(orders.businessId, business.id),
                    eq(orders.orderId, order.orderId)
                ))
                .limit(1);

            if (existing) {
                // Update existing order
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const updates: Record<string, any> = { updatedAt: new Date() };
                if (order.status) updates.status = order.status;
                if (order.trackingNumber) updates.trackingNumber = order.trackingNumber;
                if (order.items) updates.items = order.items;
                if (order.totalAmount) updates.totalAmount = order.totalAmount;
                if (order.customerEmail) updates.customerEmail = order.customerEmail;
                if (order.customerName) updates.customerName = order.customerName;

                await db
                    .update(orders)
                    .set(updates)
                    .where(eq(orders.id, existing.id));

                return { orderId: order.orderId, action: "updated" };
            } else {
                // Insert new order
                await db.insert(orders).values({
                    businessId: business.id,
                    orderId: order.orderId,
                    customerEmail: order.customerEmail || null,
                    customerName: order.customerName || null,
                    status: order.status || "processing",
                    items: order.items || [],
                    trackingNumber: order.trackingNumber || null,
                    totalAmount: order.totalAmount || null,
                });

                return { orderId: order.orderId, action: "created" };
            }
        })
    );

    return NextResponse.json({
        success: true,
        processed: results.length,
        results,
    });
}

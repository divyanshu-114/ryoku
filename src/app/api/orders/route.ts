import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, businesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/orders — List orders for the authenticated user's business
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    const allOrders = await db
        .select()
        .from(orders)
        .where(eq(orders.businessId, business.id))
        .limit(limit)
        .offset(offset);

    return NextResponse.json({ orders: allOrders, page, limit });
}

// POST /api/orders — Create order(s) manually or via CSV import
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const body = await req.json();

    // Support bulk import (array) or single order
    const orderList = Array.isArray(body.orders) ? body.orders : [body];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertRows = orderList.map((o: any) => ({
        businessId: business.id,
        orderId: o.orderId || `ORD-${Date.now()}`,
        customerEmail: o.customerEmail || o.email || null,
        customerName: o.customerName || o.name || null,
        status: o.status || "processing",
        items: o.items || [],
        trackingNumber: o.trackingNumber || null,
        totalAmount: o.totalAmount || null,
    }));

    await db.insert(orders).values(insertRows);

    return NextResponse.json({
        success: true,
        count: insertRows.length,
        message: `${insertRows.length} order(s) imported.`,
    });
}

// PATCH /api/orders — Update an existing order
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
        return NextResponse.json({ error: "Order `id` required" }, { status: 400 });
    }

    // Only allow updating specific fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowed: Record<string, any> = {};
    if (updates.status) allowed.status = updates.status;
    if (updates.trackingNumber) allowed.trackingNumber = updates.trackingNumber;
    if (updates.items) allowed.items = updates.items;
    if (updates.totalAmount) allowed.totalAmount = updates.totalAmount;
    if (updates.customerEmail) allowed.customerEmail = updates.customerEmail;
    if (updates.customerName) allowed.customerName = updates.customerName;
    allowed.updatedAt = new Date();

    await db
        .update(orders)
        .set(allowed)
        .where(and(eq(orders.id, id), eq(orders.businessId, business.id)));

    return NextResponse.json({ success: true });
}

// DELETE /api/orders — Delete an order
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Order `id` required" }, { status: 400 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    await db
        .delete(orders)
        .where(and(eq(orders.id, parseInt(id)), eq(orders.businessId, business.id)));

    return NextResponse.json({ success: true });
}

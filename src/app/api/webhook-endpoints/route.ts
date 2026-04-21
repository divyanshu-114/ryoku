import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, webhookEndpoints } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// GET /api/webhook-endpoints — list all endpoints for business
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug");
    if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

    const [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id)))
        .limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const endpoints = await db
        .select()
        .from(webhookEndpoints)
        .where(eq(webhookEndpoints.businessId, business.id));

    // Mask signing secret: show only last 6 chars
    const masked = endpoints.map((e) => ({
        ...e,
        signingSecret: "••••••••" + e.signingSecret.slice(-6),
    }));

    return NextResponse.json({ endpoints: masked });
}

// POST /api/webhook-endpoints — register a new endpoint
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { slug, name, url, events } = body;

    if (!slug || !name || !url) {
        return NextResponse.json({ error: "Missing slug, name, or url" }, { status: 400 });
    }

    // Validate URL format
    try { new URL(url); } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id)))
        .limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // Generate a strong signing secret
    const signingSecret = `rsec_${crypto.randomBytes(32).toString("hex")}`;

    const [endpoint] = await db
        .insert(webhookEndpoints)
        .values({
            businessId: business.id,
            name,
            url,
            signingSecret,
            events: events ?? ["*"],
            active: true,
        })
        .returning();

    // Return the full secret ONCE — won't be shown again
    return NextResponse.json({
        endpoint: { ...endpoint },
        message: "Store the signingSecret now — it won't be shown again.",
    }, { status: 201 });
}

// PATCH /api/webhook-endpoints — toggle active / update events
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, active, events, name, slug } = body;

    if (!id || !slug) return NextResponse.json({ error: "Missing id or slug" }, { status: 400 });

    const [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id)))
        .limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = { updatedAt: new Date() };
    if (typeof active === "boolean") updates.active = active;
    if (events) updates.events = events;
    if (name) updates.name = name;

    await db.update(webhookEndpoints).set(updates).where(
        and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.businessId, business.id))
    );

    return NextResponse.json({ success: true });
}

// DELETE /api/webhook-endpoints — remove an endpoint
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (!id || !slug) return NextResponse.json({ error: "Missing id or slug" }, { status: 400 });

    const [business] = await db
        .select()
        .from(businesses)
        .where(and(eq(businesses.slug, slug), eq(businesses.userId, session.user.id)))
        .limit(1);

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    await db.delete(webhookEndpoints).where(
        and(eq(webhookEndpoints.id, id), eq(webhookEndpoints.businessId, business.id))
    );

    return NextResponse.json({ success: true });
}

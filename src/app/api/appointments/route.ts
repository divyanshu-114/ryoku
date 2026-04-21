import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, appointments } from "@/lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

// GET /api/appointments — List appointments
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const conditions = [eq(appointments.businessId, business.id)];
    if (from) conditions.push(gte(appointments.date, new Date(from)));
    if (to) conditions.push(lte(appointments.date, new Date(to)));

    const appts = await db
        .select()
        .from(appointments)
        .where(and(...conditions))
        .orderBy(desc(appointments.date));

    return NextResponse.json({ appointments: appts });
}

// POST /api/appointments — Create appointment (used by AI agent tool or dashboard)
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await req.json();

    const [appt] = await db.insert(appointments).values({
        businessId: business.id,
        customerName: body.customerName || "Customer",
        customerEmail: body.customerEmail || null,
        customerPhone: body.customerPhone || null,
        service: body.service || null,
        date: new Date(body.date),
        duration: body.duration || 30,
        notes: body.notes || null,
        conversationId: body.conversationId || null,
    }).returning();

    return NextResponse.json({ appointment: appt });
}

// PATCH /api/appointments — Update appointment status
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allowed: Record<string, any> = {};
    if (updates.status) allowed.status = updates.status;
    if (updates.date) allowed.date = new Date(updates.date);
    if (updates.notes !== undefined) allowed.notes = updates.notes;
    if (updates.service) allowed.service = updates.service;

    await db.update(appointments).set(allowed).where(and(eq(appointments.id, id), eq(appointments.businessId, business.id)));

    return NextResponse.json({ success: true });
}

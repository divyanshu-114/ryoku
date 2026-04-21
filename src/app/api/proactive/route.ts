import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, proactiveRules } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/proactive — List proactive rules
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const rules = await db.select().from(proactiveRules).where(eq(proactiveRules.businessId, business.id));
    return NextResponse.json({ rules });
}

// POST /api/proactive — Create a proactive rule
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await req.json();

    const [rule] = await db.insert(proactiveRules).values({
        businessId: business.id,
        name: body.name || "Untitled Rule",
        trigger: body.trigger || "time_on_page",
        triggerValue: body.triggerValue || "30",
        message: body.message || "Need help? Chat with us!",
    }).returning();

    return NextResponse.json({ rule });
}

// DELETE /api/proactive — Delete a rule
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    await db.delete(proactiveRules).where(and(eq(proactiveRules.id, id), eq(proactiveRules.businessId, business.id)));
    return NextResponse.json({ success: true });
}

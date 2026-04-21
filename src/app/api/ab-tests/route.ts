import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, abTests } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/ab-tests — List A/B tests
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const tests = await db.select().from(abTests).where(eq(abTests.businessId, business.id));
    return NextResponse.json({ tests });
}

// POST /api/ab-tests — Create an A/B test
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await req.json();

    const [test] = await db.insert(abTests).values({
        businessId: business.id,
        name: body.name || "Untitled Test",
        description: body.description || null,
        variants: body.variants || [
            { id: "a", name: "Control", welcomeMessage: "Hi! How can I help?", weight: 50 },
            { id: "b", name: "Variant B", welcomeMessage: "Hey there! What can I do for you?", weight: 50 },
        ],
    }).returning();

    return NextResponse.json({ test });
}

// PATCH /api/ab-tests — Update test status (start/stop)
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await req.json();
    const { id, status } = body;

    if (!id || !["draft", "running", "completed"].includes(status)) {
        return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    await db.update(abTests).set({ status }).where(and(eq(abTests.id, id), eq(abTests.businessId, business.id)));
    return NextResponse.json({ success: true });
}

// DELETE /api/ab-tests — Delete a test
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const [business] = await db.select().from(businesses).where(eq(businesses.userId, session.user.id)).limit(1);
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    await db.delete(abTests).where(and(eq(abTests.id, id), eq(abTests.businessId, business.id)));
    return NextResponse.json({ success: true });
}

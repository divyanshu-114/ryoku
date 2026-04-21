import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, cannedResponses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/canned-responses — List all canned responses
export async function GET() {
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

    const responses = await db
        .select()
        .from(cannedResponses)
        .where(eq(cannedResponses.businessId, business.id));

    return NextResponse.json({ responses });
}

// POST /api/canned-responses — Create a new canned response
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

    const [response] = await db.insert(cannedResponses).values({
        businessId: business.id,
        title: body.title || "Untitled",
        content: body.content || "",
        shortcut: body.shortcut || null,
        category: body.category || "general",
    }).returning();

    return NextResponse.json({ response });
}

// DELETE /api/canned-responses — Delete a canned response
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "ID required" }, { status: 400 });
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
        .delete(cannedResponses)
        .where(and(eq(cannedResponses.id, id), eq(cannedResponses.businessId, business.id)));

    return NextResponse.json({ success: true });
}

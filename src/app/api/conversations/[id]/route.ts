import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, messages } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { triggerConversationUpdated } from "@/lib/pusher-server";

// GET /api/conversations/[id] — Get single conversation with messages
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const [conversation] = await db
        .select()
        .from(conversations)
        .where(and(
            eq(conversations.id, id),
            eq(conversations.businessId, business.id)
        ))
        .limit(1);

    if (!conversation) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const msgs = await db
        .select()
        .from(messages)
        .where(eq(messages.conversationId, id))
        .orderBy(messages.createdAt);

    return NextResponse.json({
        conversation,
        messages: msgs,
    });
}

// PATCH /api/conversations/[id] — Update conversation (status, rating, summary)
export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};
    if (body.status) updates.status = body.status;
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.summary !== undefined) updates.summary = body.summary;
    if (body.assignedAgent !== undefined) updates.assignedAgent = body.assignedAgent;
    updates.updatedAt = new Date();

    await db
        .update(conversations)
        .set(updates)
        .where(and(
            eq(conversations.id, id),
            eq(conversations.businessId, business.id)
        ));

    // Notify both the agent queue and the customer chat in real-time
    if (body.status || body.assignedAgent !== undefined) {
        await triggerConversationUpdated(business.id, id, {
            status: body.status ?? updates.status,
            assignedAgent: body.assignedAgent ?? null,
        }).catch(() => {});
    }

    return NextResponse.json({ success: true });
}

// DELETE /api/conversations/[id] — Permanently delete conversation
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // Verify ownership and delete
    // Note: If using a real database with foreign keys, you might need to delete messages first 
    // if cascading is not enabled.
    await db
        .delete(messages)
        .where(eq(messages.conversationId, id));

    const result = await db
        .delete(conversations)
        .where(and(
            eq(conversations.id, id),
            eq(conversations.businessId, business.id)
        ));

    return NextResponse.json({ success: true });
}

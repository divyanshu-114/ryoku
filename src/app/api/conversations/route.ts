import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, messages } from "@/lib/db/schema";
import { eq, and, desc, count } from "drizzle-orm";

// GET /api/conversations — List conversations for authenticated user's business
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
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const status = searchParams.get("status"); // active, escalated, resolved
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(conversations.businessId, business.id)];
    if (status) conditions.push(eq(conversations.status, status));

    const [convos, totalResult] = await Promise.all([
        db
            .select({
                id: conversations.id,
                customerName: conversations.customerName,
                customerEmail: conversations.customerEmail,
                status: conversations.status,
                rating: conversations.rating,
                summary: conversations.summary,
                assignedAgent: conversations.assignedAgent,
                createdAt: conversations.createdAt,
                updatedAt: conversations.updatedAt,
            })
            .from(conversations)
            .where(and(...conditions))
            .orderBy(desc(conversations.updatedAt))
            .limit(limit)
            .offset(offset),
        db
            .select({ count: count() })
            .from(conversations)
            .where(and(...conditions)),
    ]);

    // Get message counts per conversation
    const convoIds = convos.map((c) => c.id);
    let messageCounts: Record<string, number> = {};
    if (convoIds.length > 0) {
        const counts = await Promise.all(
            convoIds.map(async (id) => {
                const [result] = await db
                    .select({ count: count() })
                    .from(messages)
                    .where(eq(messages.conversationId, id));
                return { id, count: result?.count || 0 };
            })
        );
        messageCounts = Object.fromEntries(counts.map((c) => [c.id, c.count]));
    }

    return NextResponse.json({
        conversations: convos.map((c) => ({
            ...c,
            messageCount: messageCounts[c.id] || 0,
        })),
        page,
        limit,
        total: totalResult[0]?.count || 0,
    });
}

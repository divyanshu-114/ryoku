import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, conversations, messages } from "@/lib/db/schema";
import { eq, and, desc, count, inArray } from "drizzle-orm";

// GET /api/agent/conversations — Get agent's conversation queue
export async function GET(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, session.user.id))
        .limit(1);

    if (!agent) {
        return NextResponse.json({ error: "Not an agent" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") || "queue"; // queue, assigned, all

    let conditions;
    if (view === "assigned") {
        conditions = and(
            eq(conversations.businessId, agent.businessId),
            eq(conversations.assignedAgent, agent.id)
        );
    } else if (view === "queue") {
        // Unassigned escalated conversations
        conditions = and(
            eq(conversations.businessId, agent.businessId),
            eq(conversations.status, "escalated")
        );
    } else {
        conditions = and(
            eq(conversations.businessId, agent.businessId),
            inArray(conversations.status, ["active", "escalated"])
        );
    }

    const convos = await db
        .select()
        .from(conversations)
        .where(conditions)
        .orderBy(desc(conversations.updatedAt))
        .limit(50);

    // Get last message and message count for each
    const enriched = await Promise.all(
        convos.map(async (c) => {
            const [msgCount] = await db.select({ count: count() }).from(messages).where(eq(messages.conversationId, c.id));
            const [lastMsg] = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, c.id))
                .orderBy(desc(messages.createdAt))
                .limit(1);

            return {
                ...c,
                messageCount: msgCount?.count || 0,
                lastMessage: lastMsg ? { role: lastMsg.role, content: lastMsg.content.slice(0, 100), createdAt: lastMsg.createdAt } : null,
            };
        })
    );

    return NextResponse.json({ conversations: enriched });
}

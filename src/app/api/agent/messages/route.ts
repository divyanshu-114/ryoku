import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { agents, conversations, messages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { triggerConversationMessage, pusherServer, PUSHER_EVENTS } from "@/lib/pusher";

// POST /api/agent/messages — Agent sends a message in a conversation
export async function POST(req: Request) {
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

    const body = await req.json();
    const { conversationId, content } = body;

    if (!conversationId || !content) {
        return NextResponse.json({ error: "Missing conversationId or content" }, { status: 400 });
    }

    // Verify conversation belongs to agent's business
    const [convo] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

    if (!convo || convo.businessId !== agent.businessId) {
        return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    // If not assigned to this agent yet, assign now
    if (convo.assignedAgent !== agent.id) {
        await db
            .update(conversations)
            .set({ assignedAgent: agent.id, status: "active", updatedAt: new Date() })
            .where(eq(conversations.id, conversationId));

        // Notify business channel
        await pusherServer.trigger(
            `private-business-${agent.businessId}`,
            PUSHER_EVENTS.CONVERSATION_ASSIGNED,
            { conversationId, agentId: agent.id, agentName: agent.displayName }
        );
    }

    // Save the message
    const [savedMsg] = await db.insert(messages).values({
        conversationId,
        role: "agent",
        content,
        metadata: { agentId: agent.id, agentName: agent.displayName },
    }).returning();

    // Update conversation timestamp
    await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

    // Push real-time message to conversation channel
    await triggerConversationMessage(conversationId, {
        id: savedMsg.id,
        role: "agent",
        content,
        sender: agent.displayName,
    });

    return NextResponse.json({ message: savedMsg });
}

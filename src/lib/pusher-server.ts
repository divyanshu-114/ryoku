/**
 * Pusher server-side instance for Ryoku.
 * 
 * USE ONLY IN:
 * - API Routes
 * - Server Components
 * - Server Actions
 */

import Pusher from "pusher";

let _pusherServer: Pusher | null = null;

function getPusherServer(): Pusher {
    if (_pusherServer) return _pusherServer;

    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";

    if (!appId || !key || !secret) {
        throw new Error(
            "[pusher] Missing required env vars: PUSHER_APP_ID, NEXT_PUBLIC_PUSHER_KEY, or PUSHER_SECRET"
        );
    }

    _pusherServer = new Pusher({ appId, key, secret, cluster, useTLS: true });
    return _pusherServer;
}

export const pusherServer = new Proxy({} as Pusher, {
    get(_target, prop, receiver) {
        return Reflect.get(getPusherServer(), prop, receiver);
    },
});

export const PUSHER_EVENTS = {
    NEW_MESSAGE: "new-message",
    TYPING: "client-typing",
    CONVERSATION_UPDATED: "conversation-updated",
    AGENT_STATUS: "agent-status",
    NEW_CONVERSATION: "new-conversation",
    CONVERSATION_ASSIGNED: "conversation-assigned",
    HANDOFF: "bot-handoff",
} as const;

export async function triggerConversationMessage(
    conversationId: string,
    message: { id?: number | string; role: string; content: string; sender?: string }
) {
    await pusherServer.trigger(
        `private-conversation-${conversationId}`,
        PUSHER_EVENTS.NEW_MESSAGE,
        message
    );
}

export async function triggerNewConversation(
    businessId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conversation: Record<string, any>
) {
    await pusherServer.trigger(
        `private-business-${businessId}`,
        PUSHER_EVENTS.NEW_CONVERSATION,
        conversation
    );
}

export async function triggerHandoff(
    businessId: string,
    conversationId: string,
    reason?: string
) {
    await pusherServer.trigger(
        `private-business-${businessId}`,
        PUSHER_EVENTS.HANDOFF,
        { conversationId, reason }
    );
}

export async function triggerConversationUpdated(
    businessId: string,
    conversationId: string,
    update: { status: string; assignedAgent?: string | null }
) {
    await Promise.all([
        pusherServer.trigger(
            `private-business-${businessId}`,
            PUSHER_EVENTS.CONVERSATION_UPDATED,
            { conversationId, ...update }
        ),
        pusherServer.trigger(
            `private-conversation-${conversationId}`,
            PUSHER_EVENTS.CONVERSATION_UPDATED,
            { conversationId, ...update }
        ),
    ]);
}

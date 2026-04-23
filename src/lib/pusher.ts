/**
 * Pusher real-time infrastructure for Ryoku.
 *
 * Server-side: use `pusherServer` to trigger events
 * Client-side: use `getPusherClient()` in React components
 *
 * Channel scheme:
 *   private-business-{businessId}     — Business-wide events (new conversations, agent status)
 *   private-conversation-{convoId}    — Per-conversation messages, typing indicators
 */

import Pusher from "pusher";
import PusherClient from "pusher-js";

// ── Server-side Pusher instance ──
// Lazy singleton: created on first use so missing env vars don't crash Next.js build.
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

// Export as a proxy so existing code using `pusherServer.trigger(...)` keeps working
export const pusherServer = new Proxy({} as Pusher, {
    get(_target, prop, receiver) {
        return Reflect.get(getPusherServer(), prop, receiver);
    },
});

// ── Client-side singleton ──
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (pusherClientInstance) return pusherClientInstance;

    pusherClientInstance = new PusherClient(
        process.env.NEXT_PUBLIC_PUSHER_KEY || "",
        {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
            authEndpoint: "/api/pusher/auth",
        }
    );

    return pusherClientInstance;
}

// ── Event types ──
export const PUSHER_EVENTS = {
    // Conversation events
    NEW_MESSAGE: "new-message",
    TYPING: "client-typing",
    CONVERSATION_UPDATED: "conversation-updated",

    // Agent events
    AGENT_STATUS: "agent-status",
    NEW_CONVERSATION: "new-conversation",
    CONVERSATION_ASSIGNED: "conversation-assigned",
    HANDOFF: "bot-handoff",
} as const;

// ── Helper: trigger a message to a conversation channel ──
export async function triggerConversationMessage(
    conversationId: string,
    message: { id?: number | string; role: string; content: string; sender?: string; sentiment?: string }
) {
    await pusherServer.trigger(
        `private-conversation-${conversationId}`,
        PUSHER_EVENTS.NEW_MESSAGE,
        message
    );
}

// ── Helper: notify business of new conversation in queue ──
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

// ── Helper: notify business of an agent handoff request ──
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

// ── Helper: broadcast conversation status update ──
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

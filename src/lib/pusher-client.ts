/**
 * Pusher client-side singleton for Ryoku.
 * 
 * USE ONLY IN:
 * - Client Components (with "use client")
 */

import PusherClient from "pusher-js";

let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
    if (pusherClientInstance) return pusherClientInstance;

    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) {
        throw new Error("Missing required environment variable: NEXT_PUBLIC_PUSHER_KEY");
    }

    pusherClientInstance = new PusherClient(
        key,
        {
            cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
            authEndpoint: "/api/pusher/auth",
        }
    );

    return pusherClientInstance;
}

export const PUSHER_EVENTS = {
    NEW_MESSAGE: "new-message",
    TYPING: "server-typing",
    CONVERSATION_UPDATED: "conversation-updated",
    AGENT_STATUS: "agent-status",
    NEW_CONVERSATION: "new-conversation",
    CONVERSATION_ASSIGNED: "conversation-assigned",
    HANDOFF: "bot-handoff",
} as const;

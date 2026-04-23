import { pusherServer, PUSHER_EVENTS } from "@/lib/pusher";
import { NextResponse } from "next/server";

// POST /api/chat/typing
// Body: { conversationId: string, role: "user" | "agent" }
// Fires a TYPING event on the conversation channel with the sender's role,
// so each side can ignore its own typing echoes.
export async function POST(req: Request) {
    try {
        const { conversationId, role } = await req.json();

        if (!conversationId || !role) {
            return new Response("Missing conversationId or role", { status: 400 });
        }

        await pusherServer.trigger(
            `private-conversation-${conversationId}`,
            PUSHER_EVENTS.TYPING,
            { role } // "user" | "agent"
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[Typing Error]", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

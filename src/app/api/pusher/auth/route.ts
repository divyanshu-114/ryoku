import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

// POST /api/pusher/auth — Authenticate Pusher private channels
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.text();
    const params = new URLSearchParams(body);
    const socketId = params.get("socket_id");
    const channel = params.get("channel_name");

    if (!socketId || !channel) {
        return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Validate channel access (private channels only)
    if (!channel.startsWith("private-")) {
        return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
        user_id: session.user.id,
        user_info: {
            name: session.user.name || "Agent",
            email: session.user.email || "",
        },
    });

    return NextResponse.json(authResponse);
}

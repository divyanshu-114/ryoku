import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { pusherServer, PUSHER_EVENTS } from "@/lib/pusher-server";

// GET /api/agent — Get current user's agent profile
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, session.user.id))
        .limit(1);

    return NextResponse.json({ agent: agent || null });
}

// POST /api/agent — Register as an agent
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

    // Check if agent already exists
    const [existing] = await db.select().from(agents).where(eq(agents.userId, session.user.id)).limit(1);
    if (existing) {
        return NextResponse.json({ error: "Already registered as agent", agent: existing }, { status: 409 });
    }

    const [agent] = await db.insert(agents).values({
        businessId: business.id,
        userId: session.user.id,
        displayName: body.displayName || session.user.name || "Agent",
        avatar: session.user.image || null,
    }).returning();

    return NextResponse.json({ agent });
}

// PATCH /api/agent — Update agent status (online/away/offline)
export async function PATCH(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    if (!["online", "away", "offline"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.userId, session.user.id))
        .limit(1);

    if (!agent) {
        return NextResponse.json({ error: "Not registered as agent" }, { status: 404 });
    }

    await db.update(agents).set({ status }).where(eq(agents.id, agent.id));

    // Broadcast status change
    await pusherServer.trigger(
        `private-business-${agent.businessId}`,
        PUSHER_EVENTS.AGENT_STATUS,
        { agentId: agent.id, status, displayName: agent.displayName }
    );

    return NextResponse.json({ success: true, status });
}

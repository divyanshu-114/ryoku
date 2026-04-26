import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, agents } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const slug = searchParams.get("slug");

        if (!slug) {
            return NextResponse.json({ error: "Missing slug" }, { status: 400 });
        }

        const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.slug, slug))
            .limit(1);

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const availableAgents = await db
            .select({
                id: agents.id,
                displayName: agents.displayName,
                avatar: agents.avatar,
                status: agents.status,
            })
            .from(agents)
            .where(eq(agents.businessId, business.id));

        const onlineAgents = availableAgents.filter((a) => a.status === "online");

        return NextResponse.json({
            businessId: business.id,
            online: onlineAgents.length > 0,
            onlineCount: onlineAgents.length,
            agents: availableAgents.map((a) => ({
                id: a.id,
                name: a.displayName,
                avatar: a.avatar,
                status: a.status,
            })),
        });
    } catch (err) {
        console.error("[AgentStatus]", err);
        return NextResponse.json({ error: "Internal error" }, { status: 500 });
    }
}
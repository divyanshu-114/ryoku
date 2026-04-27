import { handleChatPOST } from "@/lib/chat-handler";
import { db } from "@/lib/db";
import { businesses, agents } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug?: string[] }> }
) {
    const { slug: slugArray } = await params;
    const slug = slugArray?.[0];

    if (!slug) {
        return NextResponse.json({ error: "Missing business slug" }, { status: 400 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, slug))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const onlineAgents = await db
        .select()
        .from(agents)
        .where(and(
            eq(agents.businessId, business.id),
            eq(agents.status, "online")
        ));

    return NextResponse.json({ 
        online: onlineAgents.length > 0,
        count: onlineAgents.length 
    });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug?: string[] }> }
) {
    const { slug: slugArray } = await params;

    const slug = slugArray?.[0];

    if (!slug) {
        return new Response(JSON.stringify({ error: "Missing business slug" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    console.log(`[API] POST hit for slug: ${slug}`);
    
    // Handle OPTIONS preflight
    if (req.method === "OPTIONS") {
        return new Response(null, {
            status: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization",
            },
        });
    }

    return handleChatPOST(req, slug);
}

// Optional: Handle DELETE if needed for session cleanup
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ slug?: string[] }> }
) {
    const { slug: slugArray } = await params;
    const slug = slugArray?.[0];

    if (!slug) {
        return new Response(JSON.stringify({ error: "Missing business slug" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // You can implement session cleanup logic in chat-handler.ts if needed
    return new Response(JSON.stringify({ success: true, slug }), { status: 200 });
}

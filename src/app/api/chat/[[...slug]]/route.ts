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
    const slug = slugArray?.[0] || "athena";

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
    
    // Extract slug from array or default to athena
    // Root call /api/chat results in undefined slugArray
    const slug = slugArray?.[0] || "athena";
    
    console.log(`[API] Catch-all POST hit for slug: ${slug} (path: ${slugArray?.join("/") || "root"})`);
    
    // Basic health check for GET-like probes
    if (req.method === "GET") {
        return new Response(JSON.stringify({ status: "ok", slug }), { status: 200 });
    }

    return handleChatPOST(req, slug);
}

// Optional: Handle DELETE if needed for session cleanup
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ slug?: string[] }> }
) {
    const { slug: slugArray } = await params;
    const slug = slugArray?.[0] || "athena";
    
    // You can implement session cleanup logic in chat-handler.ts if needed
    return new Response(JSON.stringify({ success: true, slug }), { status: 200 });
}

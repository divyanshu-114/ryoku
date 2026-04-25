import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { conversations, businesses, analyticsEvents } from "@/lib/db/schema";
import { triggerHandoff } from "@/lib/pusher-server";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
    try {
        const { conversationId, slug, reason, email, phone } = await req.json();

        if (!conversationId || !slug) {
            return NextResponse.json({ error: "Missing conversation ID or slug" }, { status: 400 });
        }

        const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.slug, slug))
            .limit(1);

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        // Mark as escalated and save contact details
        await db.update(conversations)
            .set({ 
                status: "escalated", 
                customerEmail: email || null,
                customerPhone: phone || null,
                updatedAt: new Date() 
            })
            .where(eq(conversations.id, conversationId));

        await db.insert(analyticsEvents).values({
            businessId: business.id,
            event: "escalated",
            data: { conversationId, reason: reason || "User requested agent via UI button", online: true },
        });

        // Trigger pusher event
        await triggerHandoff(business.id, conversationId, reason || "User requested agent via UI button");

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

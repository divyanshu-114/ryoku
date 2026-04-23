import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, messages } from "@/lib/db/schema";
import { eq, and, desc, gte } from "drizzle-orm";

// GET /api/analytics/export — Export conversations as CSV or JSON
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch conversations with messages
    const convos = await db
        .select()
        .from(conversations)
        .where(and(
            eq(conversations.businessId, business.id),
            gte(conversations.createdAt, since)
        ))
        .orderBy(desc(conversations.createdAt));

    const exportData = await Promise.all(
        convos.map(async (convo) => {
            const msgs = await db
                .select()
                .from(messages)
                .where(eq(messages.conversationId, convo.id))
                .orderBy(messages.createdAt);

            return {
                conversationId: convo.id,
                customerName: convo.customerName || "Anonymous",
                customerEmail: convo.customerEmail || "",
                status: convo.status,
                rating: convo.rating,
                summary: convo.summary || "",
                messageCount: msgs.length,
                startedAt: convo.createdAt,
                messages: msgs.map((m) => ({
                    role: m.role,
                    content: m.content,
                    sentiment: m.sentiment,
                    timestamp: m.createdAt,
                })),
            };
        })
    );

    if (format === "csv") {
        // Flatten for CSV export
        const rows = exportData.flatMap((c) =>
            c.messages.map((m) => [
                c.conversationId,
                c.customerName,
                c.customerEmail,
                c.status,
                c.rating ?? "",
                m.role,
                `"${m.content.replace(/"/g, '""')}"`,
                m.sentiment ?? "",
                m.timestamp,
            ].join(","))
        );

        const csv = [
            "conversation_id,customer_name,customer_email,status,rating,role,content,sentiment,timestamp",
            ...rows,
        ].join("\n");

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="conversations-${business.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    }

    return NextResponse.json({ conversations: exportData, exported: exportData.length });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, knowledgeGaps, analyticsEvents } from "@/lib/db/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";

/**
 * GET /api/analytics/summary
 * Lightweight Bot Health summary for the dashboard card.
 * Returns: chats this week, escalation %, top unanswered questions.
 */
export async function GET() {
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

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const [totalChats, escalatedChats, topGaps] = await Promise.all([
        // Total conversations this week
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                gte(conversations.createdAt, since)
            )),

        // Escalated this week
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                eq(conversations.status, "escalated"),
                gte(conversations.createdAt, since)
            )),

        // Top unanswered questions (unresolved, sorted by frequency)
        db.select({
            id: knowledgeGaps.id,
            question: knowledgeGaps.question,
            frequency: knowledgeGaps.frequency,
        })
            .from(knowledgeGaps)
            .where(and(
                eq(knowledgeGaps.businessId, business.id),
                eq(knowledgeGaps.resolved, false)
            ))
            .orderBy(desc(knowledgeGaps.frequency))
            .limit(5),
    ]);

    const total = totalChats[0]?.count ?? 0;
    const escalated = escalatedChats[0]?.count ?? 0;
    const escalationRate = total > 0 ? Math.round((escalated / total) * 100) : 0;
    const handledRate = 100 - escalationRate;

    // Count total api_request events to gauge activity
    const [apiActivity] = await db
        .select({ count: count() })
        .from(analyticsEvents)
        .where(and(
            eq(analyticsEvents.businessId, business.id),
            eq(analyticsEvents.event, "api_request"),
            gte(analyticsEvents.createdAt, since)
        ));

    return NextResponse.json({
        week: {
            chats: total,
            escalated,
            escalationRate,
            handledRate,
            apiRequests: apiActivity?.count ?? 0,
        },
        topUnansweredQuestions: topGaps,
    });
}

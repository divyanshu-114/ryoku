import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, analyticsEvents } from "@/lib/db/schema";
import { eq, and, sql, gte, count } from "drizzle-orm";

// GET /api/analytics — Dashboard stats for the authenticated user's business
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
    const period = searchParams.get("period") || "7d";

    // Calculate date range
    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Parallel queries for performance
    const [
        totalConversations,
        activeConversations,
        escalatedCount,
        resolvedCount,
        totalMessages,
        avgRatingResult,
        recentEvents,
        dailyConversations,
    ] = await Promise.all([
        // Total conversations in period
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                gte(conversations.createdAt, since)
            )),
        // Active conversations
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                eq(conversations.status, "active")
            )),
        // Escalated conversations
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                eq(conversations.status, "escalated"),
                gte(conversations.createdAt, since)
            )),
        // Resolved conversations
        db.select({ count: count() })
            .from(conversations)
            .where(and(
                eq(conversations.businessId, business.id),
                eq(conversations.status, "resolved"),
                gte(conversations.createdAt, since)
            )),
        // Total messages in period
        db.execute(
            sql`SELECT COUNT(*) as count FROM messages m
                JOIN conversations c ON m.conversation_id = c.id
                WHERE c.business_id = ${business.id}
                AND m.created_at >= ${since.toISOString()}`
        ),
        // Average CSAT rating
        db.execute(
            sql`SELECT AVG(rating)::numeric(3,1) as avg_rating, COUNT(rating) as rated_count
                FROM conversations
                WHERE business_id = ${business.id}
                AND rating IS NOT NULL
                AND created_at >= ${since.toISOString()}`
        ),
        // Recent analytics events (last 50 for event breakdown)
        db.select({ event: analyticsEvents.event, count: count() })
            .from(analyticsEvents)
            .where(and(
                eq(analyticsEvents.businessId, business.id),
                gte(analyticsEvents.createdAt, since)
            ))
            .groupBy(analyticsEvents.event),
        // Daily conversation counts for chart
        db.execute(
            sql`SELECT DATE(created_at) as date, COUNT(*) as count
                FROM conversations
                WHERE business_id = ${business.id}
                AND created_at >= ${since.toISOString()}
                GROUP BY DATE(created_at)
                ORDER BY date ASC`
        ),
    ]);

    // Calculate sentiment breakdown
    const sentimentBreakdown = await db.execute(
        sql`SELECT m.sentiment, COUNT(*) as count
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            WHERE c.business_id = ${business.id}
            AND m.sentiment IS NOT NULL
            AND m.created_at >= ${since.toISOString()}
            GROUP BY m.sentiment`
    );

    return NextResponse.json({
        period,
        stats: {
            totalConversations: totalConversations[0]?.count || 0,
            activeConversations: activeConversations[0]?.count || 0,
            escalatedCount: escalatedCount[0]?.count || 0,
            resolvedCount: resolvedCount[0]?.count || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            totalMessages: (totalMessages.rows?.[0] as any)?.count || 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            avgRating: parseFloat((avgRatingResult.rows?.[0] as any)?.avg_rating) || null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ratedCount: parseInt((avgRatingResult.rows?.[0] as any)?.rated_count) || 0,
        },
        eventBreakdown: recentEvents,
        dailyConversations: dailyConversations.rows || [],
        sentimentBreakdown: sentimentBreakdown.rows || [],
    });
}

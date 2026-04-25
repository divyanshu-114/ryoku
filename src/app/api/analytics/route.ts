import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations, analyticsEvents, messages } from "@/lib/db/schema";
import { eq, and, sql, gte, avg } from "drizzle-orm";

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
        totalConversationsRes,
        activeConversationsRes,
        escalatedCountRes,
        resolvedCountRes,
        totalMessagesRes,
        avgRatingRes,
        recentEvents,
        dailyConversationsRaw,
        sentimentBreakdownRaw,
    ] = await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), gte(conversations.createdAt, since))),
        db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), eq(conversations.status, "active"))),
        db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), eq(conversations.status, "escalated"), gte(conversations.createdAt, since))),
        db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), eq(conversations.status, "resolved"), gte(conversations.createdAt, since))),
        db.select({ count: sql<number>`count(*)::int` }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).where(and(eq(conversations.businessId, business.id), gte(messages.createdAt, since))),
        db.select({ avgRating: avg(conversations.rating), ratedCount: sql<number>`count(rating)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), gte(conversations.createdAt, since), sql`${conversations.rating} IS NOT NULL`)),
        db.select({ event: analyticsEvents.event, count: sql<number>`count(*)::int` }).from(analyticsEvents).where(and(eq(analyticsEvents.businessId, business.id), gte(analyticsEvents.createdAt, since))).groupBy(analyticsEvents.event),
        db.select({ date: sql<string>`to_char(${conversations.createdAt}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` }).from(conversations).where(and(eq(conversations.businessId, business.id), gte(conversations.createdAt, since))).groupBy(sql`to_char(${conversations.createdAt}, 'YYYY-MM-DD')`).orderBy(sql`1 ASC`),
        db.select({ sentiment: messages.sentiment, count: sql<number>`count(*)::int` }).from(messages).innerJoin(conversations, eq(messages.conversationId, conversations.id)).where(and(eq(conversations.businessId, business.id), gte(messages.createdAt, since), sql`${messages.sentiment} IS NOT NULL`)).groupBy(messages.sentiment),
    ]);

    return NextResponse.json({
        period,
        stats: {
            totalConversations: totalConversationsRes[0]?.count || 0,
            activeConversations: activeConversationsRes[0]?.count || 0,
            escalatedCount: escalatedCountRes[0]?.count || 0,
            resolvedCount: resolvedCountRes[0]?.count || 0,
            totalMessages: totalMessagesRes[0]?.count || 0,
            avgRating: parseFloat(avgRatingRes[0]?.avgRating || "0") || null,
            ratedCount: Number(avgRatingRes[0]?.ratedCount) || 0,
        },
        eventBreakdown: recentEvents,
        dailyConversations: dailyConversationsRaw,
        sentimentBreakdown: sentimentBreakdownRaw,
    });
}

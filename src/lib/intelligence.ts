/**
 * Phase 2 Intelligence helpers:
 * - Sentiment analysis: classify user messages as positive/neutral/negative/frustrated
 * - Auto-summary: generate 2-line conversation summary when chat ends
 * - Knowledge gap detection: track questions the bot couldn't answer
 * - Usage metering: log analytics events
 */

import { db } from "@/lib/db";
import { analyticsEvents, knowledgeGaps } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Sentiment Analysis (keyword-based, no API call required) ──
const FRUSTRATED_PATTERNS = [
    /angry|furious|ridiculous|unacceptable|terrible|horrible|worst|hate|scam/i,
    /wtf|what the (hell|fuck|heck)|this is (stupid|bs|bullshit)/i,
    /escalat|manager|supervisor|lawsuit|lawyer|report/i,
    /still (not|haven't|waiting|no)/i,
    /!\s*!|!!!+/,
];

const NEGATIVE_PATTERNS = [
    /disappoint|frustrat|unhappy|upset|annoyed|confused|problem|issue|broken|wrong/i,
    /not working|doesn't work|can't|cannot|failed|error|bug/i,
    /refund|return|cancel|complain/i,
];

const POSITIVE_PATTERNS = [
    /thank|thanks|great|awesome|excellent|perfect|love|wonderful|amazing|helpful/i,
    /good job|well done|appreciate|satisfied|happy|pleased/i,
    /👍|😊|🎉|❤️|💯|⭐/,
];

export function analyzeSentiment(text: string): "positive" | "neutral" | "negative" | "frustrated" {
    // Check frustrated first (most severe)
    if (FRUSTRATED_PATTERNS.some((p) => p.test(text))) return "frustrated";
    if (NEGATIVE_PATTERNS.some((p) => p.test(text))) return "negative";
    if (POSITIVE_PATTERNS.some((p) => p.test(text))) return "positive";
    return "neutral";
}

// ── Auto-Summary (simple extractive approach, no API needed) ──
export function generateSimpleSummary(
    messages: { role: string; content: string }[]
): string {
    const userMessages = messages.filter((m) => m.role === "user");
    const assistantMessages = messages.filter((m) => m.role === "assistant");

    if (userMessages.length === 0) return "No messages in conversation.";

    // Extract the main topic from first user message
    const topic = userMessages[0].content.slice(0, 100);

    // Determine resolution
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    const resolved = lastAssistant?.content.toLowerCase().includes("resolved") ||
        lastAssistant?.content.toLowerCase().includes("helped") ||
        lastAssistant?.content.toLowerCase().includes("anything else");

    const messageCount = messages.length;
    const summary = `Customer asked about: "${topic.trim()}${topic.length > 100 ? "..." : ""}". ${messageCount} messages exchanged. ${resolved ? "Issue appears resolved." : "May need follow-up."}`;

    return summary;
}

// ── Knowledge Gap Detection ──
export async function trackKnowledgeGap(
    businessId: string,
    question: string
) {
    // Check if this question pattern already exists
    const [existing] = await db
        .select()
        .from(knowledgeGaps)
        .where(and(
            eq(knowledgeGaps.businessId, businessId),
            eq(knowledgeGaps.resolved, false),
            // Simple fuzzy match: check if the question is similar
            sql`LOWER(question) = LOWER(${question.slice(0, 500)})`
        ))
        .limit(1);

    if (existing) {
        // Increment frequency
        await db
            .update(knowledgeGaps)
            .set({
                frequency: sql`frequency + 1`,
                updatedAt: new Date(),
            })
            .where(eq(knowledgeGaps.id, existing.id));
    } else {
        // Insert new gap
        await db.insert(knowledgeGaps).values({
            businessId,
            question: question.slice(0, 500),
        });
    }
}

// ── Usage Metering ──
export async function logAnalyticsEvent(
    businessId: string,
    event: string,
    data: Record<string, unknown> = {},
    apiKeyId?: string,
    sessionId?: string
) {
    await db.insert(analyticsEvents).values({
        businessId,
        event,
        data,
        apiKeyId: apiKeyId || null,
        sessionId: sessionId || null,
    });
}

// Event types for reference:
// chat_started, chat_ended, tool_called, escalated, csat_submitted,
// api_request, knowledge_gap, faq_generated

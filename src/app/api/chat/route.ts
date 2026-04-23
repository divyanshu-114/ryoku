import { streamText, tool } from "ai";
import { db } from "@/lib/db";
import { businesses, agents, conversations, messages as dbMessages, analyticsEvents } from "@/lib/db/schema";
import { triggerConversationMessage, triggerNewConversation, triggerHandoff } from "@/lib/pusher";
import { withRetry, generateEmbedding } from "@/lib/ai-provider";
import { analyzeSentiment, trackKnowledgeGap, logAnalyticsEvent } from "@/lib/intelligence";
import {
    sanitizeUserInput,
    wrapContext,
    wrapUserMessage,
    ANTI_INJECTION_PREAMBLE,
    MAX_USER_MESSAGE_LENGTH,
    capHistory,
} from "@/lib/prompt-guard";
import { searchWeb, fetchPage } from "@/lib/web-tools";
import { eq, sql, and } from "drizzle-orm";
import { getBusinessPlan } from "@/lib/billing";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

type IncomingPart = { type?: string; text?: string };
type IncomingMessage = {
    role?: string;
    content?: string | IncomingPart[];
    parts?: IncomingPart[];
};

function extractMessageText(message: IncomingMessage): string {
    if (typeof message.content === "string") return message.content;
    if (Array.isArray(message.content)) {
        return message.content
            .filter((part) => part.type === "text")
            .map((part) => part.text || "")
            .join("");
    }
    if (Array.isArray(message.parts)) {
        return message.parts.map((part) => part.text || "").join("");
    }
    return "";
}

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { messages, slug: bodySlug, id: bodyId, conversationId: bodyConvId } = body;
        
        // Use conversationId from body if available, else fallback to bodyId if it looks like a UUID
        const conversationId = bodyConvId || (bodyId?.includes("-") ? bodyId : null);
        
        // Business identification:
        // 1. Explicit slug in body
        // 2. bodyId if it doesn't look like a UUID (some clients send slug as ID)
        // 3. Extract from Referer header (fallback for generic /api/chat calls)
        let slug = bodySlug || (!bodyId?.includes("-") ? bodyId : null);

        if (!slug) {
            const referer = req.headers.get("referer");
            if (referer) {
                try {
                    const url = new URL(referer);
                    const parts = url.pathname.split("/");
                    if (parts[1] === "chat" && parts[2]) {
                        slug = parts[2];
                    }
                } catch (e) {
                    console.error("[Chat API] Failed to parse referer:", e);
                }
            }
        }

        if (!slug) {
            return new Response("Missing slug/id", { status: 400 });
        }

        // Fetch business
        const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.slug, slug))
            .limit(1);

        if (!business) {
            console.error(`[Chat API] Business not found for slug: ${slug}`);
            return new Response("Bot not found", { status: 404 });
        }

        const config = (business.config ?? {}) as Record<string, unknown>;
        const persona = (config.persona as Record<string, unknown> | undefined) ?? {};
        const branding = (business.branding ?? {}) as Record<string, unknown>;
        const personaName = typeof persona.name === "string" ? persona.name : `${business.name} Assistant`;
        const personaPersonality = typeof persona.personality === "string"
            ? persona.personality
            : "Professional, friendly, and helpful";
        const personaCapabilities = Array.isArray(persona.capabilities)
            ? persona.capabilities.filter((v): v is string => typeof v === "string").join(", ")
            : "";
        const escalationEmail = typeof config.escalationEmail === "string"
            ? config.escalationEmail
            : "support team";
        const businessHours = typeof config.businessHours === "string"
            ? config.businessHours
            : "Not specified";
        const welcomeMessage = typeof branding.welcomeMessage === "string"
            ? branding.welcomeMessage
            : "Hi! How can I help you?";
        const autoHandoffThreshold = Number(config?.autoHandoffConfidenceThreshold ?? 0.55);

        // Fetch business plan
        const isPaid = false; // Platform is now 100% free

        // Log API request event
        await db.insert(analyticsEvents).values({
            businessId: business.id,
            event: "api_request",
        });

        // RAG retrieval
        let contextText = "";
        let userMessage = "";
        let topSimilarity = 0;
        let userSentiment: "positive" | "neutral" | "negative" | "frustrated" = "neutral";
        try {
            const incomingMessages = Array.isArray(messages) ? (messages as IncomingMessage[]) : [];
            const lastMsg = incomingMessages[incomingMessages.length - 1];
            if (lastMsg) {
                // Sanitize + cap user input before any processing
                userMessage = sanitizeUserInput(
                    extractMessageText(lastMsg).slice(0, MAX_USER_MESSAGE_LENGTH)
                );
            }

            // -- Handle Conversation Persistence --
            if (conversationId && userMessage) {
                const existing = await db
                    .select()
                    .from(conversations)
                    .where(eq(conversations.id, conversationId))
                    .limit(1);
                    
                if (existing.length === 0) {
                    await db.insert(conversations).values({
                        id: conversationId,
                        businessId: business.id,
                    });
                    
                    await db.insert(analyticsEvents).values({
                        businessId: business.id,
                        event: "chat_started",
                        data: { conversationId },
                    });
                    
                    await triggerNewConversation(business.id, {
                        id: conversationId,
                        customerName: "Anonymous",
                        customerEmail: null,
                        status: "active",
                        assignedAgent: null,
                        messageCount: 1,
                        lastMessage: { role: "user", content: userMessage, createdAt: new Date().toISOString() },
                        updatedAt: new Date().toISOString(),
                    });
                } else {
                    // Update conversation timestamp
                    await db.update(conversations)
                        .set({ updatedAt: new Date() })
                        .where(eq(conversations.id, conversationId));
                }

                // Insert user message to DB
                await db.insert(dbMessages).values({
                    conversationId,
                    role: "user",
                    content: userMessage,
                });

                // Trigger real-time event for agents
                await triggerConversationMessage(conversationId, {
                    role: "user",
                    content: userMessage,
                });
            }

            if (userMessage) {
                const queryEmbedding = await generateEmbedding(userMessage);
                if (queryEmbedding?.length) {
                    const results = await db.execute(
                        sql`SELECT content, 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
                FROM documents 
                WHERE business_id = ${business.id}
                AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > 0.4
                ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
                LIMIT 8`
                    );
                    if (results.rows?.length) {
                        topSimilarity = Number(results.rows[0]?.similarity ?? 0);
                        // Wrap context in XML delimiters so the LLM treats it as data, not instructions
                        contextText = wrapContext(
                            results.rows.map((r) => r.content as string).join("\n\n")
                        );
                    }
                }
            }

            if (userMessage) {
                userSentiment = analyzeSentiment(userMessage);
            }
        } catch (err) {
            console.error("[RAG] Error:", err);
        }

        const lowConfidence = !contextText || topSimilarity < autoHandoffThreshold;
        if (userMessage && lowConfidence) {
            await trackKnowledgeGap(business.id, userMessage);
            await logAnalyticsEvent(business.id, "knowledge_gap", {
                conversationId,
                topSimilarity,
                threshold: autoHandoffThreshold,
            });
        }

        const systemPrompt = `${ANTI_INJECTION_PREAMBLE}
You are ${personaName}, a customer service AI for ${business.name} (${business.type} business).

    PERSONALITY: ${personaPersonality}

BUSINESS CONTEXT:
${contextText ? contextText : "<business_context>\nNo specific context found.\n</business_context>"}

CAPABILITIES: Answer customer questions based on business context

RULES:
- Always be helpful, polite, and professional
- Use the business context to give accurate answers
- If you don't know something, say so and offer to connect with a human agent
- Respond in the same language the customer uses
- Keep responses concise but thorough
- You are an FAQ-only bot. You CANNOT look up orders or process returns. If the user asks about these, politely explain that they should contact support directly.
- Direct return requests and order queries to a human agent
- If confidence is low OR the user seems frustrated, proactively offer to transfer to a human agent
- Business hours: ${businessHours}
- For urgent issues, suggest emailing: ${escalationEmail}

REAL-TIME SIGNALS:
- retrievalTopSimilarity=${topSimilarity.toFixed(2)} (threshold ${autoHandoffThreshold.toFixed(2)})
- userSentiment=${userSentiment}

Welcome message: ${welcomeMessage}`;

        return await withRetry(async (ai, modelId) => {
            const incomingMessages = Array.isArray(messages) ? (messages as IncomingMessage[]) : [];

            // Cap history to prevent context-stuffing attacks
            const cappedMessages = capHistory(incomingMessages);

            const cleanMessages = cappedMessages
                .map((msg) => {
                    const role = msg.role === "system" || msg.role === "tool" ? "user" : msg.role;
                    return {
                        role: role === "assistant" ? "assistant" : "user",
                        // Re-sanitize each historical turn (defence-in-depth)
                        content: sanitizeUserInput(
                            extractMessageText(msg).slice(0, MAX_USER_MESSAGE_LENGTH)
                        ),
                    };
                })
                .filter((msg) => ["user", "assistant"].includes(msg.role) && msg.content.trim());

            while (cleanMessages.length > 0 && cleanMessages[0].role === "assistant") {
                cleanMessages.shift();
            }

            const merged: Array<{ role: "user" | "assistant"; content: string }> = [];
            for (const msg of cleanMessages) {
                if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
                    merged[merged.length - 1].content += "\n\n" + msg.content;
                } else {
                    merged.push(msg as { role: "user" | "assistant"; content: string });
                }
            }

            const final = [...merged];
            if (final.length > 0 && final[0].role === "user") {
                // Wrap user turn in XML tag to clearly separate it from system instructions
                final[0].content = systemPrompt + "\n\n---\n\n" + wrapUserMessage(final[0].content);
            } else {
                // No existing messages — prepend the system prompt as the first user turn
                final.unshift({ role: "user" as const, content: systemPrompt });
            }

            const result = streamText({
                model: ai.chat(modelId),
                messages: final,
                maxRetries: 1,
                tools: {
                    escalateToAgent: tool({
                        description: "Transfer conversation to a human agent",
                        parameters: z.object({
                            reason: z.string().describe("Why the customer needs a human agent"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async ({ reason }: { reason?: string }) => {
                            // Check for online agents
                            const onlineAgents = await db
                                .select()
                                .from(agents)
                                .where(
                                    and(
                                        eq(agents.businessId, business.id),
                                        eq(agents.status, "online")
                                    )
                                );

                            if (onlineAgents.length > 0) {
                                if (conversationId) {
                                    await db.update(conversations)
                                        .set({ status: "escalated", updatedAt: new Date() })
                                        .where(eq(conversations.id, conversationId));

                                    await db.insert(analyticsEvents).values({
                                        businessId: business.id,
                                        event: "escalated",
                                        data: { conversationId, reason, online: true },
                                    });

                                    await triggerHandoff(business.id, conversationId, reason);
                                }

                                return {
                                    escalated: true,
                                    online: true,
                                    reason,
                                    message: "I've notified our support team. An agent will be with you shortly.",
                                };
                            }

                            if (conversationId) {
                                await db.update(conversations)
                                    .set({ status: "escalated", updatedAt: new Date() })
                                    .where(eq(conversations.id, conversationId));

                                await db.insert(analyticsEvents).values({
                                    businessId: business.id,
                                    event: "escalated",
                                    data: { conversationId, reason, online: false },
                                });

                                await triggerHandoff(business.id, conversationId, reason);
                            }

                            const email = config.escalationEmail || "our support team";
                            return {
                                escalated: true,
                                online: false,
                                reason,
                                message: `It looks like our team is currently away. Please send an email to ${email} and we'll get back to you as soon as possible.`,
                            };
                        },
                    }),
                    searchWeb: tool({
                        description: "Search the web for live, up-to-date information to answer a customer question. Use this when the knowledge base doesn't have a good answer.",
                        parameters: z.object({
                            query: z.string().describe("The search query"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async ({ query }: { query: string }) => {
                            const result = await searchWeb(sanitizeUserInput(query.slice(0, 200)));
                            return result;
                        },
                    }),
                    fetchPage: tool({
                        description: "Fetch the content of a specific web page URL to answer questions about it.",
                        parameters: z.object({
                            url: z.string().describe("The full URL to fetch (must start with http:// or https://)"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async ({ url }: { url: string }) => {
                            return fetchPage(url);
                        },
                    }),
                },
                onFinish: async ({ text, toolCalls, toolResults }) => {
                    if (conversationId) {
                        if (lowConfidence && userSentiment === "frustrated") {
                            await db.update(conversations)
                                .set({ status: "escalated", updatedAt: new Date() })
                                .where(eq(conversations.id, conversationId));

                            await logAnalyticsEvent(business.id, "smart_handoff_triggered", {
                                conversationId,
                                topSimilarity,
                                threshold: autoHandoffThreshold,
                                userSentiment,
                            });
                            
                            await triggerHandoff(business.id, conversationId, "Smart handoff triggered");
                        }

                        await db.insert(dbMessages).values({
                            conversationId,
                            role: "assistant",
                            content: text || "",
                            metadata: { toolCalls, toolResults, topSimilarity, lowConfidence, userSentiment }
                        });
                        
                        await triggerConversationMessage(conversationId, {
                            role: "assistant",
                            content: text || "",
                        });
                    }
                }
            });

            return result.toUIMessageStreamResponse({
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                },
            });
        });
    } catch (error) {
        console.error("[Chat Error]", error);
        return new Response(
            JSON.stringify({ error: "Service temporarily unavailable" }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    }
}

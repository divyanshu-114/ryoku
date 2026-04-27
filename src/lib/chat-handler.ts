import { streamText, tool } from "ai";
import { db } from "@/lib/db";
import { businesses, conversations, messages as dbMessages, analyticsEvents } from "@/lib/db/schema";
import { triggerConversationMessage, triggerNewConversation } from "@/lib/pusher-server";
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

const WAIT_MESSAGE = "An agent will be with you shortly. Please hold on.";

async function makeWaitResponse(conversationId: string): Promise<Response> {
    const [savedBotMsg] = await db.insert(dbMessages).values({
        conversationId,
        role: "assistant",
        content: WAIT_MESSAGE,
    }).returning();

    await triggerConversationMessage(conversationId, {
        id: savedBotMsg.id,
        role: "assistant",
        content: WAIT_MESSAGE,
    });

    return new Response(
        `0:${JSON.stringify(WAIT_MESSAGE)}\nd:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n`,
        {
            headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "x-vercel-ai-data-stream": "v1",
                "Access-Control-Allow-Origin": "*",
            },
        }
    );
}

export async function handleChatPOST(
    req: Request,
    slug: string
) {
    try {
        const body = await req.json();
        const { messages, id: bodyId, conversationId: bodyConvId } = body;

        // Use conversationId from body if available, else fallback to bodyId if it looks like a UUID
        const conversationId = bodyConvId || (bodyId?.includes("-") ? bodyId : null);

        // Fetch business
        const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.slug, slug))
            .limit(1);

        if (!business) {
            return new Response("Bot not found", { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = business.config as any;
        const persona = config?.persona || {};
        const autoHandoffThreshold = Number(config?.autoHandoffConfidenceThreshold ?? 0.55);

        // Fetch business plan
        const plan = await getBusinessPlan(business.id);
        const isPaid = plan === "paid";

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
            const lastMsg = messages[messages.length - 1];
            if (typeof lastMsg?.content === "string") {
                userMessage = sanitizeUserInput(lastMsg.content.slice(0, MAX_USER_MESSAGE_LENGTH));
            } else if (lastMsg?.parts) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = lastMsg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("");
                userMessage = sanitizeUserInput(raw.slice(0, MAX_USER_MESSAGE_LENGTH));
            } else if (Array.isArray(lastMsg?.content)) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = lastMsg.content.map((p: any) => p.text || "").join("");
                userMessage = sanitizeUserInput(raw.slice(0, MAX_USER_MESSAGE_LENGTH));
            }

            // -- Handle Conversation Persistence --
            if (conversationId && userMessage && userMessage !== "__init__") {
                const existing = await db
                    .select()
                    .from(conversations)
                    .where(eq(conversations.id, conversationId))
                    .limit(1);

                // Detect escalation request before branch so both paths can use it
                const isEscalationRequest = userMessage === "I would like to speak to a human agent, please.";

                if (existing.length === 0) {
                    await db.insert(conversations).values({
                        id: conversationId,
                        businessId: business.id,
                        // If the very first message is an escalation, mark it directly
                        status: isEscalationRequest ? "escalated" : "active",
                    });

                    await db.insert(analyticsEvents).values({
                        businessId: business.id,
                        event: isEscalationRequest ? "escalated" : "chat_started",
                        data: { conversationId },
                    });

                    await triggerNewConversation(business.id, {
                        id: conversationId,
                        customerName: "Anonymous",
                        customerEmail: null,
                        status: isEscalationRequest ? "escalated" : "active",
                        assignedAgent: null,
                        messageCount: 1,
                        lastMessage: { role: "user", content: userMessage, createdAt: new Date().toISOString() },
                        updatedAt: new Date().toISOString(),
                    });

                    if (isEscalationRequest) {
                        const [savedUserMsg] = await db.insert(dbMessages).values({
                            conversationId,
                            role: "user",
                            content: userMessage,
                        }).returning();
                        await triggerConversationMessage(conversationId, {
                            id: savedUserMsg.id,
                            role: "user",
                            content: userMessage,
                        });
                        return makeWaitResponse(conversationId);
                    }
                } else {
                    await db.update(conversations)
                        .set({ updatedAt: new Date() })
                        .where(eq(conversations.id, conversationId));

                    // ── Agent Takeover / Escalation Check ──
                    if (existing[0].assignedAgent || existing[0].status === "escalated" || isEscalationRequest) {
                        const [savedUserMsg] = await db.insert(dbMessages).values({
                            conversationId,
                            role: "user",
                            content: userMessage,
                        }).returning();

                        await triggerConversationMessage(conversationId, {
                            id: savedUserMsg.id,
                            role: "user",
                            content: userMessage,
                        });

                        if (isEscalationRequest) {
                            // Ensure conversation is marked escalated even if the escalation
                            // API call raced or the conversation was freshly created
                            if (existing[0].status !== "escalated") {
                                await db.update(conversations)
                                    .set({ status: "escalated" })
                                    .where(eq(conversations.id, conversationId));
                            }
                            return makeWaitResponse(conversationId);
                        }

                        // Agent has taken over — return empty stream so the chat stays silent
                        return new Response("0:\"\"\n", {
                            headers: {
                                "Content-Type": "text/plain; charset=utf-8",
                                "x-vercel-ai-data-stream": "v1",
                                "Access-Control-Allow-Origin": "*",
                            }
                        });
                    }
                }

                userSentiment = analyzeSentiment(userMessage);
                const [savedUserMsg] = await db.insert(dbMessages).values({
                    conversationId,
                    role: "user",
                    content: userMessage,
                    sentiment: userSentiment,
                }).returning();

                await triggerConversationMessage(conversationId, {
                    id: savedUserMsg.id,
                    role: "user",
                    content: userMessage,
                });
            }

            if (userMessage && userMessage !== "__init__") {
                const queryEmbedding = await generateEmbedding(userMessage);
                if (queryEmbedding?.length) {
                    const results = await db.execute(
                        sql`SELECT content, 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
                FROM documents 
                WHERE business_id = ${business.id}
                AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > 0.4
                ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
                LIMIT 4`
                    );
                    if (results.rows?.length) {
                        topSimilarity = Number(results.rows[0]?.similarity ?? 0);
                        contextText = wrapContext(
                            results.rows.map((r) => r.content as string).join("\n\n")
                        );
                    }
                }
            }
        } catch (err) {
            console.error("[RAG] Error:", err);
        }

        const lowConfidence = !contextText || topSimilarity < autoHandoffThreshold;
        if (userMessage && userMessage !== "__init__" && lowConfidence) {
            await trackKnowledgeGap(business.id, userMessage);
            await logAnalyticsEvent(business.id, "knowledge_gap", {
                conversationId,
                topSimilarity,
                threshold: autoHandoffThreshold,
                userSentiment,
            });
        }

        // Build system prompt
        let systemPrompt = `${ANTI_INJECTION_PREAMBLE}
You are ${persona.name || business.name + " Assistant"} for ${business.name} (${business.type}).
Personality: ${persona.personality || "Helpful and professional"}.
Context: ${contextText || "None"}.
Capabilities: ${isPaid ? (persona.capabilities?.join(", ") || "Support, orders, returns") : "FAQ only"}.
Rules:
- Use context for accuracy.
- If unknown, offer human agent.
- Concise, polite responses.
- ${isPaid ? "Use tools for orders/returns." : "FAQ only; no order/return processing."}
- Proactively offer human handoff if user is frustrated.
- Hours: ${config.businessHours || "Standard"}; Email: ${config.escalationEmail || "Support"}.`;

        if (!isPaid) {
            systemPrompt += "\nFree plan: FAQ ONLY. No order/return/database help.";
        }

        return await withRetry(async (ai, modelId) => {
            const cappedMessages = capHistory(messages);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cleanMessages = cappedMessages.map((m: any) => {
                let content = "";
                if (typeof m.content === "string") content = m.content;
                else if (Array.isArray(m.content))
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    content = m.content.map((p: any) => p.text || "").join("");
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                else if (m.parts) content = m.parts.map((p: any) => p.text || "").join("");

                return {
                    role: m.role,
                    content: sanitizeUserInput(content.slice(0, MAX_USER_MESSAGE_LENGTH)),
                    ...(m.toolCalls ? { toolCalls: m.toolCalls } : {}),
                    ...(m.toolResults ? { toolResults: m.toolResults } : {}),
                };
            }).filter((m: any) => ["user", "assistant", "system", "tool"].includes(m.role) && (m.content.trim() || m.role === "tool" || (m.role === "assistant" && m.toolCalls)));

            while (cleanMessages.length > 0 && cleanMessages[0].role !== "user") {
                cleanMessages.shift();
            }

            const merged: any[] = [];
            for (const msg of cleanMessages) {
                if (merged.length > 0 && merged[merged.length - 1].role === msg.role && msg.role !== "tool") {
                    merged[merged.length - 1].content += "\n\n" + msg.content;
                } else {
                    merged.push(msg);
                }
            }

            const final = [...merged];
            if (final.length > 0 && final[0].role === "user") {
                final[0].content = systemPrompt + "\n\n---\n\n" + wrapUserMessage(final[0].content);
            } else if (final.length === 0 || final[0].role !== "system") {
                final.unshift({ role: "system", content: systemPrompt });
            }

            const result = streamText({
                model: ai.chat(modelId),
                messages: final,
                maxRetries: 1,
                tools: {
                    ...(isPaid ? {
                        lookupOrder: tool({
                            description: "Order status by ID or email",
                            parameters: z.object({
                                orderId: z.string().optional().describe("The order ID"),
                                email: z.string().optional().describe("Customer email"),
                            }),
                            // @ts-expect-error Zod type mismatch with AI SDK
                            execute: async ({ orderId, email }: { orderId?: string; email?: string }) => {
                                const conditions = [];
                                if (orderId) conditions.push(sql`order_id = ${orderId}`);
                                if (email) conditions.push(sql`customer_email = ${email}`);
                                if (conditions.length === 0) return { error: "Need order ID or email" };

                                const result = await db.execute(
                                    sql`SELECT order_id, status, tracking_number, items, total_amount, customer_name 
                        FROM orders 
                        WHERE business_id = ${business.id} 
                        AND ${sql.join(conditions, sql` AND `)}
                        LIMIT 1`
                                );
                                return result.rows?.[0] || { message: "Order not found" };
                            },
                        }),
                        processReturn: tool({
                            description: "Start return request",
                            parameters: z.object({
                                orderId: z.string().describe("The order ID"),
                                reason: z.enum(["defective", "wrong_item", "changed_mind", "other"]).describe("Return reason"),
                                details: z.string().optional().describe("Additional details"),
                            }),
                            // @ts-expect-error Zod type mismatch with AI SDK
                            execute: async ({ orderId, reason, details }: { orderId?: string; reason?: string; details?: string }) => {
                                return {
                                    success: true,
                                    returnId: `RET-${Date.now()}`,
                                    orderId,
                                    reason,
                                    details,
                                    message: `Return request created for order ${orderId}. Our team will review within 24 hours.`,
                                };
                            },
                        }),
                    } : {}),
                    escalateToAgent: tool({
                        description: "Transfer to human agent",
                        parameters: z.object({
                            reason: z.string().describe("Why the customer needs a human agent"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async () => {
                            return {
                                escalated: false,
                                message: "To connect with a human agent, please click the 'Real Agent' button at the top of the chat to verify your email address.",
                            };
                        },
                    }),
                    captureLeadInfo: tool({
                        description: "Save customer contact info",
                        parameters: z.object({
                            email: z.string().optional().describe("Customer email"),
                            phone: z.string().optional().describe("Customer phone"),
                            name: z.string().optional().describe("Customer name"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async ({ email, phone, name }: { email?: string; phone?: string; name?: string }) => {
                            return {
                                captured: true,
                                message: `Thank you${name ? ` ${name}` : ""}! We've noted your contact info and will follow up.`,
                                email,
                                phone,
                            };
                        },
                    }),
                    searchWeb: tool({
                        description: "Search web for live info",
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
                        description: "Fetch web page content",
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
                            await logAnalyticsEvent(business.id, "smart_handoff_suggested", {
                                conversationId,
                                topSimilarity,
                                threshold: autoHandoffThreshold,
                                userSentiment,
                            });
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
                    "x-vercel-ai-data-stream": "v1",
                },
            });
        });
    } catch (error: any) {
        console.error("[Chat Error]", error);
        return new Response(
            JSON.stringify({ error: "Service unavailable", details: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}

export async function handleChatDELETE(
    req: Request
) {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
        return new Response("Missing conversationId", { status: 400 });
    }

    try {
        await db
            .delete(conversations)
            .where(
                and(
                    eq(conversations.id, conversationId),
                    eq(conversations.customerEmailVerified, false)
                )
            );

        return new Response(null, { status: 204 });
    } catch (error) {
        console.error("[Delete Chat Error]", error);
        return new Response("Internal Server Error", { status: 500 });
    }
}

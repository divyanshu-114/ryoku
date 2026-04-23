import { streamText, tool } from "ai";
import { db } from "@/lib/db";
import { businesses, conversations, messages as dbMessages, analyticsEvents } from "@/lib/db/schema";
import { triggerConversationMessage, triggerNewConversation } from "@/lib/pusher";
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

// CORS
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

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const branding = business.branding as any;

        // RAG retrieval
        let contextText = "";
        let userMessage = "";
        let topSimilarity = 0;
        let userSentiment: "positive" | "neutral" | "negative" | "frustrated" = "neutral";
        try {
            const lastMsg = messages[messages.length - 1];
            if (typeof lastMsg?.content === "string") {
                // Sanitize + cap user input before any processing
                userMessage = sanitizeUserInput(lastMsg.content.slice(0, MAX_USER_MESSAGE_LENGTH));
            } else if (lastMsg?.parts) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const raw = lastMsg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("");
                userMessage = sanitizeUserInput(raw.slice(0, MAX_USER_MESSAGE_LENGTH));
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

                    // ── Agent Takeover Check ──
                    // If an agent has taken over this conversation, do NOT call the LLM.
                    // Just persist the user message and push it to the agent via Pusher.
                    if (existing[0].assignedAgent) {
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

                        // Return an empty stream — the agent will reply via Pusher
                        return new Response(
                            new ReadableStream({
                                start(controller) { controller.close(); },
                            }),
                            {
                                headers: {
                                    "Content-Type": "text/plain; charset=utf-8",
                                    "Access-Control-Allow-Origin": "*",
                                },
                            }
                        );
                    }
                }

                // Insert user message to DB and get its ID
                const [savedUserMsg] = await db.insert(dbMessages).values({
                    conversationId,
                    role: "user",
                    content: userMessage,
                }).returning();

                // Trigger real-time event for agents with exact ID
                await triggerConversationMessage(conversationId, {
                    id: savedUserMsg.id,
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

        // Build system prompt
        let systemPrompt = `${ANTI_INJECTION_PREAMBLE}
You are ${persona.name || business.name + " Assistant"}, a customer service AI for ${business.name} (${business.type} business).

PERSONALITY: ${persona.personality || "Professional, friendly, and helpful"}

BUSINESS CONTEXT:
${contextText ? contextText : "<business_context>\nNo specific context found.\n</business_context>"}

CAPABILITIES: ${isPaid ? (persona.capabilities?.join(", ") || "Answer questions, help with orders and returns") : "Answer customer questions based on business context"}

RULES:
- Always be helpful, polite, and professional
- Use the business context to give accurate answers
- If you don't know something, say so and offer to connect with a human agent
- Respond in the same language the customer uses
- Keep responses concise but thorough
- ${isPaid ? "You can help with orders and returns using the provided tools." : "You are an FAQ-only bot. You CANNOT look up orders or process returns. If the user asks about these, politely explain that they should contact support directly."}
- Direct return requests and order queries to a human agent
- If confidence is low OR the user seems frustrated, proactively offer to transfer to a human agent via the "Real Agent" button at the top of the chat
- Business hours: ${config.businessHours || "Not specified"}
- For urgent issues, suggest emailing: ${config.escalationEmail || "support team"}

REAL-TIME SIGNALS:
- retrievalTopSimilarity=${topSimilarity.toFixed(2)} (threshold ${autoHandoffThreshold.toFixed(2)})
- userSentiment=${userSentiment}

Welcome message: ${branding?.welcomeMessage || "Hi! How can I help you?"}`;

        if (!isPaid) {
            systemPrompt += "\n\nCRITICAL: You are on a FREE plan. You must strictly act as an FAQ bot. Do NOT attempt to help with orders, returns, or internal database queries as those features are disabled.";
        }

        // Stream response with tool calling
        return await withRetry(async (ai, modelId) => {
            // Cap history to prevent context-stuffing attacks
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
                    role: m.role === "system" || m.role === "tool" ? "user" : m.role,
                    // Re-sanitize each turn (defence-in-depth)
                    content: sanitizeUserInput(content.slice(0, MAX_USER_MESSAGE_LENGTH)),
                };
            }).filter((m: { role: string; content: string }) => ["user", "assistant"].includes(m.role) && m.content.trim());

            // Remove leading assistant messages
            while (cleanMessages.length > 0 && cleanMessages[0].role === "assistant") {
                cleanMessages.shift();
            }

            // Merge consecutive same-role messages
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const merged: any[] = [];
            for (const msg of cleanMessages) {
                if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
                    merged[merged.length - 1].content += "\n\n" + msg.content;
                } else {
                    merged.push(msg);
                }
            }

            // Prepend system prompt
            const final = [...merged];
            if (final.length > 0 && final[0].role === "user") {
                // Wrap user turn in XML tag to clearly separate it from system instructions
                final[0].content = systemPrompt + "\n\n---\n\n" + wrapUserMessage(final[0].content);
            } else {
                final.unshift({ role: "system", content: systemPrompt });
            }

            const result = streamText({
                model: ai.chat(modelId),
                messages: final,
                maxRetries: 1,
                tools: {
                    ...(isPaid ? {
                        lookupOrder: tool({
                            description: "Look up order status by order ID or customer email",
                            parameters: z.object({
                                orderId: z.string().optional().describe("The order ID"),
                                email: z.string().optional().describe("Customer email"),
                            }),
                            // @ts-expect-error Zod type mismatch with AI SDK
                            execute: async ({ orderId, email }: { orderId?: string; email?: string }) => {
                                // Query orders table
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
                            description: "Initiate a product return request",
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
                        description: "Transfer conversation to a human agent",
                        parameters: z.object({
                            reason: z.string().describe("Why the customer needs a human agent"),
                        }),
                        // @ts-expect-error Zod type mismatch with AI SDK
                        execute: async ({ reason }: { reason?: string }) => {
                            // Redirect to UI-based email verification flow
                            return {
                                escalated: false,
                                message: "To connect with a human agent, please click the 'Real Agent' button at the top of the chat to verify your email address.",
                            };
                        },
                    }),
                    captureLeadInfo: tool({
                        description: "Capture customer contact information for follow-up",
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
                            await logAnalyticsEvent(business.id, "smart_handoff_suggested", {
                                conversationId,
                                topSimilarity,
                                threshold: autoHandoffThreshold,
                                userSentiment,
                            });
                            // System prompt already instructs the LLM to proactively offer handoff,
                            // and the LLM will now tell them to use the UI button via the escalateToAgent tool or its own text.
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

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
        return new Response("Missing conversationId", { status: 400 });
    }

    try {
        // Delete the conversation only if it is NOT verified
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

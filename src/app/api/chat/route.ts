import { streamText, tool } from "ai";
import { db } from "@/lib/db";
import { businesses, agents, conversations, messages as dbMessages, analyticsEvents } from "@/lib/db/schema";
import { triggerConversationMessage, triggerNewConversation } from "@/lib/pusher";
import { withRetry, generateEmbedding } from "@/lib/ai-provider";
import { eq, sql, and } from "drizzle-orm";
import { getBusinessPlan } from "@/lib/billing";
import { z } from "zod";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

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

        const config = business.config as any;
        const persona = config?.persona || {};
        const branding = business.branding as any;

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
        try {
            const lastMsg = messages[messages.length - 1];
            if (typeof lastMsg?.content === "string") {
                userMessage = lastMsg.content;
            } else if (lastMsg?.parts) {
                userMessage = lastMsg.parts.filter((p: any) => p.type === "text").map((p: any) => p.text || "").join("");
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
                        contextText = results.rows.map((r) => r.content as string).join("\n\n");
                    }
                }
            }
        } catch (err) {
            console.error("[RAG] Error:", err);
        }

        const systemPrompt = `You are ${persona.name || business.name + " Assistant"}, a customer service AI for ${business.name} (${business.type} business).

PERSONALITY: ${persona.personality || "Professional, friendly, and helpful"}

BUSINESS CONTEXT:
${contextText || "No specific context found."}

CAPABILITIES: ${isPaid ? (persona.capabilities?.join(", ") || "Answer questions, help with orders and returns") : "Answer customer questions based on business context"}

RULES:
- Always be helpful, polite, and professional
- Use the business context to give accurate answers
- If you don't know something, say so and offer to connect with a human agent
- Respond in the same language the customer uses
- Keep responses concise but thorough
- ${isPaid ? "You can help with orders and returns using the provided tools." : "You are an FAQ-only bot. You CANNOT look up orders or process returns. If the user asks about these, politely explain that they should contact support directly."}
- ${config.canProcessReturns === "Yes" && isPaid ? "You CAN help process returns" : "Direct return requests to a human agent"}
- ${config.canLookupOrders === "Yes" && isPaid ? "You CAN look up order status" : "Direct order queries to a human agent"}
- Business hours: ${config.businessHours || "Not specified"}
- For urgent issues, suggest emailing: ${config.escalationEmail || "support team"}

Welcome message: ${branding?.welcomeMessage || "Hi! How can I help you today?"}

${!isPaid ? "CRITICAL: You are on a FREE plan. You must strictly act as an FAQ bot. Do NOT attempt to help with orders, returns, or internal database queries as those features are disabled." : ""}`;

        return await withRetry(async (ai, modelId) => {
            const cleanMessages = messages.map((m: any) => {
                let content = "";
                if (typeof m.content === "string") content = m.content;
                else if (Array.isArray(m.content))
                    content = m.content.map((p: any) => p.text || "").join("");
                else if (m.parts) content = m.parts.map((p: any) => p.text || "").join("");

                return {
                    role: m.role === "system" || m.role === "tool" ? "user" : m.role,
                    content,
                };
            }).filter((m: { role: string; content: string }) => ["user", "assistant"].includes(m.role) && m.content.trim());

            while (cleanMessages.length > 0 && cleanMessages[0].role === "assistant") {
                cleanMessages.shift();
            }

            const merged: any[] = [];
            for (const msg of cleanMessages) {
                if (merged.length > 0 && merged[merged.length - 1].role === msg.role) {
                    merged[merged.length - 1].content += "\n\n" + msg.content;
                } else {
                    merged.push(msg);
                }
            }

            const final = [...merged];
            if (final.length > 0 && final[0].role === "user") {
                final[0].content = systemPrompt + "\n\n---\n\n" + final[0].content;
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
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
                            description: "Initiate a product return request",
                            parameters: z.object({
                                orderId: z.string().describe("The order ID"),
                                reason: z.enum(["defective", "wrong_item", "changed_mind", "other"]).describe("Return reason"),
                                details: z.string().optional().describe("Additional details"),
                            }),
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
                },
                onFinish: async ({ text, toolCalls, toolResults }) => {
                    if (conversationId) {
                        await db.insert(dbMessages).values({
                            conversationId,
                            role: "assistant",
                            content: text || "",
                            metadata: { toolCalls, toolResults }
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

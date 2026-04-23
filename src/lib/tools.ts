/**
 * Agentic tool definitions for Ryoku chatbot.
 *
 * These tools are used by the AI agent during chat to perform real actions
 * on behalf of the customer. Tools are registered with Vercel AI SDK's `tool()` helper.
 *
 * Business type determines which tools are available:
 * - E-Commerce: lookupOrder, processReturn, captureLeadInfo
 * - SaaS: lookupOrder, escalateToAgent, captureLeadInfo
 * - Restaurant: bookAppointment (future), escalateToAgent
 * - All types: escalateToAgent, captureLeadInfo
 */

import { tool } from "@ai-sdk/provider-utils";
import { z } from "zod";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL || "postgres://dummy:dummy@dummy.neon.tech/dummy");

// ── Tool: Look up order ──
export function createLookupOrderTool(businessId: string) {
    return tool({
        description: "Look up order status by order ID or customer email",
        parameters: z.object({
            orderId: z.string().optional().describe("The order ID to look up"),
            email: z.string().optional().describe("Customer email to search by"),
        }),
        // @ts-expect-error Zod type mismatch with AI SDK
        execute: async ({ orderId, email }: { orderId?: string; email?: string }) => {
            if (!orderId && !email) return { error: "Need order ID or email" };

            // Use parameterised queries to prevent SQL injection
            let result;
            if (orderId && email) {
                result = await sql`
                    SELECT order_id, status, tracking_number, items, total_amount, customer_name
                    FROM orders
                    WHERE business_id = ${businessId}
                    AND order_id = ${orderId}
                    AND customer_email = ${email}
                    LIMIT 1
                `;
            } else if (orderId) {
                result = await sql`
                    SELECT order_id, status, tracking_number, items, total_amount, customer_name
                    FROM orders
                    WHERE business_id = ${businessId}
                    AND order_id = ${orderId}
                    LIMIT 1
                `;
            } else {
                result = await sql`
                    SELECT order_id, status, tracking_number, items, total_amount, customer_name
                    FROM orders
                    WHERE business_id = ${businessId}
                    AND customer_email = ${email}
                    LIMIT 1
                `;
            }
            return result[0] || { message: "Order not found" };
        },
    });
}

// ── Tool: Process return (real webhook bridge) ──
export function createProcessReturnTool(businessSlug: string, apiKey: string, conversationId?: string) {
    return tool({
        description: "Initiate a product return request for a customer. Only call this AFTER confirming the customer's order ID and return reason.",
        parameters: z.object({
            orderId: z.string().describe("The order ID to return"),
            reason: z.enum(["defective", "wrong_item", "changed_mind", "other"]).describe("Return reason"),
            details: z.string().optional().describe("Additional details about the return"),
            customerName: z.string().optional().describe("Customer name if known"),
            customerEmail: z.string().optional().describe("Customer email if known"),
        }),
        // @ts-expect-error Zod type mismatch with AI SDK
        execute: async ({ orderId, reason, details, customerName, customerEmail }: {
            orderId: string; reason: string; details?: string; customerName?: string; customerEmail?: string;
        }) => {
            try {
                const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
                const res = await fetch(`${baseUrl}/api/returns`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                        slug: businessSlug,
                        orderId,
                        reason,
                        details,
                        customerName,
                        customerEmail,
                        conversationId,
                    }),
                });

                const data = await res.json();

                if (!res.ok) {
                    return { success: false, error: data.error || "Failed to create return request" };
                }

                return {
                    success: true,
                    returnRequestId: data.returnRequestId,
                    message: data.message,
                };
            } catch (err) {
                return { success: false, error: String(err) };
            }
        },
    });
}


// ── Tool: Escalate to agent ──
export function createEscalateToAgentTool() {
    return tool({
        description: "Transfer the conversation to a human support agent",
        parameters: z.object({
            reason: z.string().describe("Why the customer needs a human agent"),
        }),
        // @ts-expect-error Zod type mismatch with AI SDK
        execute: async ({ reason }: { reason: string }) => {
            return {
                escalated: true,
                reason,
                message: "I've notified our support team. An agent will be with you shortly.",
            };
        },
    });
}

// ── Tool: Capture lead info ──
export function createCaptureLeadTool() {
    return tool({
        description: "Capture customer contact information for follow-up",
        parameters: z.object({
            email: z.string().optional().describe("Customer email"),
            phone: z.string().optional().describe("Customer phone number"),
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
    });
}

// ── Tool: Book appointment ──
export function createBookAppointmentTool(businessId: string) {
    return tool({
        description: "Book an appointment or reservation for a customer",
        parameters: z.object({
            customerName: z.string().describe("Customer name"),
            customerEmail: z.string().optional().describe("Customer email"),
            customerPhone: z.string().optional().describe("Customer phone"),
            service: z.string().optional().describe("Service or appointment type"),
            date: z.string().describe("Date and time (ISO format, e.g. 2026-03-15T10:00:00)"),
            duration: z.number().optional().describe("Duration in minutes (default 30)"),
            notes: z.string().optional().describe("Additional notes"),
        }),
        // @ts-expect-error Zod type mismatch with AI SDK
        execute: async ({ customerName, customerEmail, customerPhone, service, date, duration, notes }: { customerName: string; customerEmail?: string; customerPhone?: string; service?: string; date: string; duration?: number; notes?: string }) => {
            await sql`
                INSERT INTO appointments (business_id, customer_name, customer_email, customer_phone, service, date, duration, notes)
                VALUES (${businessId}, ${customerName}, ${customerEmail || null}, ${customerPhone || null}, ${service || null}, ${date}, ${duration || 30}, ${notes || null})
            `;
            return {
                booked: true,
                message: `Appointment booked for ${customerName} on ${new Date(date).toLocaleString()}. ${service ? `Service: ${service}.` : ""} We'll send a confirmation shortly!`,
            };
        },
    });
}

// ── Tool registry by business type ──
export function getToolsForBusinessType(businessType: string, businessId: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: Record<string, any> = {
        escalateToAgent: createEscalateToAgentTool(),
        captureLeadInfo: createCaptureLeadTool(),
    };

    switch (businessType) {
        case "ecommerce":
        case "retail":
            tools.lookupOrder = createLookupOrderTool(businessId);
            tools.processReturn = createProcessReturnTool(businessId, ""); // apiKey injected at chat route level
            break;
        case "saas":
        case "tech":
            tools.lookupOrder = createLookupOrderTool(businessId);
            break;
        case "restaurant":
        case "food":
            tools.bookAppointment = createBookAppointmentTool(businessId);
            break;
        case "healthcare":
        case "clinic":
        case "salon":
        case "service":
            tools.bookAppointment = createBookAppointmentTool(businessId);
            break;
        default:
            break;
    }

    return tools;
}


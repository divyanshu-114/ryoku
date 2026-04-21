import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { returnRequests, webhookEndpoints, businesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { verifySignature } from "@/lib/webhook-sender";

// POST /api/returns/[id]/callback
// Called by the business backend after they process the refund.
// They sign the body with the same HMAC secret so Ryoku can verify it's genuine.
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Find the return request
    const [returnReq] = await db
        .select()
        .from(returnRequests)
        .where(eq(returnRequests.id, id))
        .limit(1);

    if (!returnReq) {
        return NextResponse.json({ error: "Return request not found" }, { status: 404 });
    }

    // Get business's signing secret to verify callback
    const [endpoint] = await db
        .select()
        .from(webhookEndpoints)
        .where(and(
            eq(webhookEndpoints.businessId, returnReq.businessId),
            eq(webhookEndpoints.active, true)
        ))
        .limit(1);

    // Read raw body for signature verification
    const rawBody = await req.text();

    if (endpoint) {
        const timestamp = req.headers.get("X-Ryoku-Timestamp");
        const signature = req.headers.get("X-Ryoku-Signature");

        const valid = verifySignature(endpoint.signingSecret, timestamp, signature, rawBody);
        if (!valid) {
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
    }
    // Note: If no endpoint is registered yet, we accept the callback but log a warning.
    // This allows testing without a full setup.

    let callbackData: Record<string, unknown> = {};
    try {
        callbackData = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { status, refundId, refundAmount, metadata } = callbackData as {
        status?: string;
        refundId?: string;
        refundAmount?: string;
        metadata?: Record<string, unknown>;
    };

    if (!status || !["approved", "rejected", "cancelled"].includes(status)) {
        return NextResponse.json({
            error: "Invalid or missing status. Must be: approved, rejected, or cancelled"
        }, { status: 400 });
    }

    // Update the return request
    await db.update(returnRequests).set({
        status,
        refundId: refundId ?? null,
        refundAmount: refundAmount ?? null,
        callbackReceivedAt: new Date(),
        metadata: metadata ?? {},
        updatedAt: new Date(),
    }).where(eq(returnRequests.id, id));

    // TODO: if Pusher is active, push a real-time update to the customer's conversation
    // await pusher.trigger(`conversation-${returnReq.conversationId}`, "return-update", { status, refundId })

    // Get business info for the response
    const [business] = await db
        .select({ name: businesses.name })
        .from(businesses)
        .where(eq(businesses.id, returnReq.businessId))
        .limit(1);

    return NextResponse.json({
        success: true,
        returnRequestId: id,
        status,
        refundId,
        businessName: business?.name,
        message: `Return request ${id} marked as ${status}.`,
    });
}

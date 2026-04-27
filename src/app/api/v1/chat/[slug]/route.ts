import { handleChatPOST, handleChatDELETE } from "@/lib/chat-handler";
import { db } from "@/lib/db";
import { apiKeys, businesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { apiRateLimit } from "@/lib/redis";
import crypto from "crypto";
import { NextResponse } from "next/server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    // Validate API key from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
            { error: "Missing API key. Include: Authorization: Bearer rk_live_..." },
            { status: 401, headers: CORS_HEADERS }
        );
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey.startsWith("rk_live_")) {
        return NextResponse.json(
            { error: "Invalid API key format" },
            { status: 401, headers: CORS_HEADERS }
        );
    }

    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const [apiKey] = await db
        .select({ id: apiKeys.id, businessId: apiKeys.businessId })
        .from(apiKeys)
        .where(and(eq(apiKeys.keyHash, keyHash), eq(apiKeys.active, true)))
        .limit(1);

    if (!apiKey) {
        return NextResponse.json(
            { error: "Invalid or revoked API key" },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    // Ensure the key belongs to the business matching the slug
    const [business] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(and(eq(businesses.id, apiKey.businessId), eq(businesses.slug, slug)))
        .limit(1);

    if (!business) {
        return NextResponse.json(
            { error: "This API key does not belong to the requested business" },
            { status: 403, headers: CORS_HEADERS }
        );
    }

    // Per-key rate limiting: 60 req/min
    const { success } = await apiRateLimit.limit(apiKey.id);
    if (!success) {
        return NextResponse.json(
            { error: "Rate limit exceeded. Max 60 requests per minute per key." },
            { status: 429, headers: { ...CORS_HEADERS, "Retry-After": "60" } }
        );
    }

    // Track usage timestamp (non-blocking — don't delay the response)
    db.update(apiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(apiKeys.id, apiKey.id))
        .catch(() => {});

    return handleChatPOST(req, slug);
}

export async function DELETE(req: Request) {
    return handleChatDELETE(req);
}

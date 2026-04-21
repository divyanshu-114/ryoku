import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiKeys, businesses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

// Generate a secure API key: rk_live_<32 hex chars>
function generateApiKey(): { raw: string; hash: string; prefix: string } {
    const raw = `rk_live_${crypto.randomBytes(24).toString("hex")}`;
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    const prefix = raw.slice(0, 15) + "...";
    return { raw, hash, prefix };
}

// GET /api/keys — List API keys for the authenticated user's business
export async function GET() {
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

    const keys = await db
        .select({
            id: apiKeys.id,
            keyPrefix: apiKeys.keyPrefix,
            name: apiKeys.name,
            active: apiKeys.active,
            lastUsedAt: apiKeys.lastUsedAt,
            createdAt: apiKeys.createdAt,
        })
        .from(apiKeys)
        .where(eq(apiKeys.businessId, business.id));

    return NextResponse.json({ keys });
}

// POST /api/keys — Generate a new API key
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const keyName = body.name || "Default";

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // Limit: max 5 active keys per business
    const existingKeys = await db
        .select()
        .from(apiKeys)
        .where(and(eq(apiKeys.businessId, business.id), eq(apiKeys.active, true)));

    if (existingKeys.length >= 5) {
        return NextResponse.json(
            { error: "Maximum 5 active API keys allowed" },
            { status: 400 }
        );
    }

    const { raw, hash, prefix } = generateApiKey();

    await db.insert(apiKeys).values({
        businessId: business.id,
        keyHash: hash,
        keyPrefix: prefix,
        name: keyName,
    });

    // Return the raw key ONLY on creation — never shown again
    return NextResponse.json({
        key: raw,
        prefix,
        name: keyName,
        message: "Save this key — it won't be shown again.",
    });
}

// DELETE /api/keys — Revoke an API key
export async function DELETE(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
        return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    // Soft-delete: set active to false
    await db
        .update(apiKeys)
        .set({ active: false })
        .where(and(eq(apiKeys.id, keyId), eq(apiKeys.businessId, business.id)));

    return NextResponse.json({ success: true });
}

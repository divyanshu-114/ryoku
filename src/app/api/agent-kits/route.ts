import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import {
    AGENT_KITS,
    getAgentKitById,
    mergeKitIntoBusinessConfig,
} from "@/lib/agent-kits";

// GET /api/agent-kits?category=support
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const kits = category
        ? AGENT_KITS.filter((kit) => kit.category === category)
        : AGENT_KITS;

    return NextResponse.json({ kits });
}

// POST /api/agent-kits
// Body: { slug, kitId, overrides? }
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { slug, kitId, overrides } = body as {
        slug?: string;
        kitId?: string;
        overrides?: Record<string, unknown>;
    };

    if (!slug || !kitId) {
        return NextResponse.json(
            { error: "Missing slug or kitId" },
            { status: 400 }
        );
    }

    const kit = getAgentKitById(kitId);
    if (!kit) {
        return NextResponse.json({ error: "Invalid kitId" }, { status: 400 });
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(
            and(
                eq(businesses.slug, slug),
                eq(businesses.userId, session.user.id)
            )
        )
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const existingConfig = (business.config ?? {}) as Record<string, unknown>;
    const nextConfig = mergeKitIntoBusinessConfig(existingConfig, {
        ...kit.config,
        appliedKitId: kit.id,
    }, overrides ?? {});

    const existingBranding = (business.branding ?? {}) as Record<string, unknown>;
    const nextBranding = {
        ...existingBranding,
        ...(kit.branding ?? {}),
    };

    await db
        .update(businesses)
        .set({
            config: nextConfig,
            branding: nextBranding,
            updatedAt: new Date(),
        })
        .where(eq(businesses.id, business.id));

    return NextResponse.json({
        success: true,
        appliedKit: kit,
        business: {
            id: business.id,
            slug: business.slug,
            config: nextConfig,
            branding: nextBranding,
        },
    });
}

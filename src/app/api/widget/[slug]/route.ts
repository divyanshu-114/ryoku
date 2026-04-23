import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, widgetConfigs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET /api/widget/[slug] — Get widget configuration for a business (public, no auth)
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.slug, slug))
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    // Get widget config or defaults
    const [widget] = await db
        .select()
        .from(widgetConfigs)
        .where(eq(widgetConfigs.businessId, business.id))
        .limit(1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const branding = (business.branding as Record<string, any>) || {};

    return NextResponse.json({
        businessName: business.name,
        slug: business.slug,
        widget: widget || {
            position: "bottom-right",
            theme: "dark",
            bubbleColor: branding.accentColor || "#6366f1",
            bubbleIcon: "chat",
            headerText: "Chat with us",
            initiallyOpen: false,
        },
    });
}

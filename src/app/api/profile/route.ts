import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, subscriptions, billingPlans } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

// GET: fetch current user's business
export async function GET() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [business] = await db
        .select({
            id: businesses.id,
            slug: businesses.slug,
            name: businesses.name,
            type: businesses.type,
            config: businesses.config,
            branding: businesses.branding,
            planName: billingPlans.name,
        })
        .from(businesses)
        .leftJoin(subscriptions, eq(businesses.id, subscriptions.businessId))
        .leftJoin(billingPlans, eq(subscriptions.planId, billingPlans.id))
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    return NextResponse.json({ business: business || null });
}

// DELETE: delete current user's business
export async function DELETE() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.delete(businesses).where(eq(businesses.userId, session.user.id));
    return NextResponse.json({ success: true });
}

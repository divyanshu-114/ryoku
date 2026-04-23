import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
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
        })
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    const businessWithPlan = business ? { ...business, planName: "Free" } : null;

    return NextResponse.json({ business: businessWithPlan });
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

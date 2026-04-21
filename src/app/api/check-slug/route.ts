import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";

export async function GET(req: NextRequest) {
    const slug = req.nextUrl.searchParams.get("slug");
    const userId = req.nextUrl.searchParams.get("userId");

    if (!slug) {
        return NextResponse.json({ available: false });
    }

    const existing = await db
        .select({ userId: businesses.userId })
        .from(businesses)
        .where(
            userId
                ? and(eq(businesses.slug, slug), ne(businesses.userId, userId))
                : eq(businesses.slug, slug)
        )
        .limit(1);

    return NextResponse.json({ available: existing.length === 0 });
}

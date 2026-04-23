import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
    const session = await auth();
    const slug = req.nextUrl.searchParams.get("slug");
    const userId = session?.user?.id;

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

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, conversations } from "@/lib/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";

// GET /api/analytics/export — Export conversations as CSV or JSON
export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "json";
    const days = parseInt(searchParams.get("days") || "30");
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Fetch conversations with contact info
    const convos = await db
        .select()
        .from(conversations)
        .where(and(
            eq(conversations.businessId, business.id),
            gte(conversations.createdAt, since),
            sql`(${conversations.customerEmail} IS NOT NULL OR ${conversations.customerPhone} IS NOT NULL)`
        ))
        .orderBy(desc(conversations.createdAt));

    const exportData = convos.map((convo) => ({
        id: convo.id,
        name: convo.customerName || "Anonymous",
        email: convo.customerEmail || "N/A",
        phone: convo.customerPhone || "N/A",
        createdAt: convo.createdAt,
    }));

    if (format === "csv") {
        const headers = ["id", "customer_name", "customer_email", "customer_phone", "created_at"];
        const rows = exportData.map((c) => [
            c.id,
            `"${c.name.replace(/"/g, '""')}"`,
            c.email,
            c.phone,
            c.createdAt?.toISOString() || "",
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="customer-data-${business.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    }

    return NextResponse.json({ customers: exportData, count: exportData.length });
}

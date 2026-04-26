import { NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
    try {
        const { slug, email, name, query } = await req.json();

        if (!slug || !email || !query) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (!process.env.RESEND_API_KEY) {
            return NextResponse.json({ error: "Email service not configured" }, { status: 500 });
        }

        const resend = new Resend(process.env.RESEND_API_KEY);

        const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.slug, slug))
            .limit(1);

        if (!business) {
            return NextResponse.json({ error: "Business not found" }, { status: 404 });
        }

        const safeName = escapeHtml(name || "Anonymous");
        const safeEmail = escapeHtml(email);
        const safeQuery = escapeHtml(query);

        // Get escalation email from business config or fallback to support email
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config = business.config as any;
        const targetEmail = config.escalationEmail || process.env.SUPPORT_EMAIL;

        if (!targetEmail) {
            return NextResponse.json({ error: "No support email configured" }, { status: 500 });
        }

        const { error } = await resend.emails.send({
            from: `Ryoku <${process.env.RESEND_EMAIL || "onboarding@resend.dev"}>`,
            to: [targetEmail],
            subject: `Offline Customer Query: ${business.name}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #6366f1;">New Offline Message</h2>
                    <p>A customer tried to reach you while no agents were online.</p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p><strong>Customer:</strong> ${safeName}</p>
                    <p><strong>Email:</strong> ${safeEmail}</p>
                    <p><strong>Query:</strong></p>
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; white-space: pre-wrap;">
                        ${safeQuery}
                    </div>
                    <p style="margin-top: 20px; font-size: 12px; color: #64748b;">
                        Business: ${business.name} (${slug})
                    </p>
                </div>
            `,
        });

        if (error) {
            return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[OfflineQuery]", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

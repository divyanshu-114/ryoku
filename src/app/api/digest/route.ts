import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { businesses, conversations, knowledgeGaps, users } from "@/lib/db/schema";
import { eq, and, gte, count, desc } from "drizzle-orm";
import { Resend } from "resend";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * GET /api/digest
 * Triggered weekly by Vercel cron (see vercel.json).
 * Sends each business owner a summary: chats handled, escalation %, unanswered questions.
 *
 * Vercel cron header: Authorization: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
    // Verify cron secret (prevents public triggering)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const since = new Date();
    since.setDate(since.getDate() - 7);

    // Pull all active businesses
    const allBusinesses = await db
        .select({
            id: businesses.id,
            name: businesses.name,
            slug: businesses.slug,
            userId: businesses.userId,
        })
        .from(businesses);

    let sent = 0;
    let skipped = 0;

    for (const biz of allBusinesses) {
        try {
            const [totalChats, escalatedChats, topGaps, ownerUser] = await Promise.all([
                db.select({ count: count() })
                    .from(conversations)
                    .where(and(eq(conversations.businessId, biz.id), gte(conversations.createdAt, since))),

                db.select({ count: count() })
                    .from(conversations)
                    .where(and(
                        eq(conversations.businessId, biz.id),
                        eq(conversations.status, "escalated"),
                        gte(conversations.createdAt, since)
                    )),

                db.select({ question: knowledgeGaps.question, frequency: knowledgeGaps.frequency })
                    .from(knowledgeGaps)
                    .where(and(eq(knowledgeGaps.businessId, biz.id), eq(knowledgeGaps.resolved, false)))
                    .orderBy(desc(knowledgeGaps.frequency))
                    .limit(5),

                db.select({ email: users.email, name: users.name })
                    .from(users)
                    .where(eq(users.id, biz.userId))
                    .limit(1),
            ]);

            const ownerEmail = ownerUser[0]?.email;
            const ownerName = ownerUser[0]?.name || "there";
            if (!ownerEmail) { skipped++; continue; }

            const total = totalChats[0]?.count ?? 0;
            const escalated = escalatedChats[0]?.count ?? 0;
            const handledRate = total > 0 ? Math.round(((total - escalated) / total) * 100) : 100;

            // Skip emails for completely inactive bots (no chats and no gaps)
            if (total === 0 && topGaps.length === 0) { skipped++; continue; }

            const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ryoku.app";
            const dashboardUrl = `${appUrl}/dashboard`;

            const gapsHtml = topGaps.length > 0
                ? `<div style="margin-top:20px">
                    <p style="font-size:13px;font-weight:600;color:#1a1a1a;margin-bottom:8px">Questions your bot couldn't answer:</p>
                    <table cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse">
                        ${topGaps.map(g => `
                        <tr>
                            <td style="padding:8px 12px;font-size:12px;color:#333;border-bottom:1px solid #f0f0f0">
                                "${g.question}"
                            </td>
                            <td style="padding:8px 12px;font-size:11px;color:#888;text-align:right;border-bottom:1px solid #f0f0f0;white-space:nowrap">
                                ${g.frequency}× asked
                            </td>
                        </tr>`).join("")}
                    </table>
                    <a href="${dashboardUrl}" style="display:inline-block;margin-top:12px;font-size:12px;color:#6366f1;text-decoration:none;font-weight:600">
                        + Add answers to your knowledge base →
                    </a>
                   </div>`
                : `<p style="font-size:13px;color:#555;margin-top:16px">✅ No knowledge gaps this week — great job!</p>`;

            const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Your Ryoku Weekly Digest</title></head>
<body style="margin:0;padding:0;background:#f8f8f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table cellpadding="0" cellspacing="0" width="100%" style="background:#f8f8f8;padding:32px 0">
    <tr><td>
      <table cellpadding="0" cellspacing="0" width="560" align="center" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
        
        <!-- Header -->
        <tr>
          <td style="background:#1a1a1a;padding:24px 32px">
            <span style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-0.5px">Ryoku</span>
            <span style="font-size:11px;color:rgba(255,255,255,0.4);margin-left:8px">/ weekly digest</span>
          </td>
        </tr>
        
        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 0">
            <p style="font-size:15px;color:#1a1a1a;margin:0 0 4px">Hey ${ownerName} 👋</p>
            <p style="font-size:13px;color:#666;margin:0">Here's how <strong>${biz.name}</strong>'s bot did this week.</p>
          </td>
        </tr>
        
        <!-- Stats -->
        <tr>
          <td style="padding:20px 32px">
            <table cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td width="33%" style="text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
                  <p style="font-size:28px;font-weight:800;color:#1a1a1a;margin:0">${total}</p>
                  <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.05em">Chats handled</p>
                </td>
                <td width="4%" style="background:transparent"></td>
                <td width="33%" style="text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
                  <p style="font-size:28px;font-weight:800;color:${handledRate >= 80 ? '#16a34a' : '#d97706'};margin:0">${handledRate}%</p>
                  <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.05em">AI handled</p>
                </td>
                <td width="4%" style="background:transparent"></td>
                <td width="33%" style="text-align:center;padding:16px;background:#f9f9f9;border-radius:8px">
                  <p style="font-size:28px;font-weight:800;color:#6366f1;margin:0">${topGaps.length}</p>
                  <p style="font-size:11px;color:#888;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.05em">Gaps to fill</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        <!-- Unanswered questions -->
        <tr>
          <td style="padding:0 32px 24px">
            ${gapsHtml}
          </td>
        </tr>
        
        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px">
            <a href="${dashboardUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:8px">
              Open Dashboard →
            </a>
            <a href="${appUrl}/chat/${biz.slug}" style="display:inline-block;margin-left:12px;font-size:13px;color:#6366f1;text-decoration:none;font-weight:600">
              Test your bot
            </a>
          </td>
        </tr>
        
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f0f0f0">
            <p style="font-size:11px;color:#aaa;margin:0">
              Ryoku · AI Customer Service · 
              <a href="${dashboardUrl}" style="color:#aaa">Manage notifications</a>
            </p>
          </td>
        </tr>
        
      </table>
    </td></tr>
  </table>
</body>
</html>`;

            await resend.emails.send({
                from: "Ryoku <digest@ryoku.app>",
                to: ownerEmail,
                subject: `${biz.name}: ${total} chats this week${topGaps.length > 0 ? ` · ${topGaps.length} questions to answer` : " · all good! ✅"}`,
                html: emailHtml,
            });

            sent++;
        } catch (err) {
            console.error(`[Digest] Failed for business ${biz.id}:`, err);
            skipped++;
        }
    }

    return NextResponse.json({ success: true, sent, skipped, total: allBusinesses.length });
}

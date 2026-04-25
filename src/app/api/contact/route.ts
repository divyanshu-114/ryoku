import { NextResponse } from "next/server";
import { Resend } from "resend";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const resend = new Resend(requireEnv("RESEND_API_KEY"));

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to send enquiry";
}

/** Escape HTML entities to prevent XSS in email templates. */
function escapeHtml(str: unknown): string {
    return String(str ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, businessType, countryCode, phone, message, plan } = body;

    if (!email || !message) {
      return NextResponse.json(
        { error: "Email and message are required" },
        { status: 400 }
      );
    }

    const safeEmail = escapeHtml(email);
    const safePlan = escapeHtml(plan);
    const safeType = escapeHtml(businessType);
    const safeCode = escapeHtml(countryCode);
    const safePhone = escapeHtml(phone);
    const safeMessage = escapeHtml(message);

    const { data, error } = await resend.emails.send({
      from: `Ryoku <${process.env.RESEND_EMAIL || "onboarding@resend.dev"}>`,
      to: [requireEnv("SUPPORT_EMAIL")],
      subject: `Ryoku ${safePlan} Plan Enquiry — ${safeType}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">New Plan Enquiry</h2>
          <p><strong>Plan:</strong> ${safePlan}</p>
          <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
          <p><strong>Business Type:</strong> ${safeType}</p>
          <p><strong>Contact Number:</strong> ${safeCode} ${safePhone}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin-top: 0; font-weight: bold;">Message:</p>
            <p style="white-space: pre-wrap; margin-bottom: 0;">${safeMessage}</p>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
            Sent via Ryoku Platform Contact Form
          </p>
        </div>
      `,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ error: getErrorMessage(err) }, { status: 500 });
  }
}

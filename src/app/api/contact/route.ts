import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

    const { data, error } = await resend.emails.send({
      from: `Ryoku <${process.env.RESEND_EMAIL || "onboarding@resend.dev"}>`,
      to: [process.env.SUPPORT_EMAIL || "trishitofficial@gmail.com"],
      subject: `Ryoku ${plan} Plan Enquiry — ${businessType}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">New Plan Enquiry</h2>
          <p><strong>Plan:</strong> ${plan}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Business Type:</strong> ${businessType}</p>
          <p><strong>Contact Number:</strong> ${countryCode} ${phone}</p>
          <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;">
            <p style="margin-top: 0; font-weight: bold;">Message:</p>
            <p style="white-space: pre-wrap; margin-bottom: 0;">${message}</p>
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

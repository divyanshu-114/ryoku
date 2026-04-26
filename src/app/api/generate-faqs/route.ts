import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateDraftFaqs } from "@/lib/generate-draft-faqs";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/generate-faqs
 * Takes scraped website content, calls LLM, returns draft Q&A pairs.
 *
 * Body: { content: string, businessType: string, businessName: string, count?: number }
 * Returns: { faqs: { question: string, answer: string }[] }
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { content, businessType, businessName, count } = await req.json();
        console.log(`[API/GenerateFAQs] Generating ${count || 10} FAQs for ${businessName} (${businessType}). Content length: ${content?.length}`);

        if (!content || !businessType) {
            return NextResponse.json({ error: "content and businessType are required" }, { status: 400 });
        }

        const faqs = await generateDraftFaqs(
            content,
            businessType,
            businessName || "your business",
            count || 10
        );

        console.log(`[API/GenerateFAQs] Success. Generated ${faqs.length} FAQs.`);
        return NextResponse.json({ faqs });
    } catch (err) {
        console.error("[API/GenerateFAQs] Error:", err);
        return NextResponse.json({ error: "Failed to generate FAQs" }, { status: 500 });
    }
}

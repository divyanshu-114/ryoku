import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withRetry } from "@/lib/ai-provider";
import { generateText } from "ai";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

/**
 * POST /api/scrape
 * Fetches a URL, strips HTML to plain text, returns cleaned content.
 * Used by the dashboard "Import from Website" feature.
 *
 * Body: { url: string }
 * Returns: { content: string, title: string, wordCount: number }
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { url } = await req.json();
        if (!url || typeof url !== "string") {
            return NextResponse.json({ error: "URL is required" }, { status: 400 });
        }

        // Normalise URL
        const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);

        // SSRF protection: block private/internal IPs
        const hostname = parsed.hostname.toLowerCase();
        if (
            hostname === "localhost" ||
            hostname === "::1" ||
            hostname === "0000:0000:0000:0000:0000:0000:0000:0001" ||
            /^127\./.test(hostname) ||
            /^192\.168\./.test(hostname) ||
            /^10\./.test(hostname) ||
            /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
            /^169\.254\./.test(hostname) ||
            hostname.endsWith(".local") ||
            hostname === "0.0.0.0"
        ) {
            return NextResponse.json(
                { error: "Cannot fetch private or internal URLs" },
                { status: 400 }
            );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(parsed.toString(), {
            signal: controller.signal,
            headers: {
                "User-Agent": "Ryoku-Bot/1.0 (AI customer service setup; +https://ryoku.app)",
                "Accept": "text/html,application/xhtml+xml",
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            return NextResponse.json(
                { error: `Could not fetch page (HTTP ${response.status})` },
                { status: 422 }
            );
        }

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
            return NextResponse.json(
                { error: "URL does not return an HTML page" },
                { status: 422 }
            );
        }

        const html = await response.text();

        // Strip HTML tags, scripts, styles — lightweight without a DOM parser
        const clean = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
            .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
            .replace(/<header[\s\S]*?<\/header>/gi, " ")
            .replace(/<!--[\s\S]*?-->/g, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s{2,}/g, " ")
            .trim();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : parsed.hostname;

        // Limit to ~6000 chars to keep downstream LLM calls fast
        const content = clean.slice(0, 6000);
        const wordCount = content.split(/\s+/).length;

        return NextResponse.json({ content, title, wordCount });
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return NextResponse.json({ error: "Request timed out. The site took too long to respond." }, { status: 408 });
        }
        if (err instanceof TypeError && (err.message.includes("Invalid URL") || err.message.includes("URL"))) {
            return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
        }
        console.error("[Scrape]", err);
        return NextResponse.json({ error: "Failed to fetch URL" }, { status: 500 });
    }
}

/**
 * GET /api/scrape
 * Quick connectivity check — returns 200 if endpoint is reachable.
 */
export async function GET() {
    return NextResponse.json({ ok: true });
}


/**
 * Standalone helper: given scraped text + business type, generate draft FAQs.
 * Called by /api/generate-faqs but exported for reuse.
 */
export async function generateDraftFaqs(
    scrapedContent: string,
    businessType: string,
    businessName: string
): Promise<{ question: string; answer: string }[]> {
    const text = await withRetry(async (ai, modelId) => {
        const { text } = await generateText({
            model: ai.chat(modelId),
            maxRetries: 0,
            prompt: `You are helping set up a customer service AI for "${businessName}", a ${businessType} business.

Based on the website content below, generate 8 realistic customer FAQ Q&A pairs.
Rules:
- Questions should be real things customers ask
- Answers should be specific to this business (use names, details from the content)
- If you don't have specific info, write a sensible placeholder in [brackets]
- Output ONLY a JSON array: [{"question": "...", "answer": "..."}, ...]
- No explanation, no markdown, just the JSON array

WEBSITE CONTENT:
${scrapedContent.slice(0, 4000)}`,
        });
        return text;
    });

    try {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return [];
        const parsed = JSON.parse(match[0]);
        return Array.isArray(parsed)
            ? parsed.filter((f) => f.question && f.answer).slice(0, 8)
            : [];
    } catch {
        return [];
    }
}

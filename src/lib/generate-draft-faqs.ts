import { generateText } from "ai";
import { withRetry } from "@/lib/ai-provider";

/**
 * Given scraped text + business type, generate draft FAQs.
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

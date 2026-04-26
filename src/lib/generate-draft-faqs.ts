import { generateObject } from "ai";
import { withRetry } from "@/lib/ai-provider";
import { z } from "zod";

/**
 * Given scraped text + business type, generate draft FAQs.
 * Optimized for token efficiency.
 */
export async function generateDraftFaqs(
    scrapedContent: string,
    businessType: string,
    businessName: string,
    count: number = 10
): Promise<{ question: string; answer: string }[]> {
    try {
        const { object } = await withRetry(async (ai, modelId) => {
            return await generateObject({
                model: ai.chat(modelId),
                schema: z.object({
                    faqs: z.array(z.object({
                        question: z.string(),
                        answer: z.string(),
                    })).length(count),
                }),
                system: `You are an FAQ generator for "${businessName}" (${businessType}). Generate exactly ${count} JSON Q&A pairs based on the provided website text. Use [brackets] for missing info.`,
                prompt: `WEBSITE TEXT: ${scrapedContent.slice(0, 3000)}`,
            });
        });

        return object.faqs;
    } catch (err) {
        console.error("[GenerateDraftFAQs] error:", err);
        return [];
    }
}

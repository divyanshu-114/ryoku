import { generateText } from "ai";
import { withRetry } from "@/lib/ai-provider";

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
        const { text } = await withRetry(async (ai, modelId) => {
            return await generateText({
                model: ai.chat(modelId),
                system: `You are an FAQ generator for "${businessName}" (${businessType}). 
                Generate exactly ${count} Q&A pairs based on the provided website text. 
                Use [brackets] for missing info.
                
                You MUST return ONLY a valid JSON object with the following structure:
                {
                  "faqs": [
                    { "question": "...", "answer": "..." }
                  ]
                }
                Do not include any other text, markdown formatting, or explanations.`,
                prompt: `WEBSITE TEXT: ${scrapedContent.slice(0, 3000)}`,
            });
        });

        // Clean the text in case the model included markdown blocks
        const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const object = JSON.parse(cleanText);
        return object.faqs || [];
    } catch (err) {
        console.error("[GenerateDraftFAQs] error:", err);
        return [];
    }
}

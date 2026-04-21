import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { embed, embedMany } from "ai";

// ── OpenRouter (Chat) ──
const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://ryoku.app",
        "X-Title": "Ryoku",
    },
});

export const MODELS = {
    FREE_MODELS: [
        "openrouter/free",
        "google/gemini-2.0-flash-lite-preview-02-05:free",
        "google/gemma-2-9b-it:free",
        "meta-llama/llama-3.3-70b-instruct:free",
    ] as const,
};

// ── Google Embeddings ──
const GOOGLE_KEYS = [
    process.env.FREE_API_KEY_1,
    process.env.FREE_API_KEY_2,
    process.env.FREE_API_KEY_3,
].filter(Boolean) as string[];

const EMBEDDING_MODEL = "gemini-embedding-001";

// ── Retry with model rotation ──
export async function withRetry<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (client: any, modelId: string) => Promise<T>,
    retries = 4
): Promise<T> {
    let lastError: unknown;
    const models = MODELS.FREE_MODELS;

    for (let i = 0; i < retries; i++) {
        const modelId = models[i % models.length];
        try {
            console.log(`[AI] Attempt ${i + 1}: ${modelId}`);
            return await fn(openrouter, modelId);
        } catch (error) {
            lastError = error;
            console.warn(`[AI] Attempt ${i + 1} failed:`, error);
            if (i < retries - 1) {
                await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
            }
        }
    }
    throw lastError;
}

// ── Google key rotation for embeddings ──
async function withGoogleRetry<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (provider: any) => Promise<T>
): Promise<T> {
    let lastError: unknown;

    for (let i = 0; i < GOOGLE_KEYS.length; i++) {
        const provider = createGoogleGenerativeAI({ apiKey: GOOGLE_KEYS[i] });
        try {
            return await fn(provider);
        } catch (error) {
            lastError = error;
            console.warn(`[Embed] Google key ${i + 1} failed:`, error);
            if (i < GOOGLE_KEYS.length - 1) {
                await new Promise((r) => setTimeout(r, 500));
            }
        }
    }
    throw lastError;
}

export async function generateEmbedding(text: string): Promise<number[]> {
    return withGoogleRetry(async (google) => {
        const { embedding } = await embed({
            model: google.textEmbeddingModel(EMBEDDING_MODEL),
            value: text,
        });
        return embedding;
    });
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    return withGoogleRetry(async (google) => {
        const { embeddings } = await embedMany({
            model: google.textEmbeddingModel(EMBEDDING_MODEL),
            values: texts,
        });
        return embeddings;
    });
}

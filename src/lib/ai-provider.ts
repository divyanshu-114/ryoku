import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { embed, embedMany } from "ai";

// ── Groq (Chat) ──
const groq = createGroq({
    apiKey: process.env.GROQ_API_KEY,
});

export const MODELS = {
    GROQ_MODELS: [
        "llama-3.3-70b-versatile",
    ] as const,
};

// ── Google Embeddings ──
const GOOGLE_KEYS = [
    process.env.FREE_API_KEY_1,
    process.env.FREE_API_KEY_2,
    process.env.FREE_API_KEY_3,
].filter(Boolean) as string[];

const EMBEDDING_MODEL = "gemini-embedding-001";

// ── Retry with Groq model rotation ──
export async function withRetry<T>(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn: (client: any, modelId: string) => Promise<T>,
    retries = 4
): Promise<T> {
    let lastError: unknown;
    const models = MODELS.GROQ_MODELS;

    for (let i = 0; i < retries; i++) {
        const modelId = models[i % models.length];
        try {
            console.log(`[AI] Attempt ${i + 1}: groq/${modelId}`);
            return await fn(groq, modelId);
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

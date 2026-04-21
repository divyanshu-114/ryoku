import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    headers: {
        "HTTP-Referer": "https://ryoku.app",
        "X-Title": "Ryoku",
    },
});

export const MODELS = [
    "qwen/qwen3-coder:free",
    "google/gemma-3n-e2b-it:free",
    "deepseek/deepseek-r1:free",
    "openrouter/free",
];

async function main() {
    for (const model of MODELS) {
        try {
            console.log(`Testing model: ${model}`);
            const result = await generateText({
                model: openrouter.chat(model),
                prompt: "say hi",
            });
            console.log(`Success ${model}:`, result.text);
        } catch (e) {
            console.error(`Error ${model}:`, e.message);
        }
    }
}

main();

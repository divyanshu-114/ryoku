const { streamText } = require("ai");
const { createGroq } = require("@ai-sdk/groq");

async function check() {
    const groq = createGroq({ apiKey: "test" });
    const result = streamText({
        model: groq.chat("llama-3.1-8b-instant"),
        messages: [{ role: "user", content: "hi" }],
    });
    console.log("Methods on result:", Object.keys(result));
    console.log("toDataStreamResponse type:", typeof result.toDataStreamResponse);
    console.log("toUIMessageStreamResponse type:", typeof result.toUIMessageStreamResponse);
}
check().catch(console.error);

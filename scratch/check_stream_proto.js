const { streamText } = require("ai");
const { createGroq } = require("@ai-sdk/groq");

async function check() {
    const groq = createGroq({ apiKey: "test" });
    const result = streamText({
        model: groq.chat("llama-3.1-8b-instant"),
        messages: [{ role: "user", content: "hi" }],
    });
    console.log("Prototype methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(result)));
}
check().catch(console.error);

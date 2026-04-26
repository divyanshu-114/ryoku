import { generateText, generateObject } from "ai";
import { z } from "zod";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { withRetry, generateEmbedding } from "@/lib/ai-provider";
import {
    sanitizeUserInput,
    ANTI_INJECTION_PREAMBLE,
    MAX_USER_MESSAGE_LENGTH,
    sanitizeFormat,
    wrapContext,
} from "@/lib/prompt-guard";
import { db } from "@/lib/db";
import { businesses } from "@/lib/db/schema";

type ExecuteBody = {
    slug?: string;
    flowId?: string;
    payload?: Record<string, unknown>;
};

const ALLOWED_FLOWS = new Set([
    "knowledge-chatbot",
    "internal-assistant",
    "semantic-search",
    "document-processing",
    "deep-research",
    "agentic-generation",
]);

async function fetchContext(businessId: string, query: string) {
    const embedding = await generateEmbedding(query);
    const result = await db.execute(
        sql`SELECT content, 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
            FROM documents
            WHERE business_id = ${businessId}
            AND 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.35
            ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
            LIMIT 3`
    );

    const rows = result.rows ?? [];
    const snippets = rows.map((row) => ({
        content: String(row.content ?? ""),
        similarity: Number(row.similarity ?? 0),
    }));

    return {
        snippets,
        contextText: snippets.map((s) => s.content).join("\n\n"),
    };
}

export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as ExecuteBody;
    const slug = body.slug?.trim();
    const flowId = body.flowId?.trim();
    const payload = body.payload ?? {};

    if (!slug || !flowId) {
        return NextResponse.json(
            { error: "Missing slug or flowId" },
            { status: 400 }
        );
    }

    if (!ALLOWED_FLOWS.has(flowId)) {
        return NextResponse.json(
            { error: "Unsupported flowId" },
            { status: 400 }
        );
    }

    const [business] = await db
        .select()
        .from(businesses)
        .where(
            and(
                eq(businesses.slug, slug),
                eq(businesses.userId, session.user.id)
            )
        )
        .limit(1);

    if (!business) {
        return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const businessName = business.name;

    if (flowId === "semantic-search") {
        const query = sanitizeUserInput(
            String(payload.query ?? "").trim().slice(0, MAX_USER_MESSAGE_LENGTH)
        );
        if (!query) {
            return NextResponse.json(
                { error: "payload.query is required" },
                { status: 400 }
            );
        }

        const { snippets } = await fetchContext(business.id, query);
        return NextResponse.json({
            flowId,
            result: {
                query,
                matches: snippets,
            },
        });
    }

    if (flowId === "document-processing") {
        const documentText = sanitizeUserInput(
            String(payload.documentText ?? "").trim().slice(0, MAX_USER_MESSAGE_LENGTH * 3)
        );
        if (!documentText) {
            return NextResponse.json(
                { error: "payload.documentText is required" },
                { status: 400 }
            );
        }

        const summary = await withRetry(async (ai, modelId) => {
            const { object } = await generateObject({
                model: ai.chat(modelId),
                schema: z.object({
                    summary: z.string(),
                    keyPoints: z.array(z.string()),
                    actionItems: z.array(z.string()),
                    risks: z.array(z.string()),
                }),
                prompt: `${ANTI_INJECTION_PREAMBLE}
Summarise this doc for ${businessName}.
Doc: ${documentText.slice(0, 5000)}`,
            });
            return object;
        });

        return NextResponse.json({ flowId, result: summary });
    }

    if (flowId === "deep-research") {
        const topic = sanitizeUserInput(
            String(payload.topic ?? "").trim().slice(0, MAX_USER_MESSAGE_LENGTH)
        );
        if (!topic) {
            return NextResponse.json(
                { error: "payload.topic is required" },
                { status: 400 }
            );
        }

        const { contextText } = await fetchContext(business.id, topic);
        const safeContext = wrapContext(contextText);
        const brief = await withRetry(async (ai, modelId) => {
            const { text } = await generateText({
                model: ai.chat(modelId),
                maxRetries: 0,
                prompt: `${ANTI_INJECTION_PREAMBLE}
Create concise markdown research brief for ${businessName}.
Topic: ${topic}
Context: ${safeContext || "None"}
Include: Overview, Insights, Opportunities, Risks, Next Steps.`,
            });
            return text;
        });

        return NextResponse.json({ flowId, result: brief });
    }

    if (flowId === "agentic-generation") {
        const prompt = sanitizeUserInput(
            String(payload.prompt ?? "").trim().slice(0, MAX_USER_MESSAGE_LENGTH)
        );
        // Whitelist format to prevent format-string injection
        const format = sanitizeFormat(String(payload.format ?? "text"));

        if (!prompt) {
            return NextResponse.json(
                { error: "payload.prompt is required" },
                { status: 400 }
            );
        }

        const generated = await withRetry(async (ai, modelId) => {
            const { text } = await generateText({
                model: ai.chat(modelId),
                maxRetries: 0,
                prompt: `${ANTI_INJECTION_PREAMBLE}
You are a generation assistant for ${businessName}.

Requested output format: ${format}
User request:
<user_input>
${prompt}
</user_input>

Return output in the requested format only.`,
            });
            return text;
        });

        return NextResponse.json({ flowId, result: generated });
    }

    const query = sanitizeUserInput(
        String(payload.query ?? payload.prompt ?? "").trim().slice(0, MAX_USER_MESSAGE_LENGTH)
    );
    if (!query) {
        return NextResponse.json(
            { error: "payload.query or payload.prompt is required" },
            { status: 400 }
        );
    }

    const { contextText, snippets } = await fetchContext(business.id, query);
    const safeContext = wrapContext(contextText);
    const answer = await withRetry(async (ai, modelId) => {
        const { text } = await generateText({
            model: ai.chat(modelId),
            maxRetries: 0,
            prompt: `${ANTI_INJECTION_PREAMBLE}
You are a reliable assistant for ${businessName}.

Question: <user_input>${query}</user_input>
Business context:
${safeContext || "<business_context>\nNo specific context found.\n</business_context>"}

Answer clearly and be transparent when context is missing.`,
        });
        return text;
    });

    return NextResponse.json({
        flowId,
        result: {
            answer,
            retrieved: snippets,
        },
    });
}

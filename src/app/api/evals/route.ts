import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type EvalInput = {
    question?: string;
    answer?: string;
    expected?: string;
};

function normalize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}

function overlapScore(a: string, b: string): number {
    const aTokens = new Set(normalize(a));
    const bTokens = new Set(normalize(b));
    if (!aTokens.size || !bTokens.size) return 0;

    let overlap = 0;
    for (const token of aTokens) {
        if (bTokens.has(token)) overlap += 1;
    }

    return overlap / Math.max(aTokens.size, bTokens.size);
}

function scoreAnswer(input: EvalInput) {
    const question = (input.question ?? "").trim();
    const answer = (input.answer ?? "").trim();
    const expected = (input.expected ?? "").trim();

    const relevance = question ? overlapScore(question, answer) : 0.5;
    const groundedness = expected ? overlapScore(expected, answer) : 0.5;
    const completeness = Math.min(answer.length / 260, 1);

    const safetyPenalty = /(hate|kill|illegal|fraud|scam)/i.test(answer) ? 0.3 : 0;
    const hallucinationPenalty = expected && groundedness < 0.15 ? 0.25 : 0;

    const raw =
        relevance * 0.35 +
        groundedness * 0.35 +
        completeness * 0.3 -
        safetyPenalty -
        hallucinationPenalty;

    const score = Math.max(0, Math.min(1, raw));

    return {
        score,
        score100: Math.round(score * 100),
        dimensions: {
            relevance: Number(relevance.toFixed(3)),
            groundedness: Number(groundedness.toFixed(3)),
            completeness: Number(completeness.toFixed(3)),
        },
        penalties: {
            safetyPenalty,
            hallucinationPenalty,
        },
        verdict:
            score >= 0.8
                ? "excellent"
                : score >= 0.65
                  ? "good"
                  : score >= 0.45
                    ? "needs_improvement"
                    : "poor",
    };
}

// POST /api/evals
// Body: { question, answer, expected? }
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as EvalInput;
    if (!body.answer || !body.question) {
        return NextResponse.json(
            { error: "question and answer are required" },
            { status: 400 }
        );
    }

    return NextResponse.json({
        evaluation: scoreAnswer(body),
    });
}

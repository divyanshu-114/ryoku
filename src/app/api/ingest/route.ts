import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { businesses, documents } from "@/lib/db/schema";
import { generateEmbeddings } from "@/lib/ai-provider";
import { eq } from "drizzle-orm";
// Polyfill for pdf-parse which expects browser globals
const nodeGlobal = globalThis as typeof globalThis & {
    DOMMatrix?: typeof DOMMatrix;
    Uint8ClampedArray?: typeof Uint8ClampedArray;
};

if (typeof nodeGlobal.DOMMatrix === "undefined") {
    nodeGlobal.DOMMatrix = class DOMMatrix { } as typeof DOMMatrix;
}
if (typeof nodeGlobal.Uint8ClampedArray === "undefined") {
    nodeGlobal.Uint8ClampedArray = Uint8ClampedArray;
}

import mammoth from "mammoth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * POST /api/ingest
 * Creates or updates a business chatbot with its knowledge base.
 *
 * Accepts multipart/form-data:
 *   - slug       : string   (chat URL handle)
 *   - config     : JSON     (all wizard fields + FAQs array)
 *   - faqFile?   : File     (optional PDF or DOCX)
 *
 * Steps:
 *  1. Upsert the `businesses` row
 *  2. Extract text chunks from config.faqs + optional file
 *  3. Batch-embed all chunks using Google Gemini embeddings
 *  4. Delete old documents and insert fresh embeddings
 */
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const slug = (formData.get("slug") as string | null)?.trim();
    const configRaw = formData.get("config") as string | null;
    const faqFile = formData.get("faqFile") as File | null;

    if (!slug || !configRaw) {
        return NextResponse.json({ error: "slug and config are required" }, { status: 400 });
    }

    // Validate slug format
    if (!/^[a-z0-9-]{3,60}$/.test(slug)) {
        return NextResponse.json(
            { error: "Slug must be 3–60 lowercase letters, numbers, or hyphens" },
            { status: 400 }
        );
    }

    let config: Record<string, unknown>;
    try {
        config = JSON.parse(configRaw);
    } catch {
        return NextResponse.json({ error: "config must be valid JSON" }, { status: 400 });
    }

    const businessName = String(config.businessName || slug).trim();
    const businessType = String(config.businessType || "general").trim();
    const faqs: { question: string; answer: string }[] = Array.isArray(config.faqs)
        ? config.faqs.filter((f: { question?: string; answer?: string }) => f.question?.trim() && f.answer?.trim())
        : [];

    // ── 1. Upsert business ────────────────────────────────────────────────────

    // Check if slug is already owned by another user
    const [existingBySlug] = await db
        .select({ id: businesses.id, userId: businesses.userId })
        .from(businesses)
        .where(eq(businesses.slug, slug))
        .limit(1);

    if (existingBySlug && existingBySlug.userId !== session.user.id) {
        return NextResponse.json({ error: "This chat handle is taken" }, { status: 409 });
    }

    // Check if current user already has a business (we support one per user)
    const [existingOwned] = await db
        .select({ id: businesses.id, slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.userId, session.user.id))
        .limit(1);

    const branding = {
        accentColor: config.accentColor || "#6366f1",
        welcomeMessage: config.welcomeMessage || "Hi! How can I help you?",
    };

    const businessConfig = {
        persona: {
            name: config.personaName || `${businessName} Assistant`,
            personality: config.personality || "Professional, friendly, and helpful",
            capabilities: config.capabilities || [],
        },
        businessHours: config.businessHours || "Not specified",
        escalationEmail: config.escalationEmail || "",
        websiteUrl: config.websiteUrl || "",
        // Store all extra business-type-specific fields
        ...Object.fromEntries(
            Object.entries(config).filter(([k]) =>
                !["businessName", "businessType", "faqs", "faqFile", "accentColor",
                    "welcomeMessage", "personaName", "personality", "capabilities",
                    "businessHours", "escalationEmail",
                    "websiteUrl"].includes(k)
            )
        ),
    };

    let businessId: string;

    if (existingOwned) {
        // Update existing business (allow slug change if the new slug is theirs or free)
        await db.update(businesses)
            .set({
                slug,
                name: businessName,
                type: businessType,
                config: businessConfig,
                branding,
                updatedAt: new Date(),
            })
            .where(eq(businesses.userId, session.user.id));
        businessId = existingOwned.id;
    } else {
        // Create new business
        const [created] = await db.insert(businesses).values({
            userId: session.user.id,
            slug,
            name: businessName,
            type: businessType,
            config: businessConfig,
            branding,
        }).returning({ id: businesses.id });
        businessId = created.id;
    }

    // ── 2. Extract text chunks ───────────────────────────────────────────────

    const chunks: string[] = [];

    // Business overview chunk
    chunks.push(
        `Business: ${businessName}\nType: ${businessType}\n` +
        Object.entries(config)
            .filter(([k, v]) =>
                !["faqs", "faqFile", "accentColor", "welcomeMessage", "businessName", "businessType"].includes(k)
                && typeof v === "string" && v.trim()
            )
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")
    );

    // FAQ chunks — one chunk per Q&A
    for (const faq of faqs) {
        chunks.push(`Q: ${faq.question.trim()}\nA: ${faq.answer.trim()}`);
    }

    // File upload — extract text from PDF or DOCX
    if (faqFile && faqFile.size > 0) {
        try {
            const buffer = Buffer.from(await faqFile.arrayBuffer());
            const name = faqFile.name.toLowerCase();

            let fileText = "";
            if (name.endsWith(".pdf")) {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const pdf = require("pdf-parse");
                const parsed = await pdf(buffer);
                fileText = parsed.text;
            } else if (name.endsWith(".docx") || name.endsWith(".doc")) {
                const result = await mammoth.extractRawText({ buffer });
                fileText = result.value;
            }

            if (fileText.trim()) {
                // Split into ~800-char chunks (roughly one FAQ answer in size)
                const sentences = fileText.replace(/\r\n/g, "\n").split(/\n{2,}|\.\s+/);
                let current = "";
                for (const sentence of sentences) {
                    if ((current + " " + sentence).length > 800) {
                        if (current.trim()) chunks.push(current.trim());
                        current = sentence;
                    } else {
                        current += (current ? " " : "") + sentence;
                    }
                }
                if (current.trim()) chunks.push(current.trim());
            }
        } catch (err) {
            console.error("[Ingest] File parse error:", err);
            // Continue without the file — don't fail the whole ingest
        }
    }

    // ── 3. Embed all chunks ──────────────────────────────────────────────────

    if (chunks.length > 0) {
        try {
            // Cap to 50 chunks to avoid embedding overload on free tier
            const chunksToEmbed = chunks.slice(0, 50);
            const embeddings = await generateEmbeddings(chunksToEmbed);

            // ── 4. Replace documents ─────────────────────────────────────────
            await db.delete(documents).where(eq(documents.businessId, businessId));

            await db.insert(documents).values(
                chunksToEmbed.map((content, i) => ({
                    businessId,
                    content,
                    embedding: embeddings[i],
                    metadata: { source: i === 0 ? "business_overview" : i <= faqs.length ? "faq" : "file" },
                }))
            );
        } catch (err) {
            console.error("[Ingest] Embedding error:", err);
            // Still return success so the business was saved — embeddings can be retried
            return NextResponse.json({
                success: true,
                businessId,
                warning: "Business saved but knowledge base embedding failed. The bot will work with limited context.",
                chunksIngested: 0,
            });
        }
    }

    return NextResponse.json({
        success: true,
        businessId,
        slug,
        chunksIngested: chunks.length,
    });
}

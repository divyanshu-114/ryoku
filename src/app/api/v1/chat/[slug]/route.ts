import { handleChatPOST, handleChatDELETE } from "@/lib/chat-handler";

/**
 * v1 API for Ryoku Chat
 * This is the public-facing versioned endpoint for external integrations.
 */

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
    });
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    return handleChatPOST(req, slug);
}

export async function DELETE(
    req: Request
) {
    return handleChatDELETE(req);
}

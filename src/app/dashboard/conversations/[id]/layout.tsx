import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    return {
        title: `Conversation ${id} | Ryoku Dashboard`,
        description: "View conversation details, messages, and AI summary.",
    };
}

export default function ConversationDetailLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

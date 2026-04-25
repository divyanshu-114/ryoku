import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    return {
        title: `Conversation ${params.id} | Ryoku Dashboard`,
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

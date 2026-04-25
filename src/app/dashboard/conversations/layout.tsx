import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Conversations | Ryoku Dashboard",
    description: "Review and manage your business conversation history.",
};

export default function ConversationsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

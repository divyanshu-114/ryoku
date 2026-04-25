import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Analytics | Ryoku Dashboard",
    description: "Track your chatbot performance, user sentiment, and conversation trends.",
};

export default function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

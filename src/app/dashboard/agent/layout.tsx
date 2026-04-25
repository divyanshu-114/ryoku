import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Agent Workspace | Ryoku Dashboard",
    description: "Real-time command center for managing live handoffs and agent support.",
};

export default function AgentLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

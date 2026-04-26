export type Role = "user" | "assistant" | "system" | "tool";

export interface Message {
    id?: string;
    role: Role;
    content: string;
    createdAt?: string;
    parts?: unknown[];
}

export interface Session {
    id: string;
    slug: string;
}

export interface ChatOptions {
    slug: string;
    messages: Message[];
    onMessage?: (delta: string) => void;
    onError?: (error: Error) => void;
    onFinish?: (fullText: string) => void;
}

export interface EscalateOptions {
    slug: string;
    conversationId?: string;
    reason?: string;
    email?: string;
    phone?: string;
}

export interface OfflineQueryOptions {
    slug: string;
    name: string;
    email: string;
    query: string;
}

export interface AgentStatus {
    online: boolean;
    onlineCount: number;
    agents: {
        id: string;
        name: string;
        avatar: string | null;
        status: "online" | "away" | "offline";
    }[];
}

export interface RyokuConfig {
    baseUrl?: string;
    pusherKey?: string;
    pusherCluster?: string;
    persistSession?: boolean;
}
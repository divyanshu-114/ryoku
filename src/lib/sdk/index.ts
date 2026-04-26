import type { Message, Session, ChatOptions, EscalateOptions, OfflineQueryOptions, AgentStatus, RyokuConfig } from "./types";

export class RyokuChat {
    private baseUrl: string;
    private pusher: unknown | null = null;
    private config: RyokuConfig;
    private currentSession: Session | null = null;
    private unsubscribeCallbacks: (() => void)[] = [];

    constructor(config?: RyokuConfig) {
        this.config = config || {};
        this.baseUrl = this.config.baseUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
        
        if (typeof window !== "undefined" && this.config.pusherKey) {
            try {
                const Pusher = require("pusher-js");
                this.pusher = new Pusher(this.config.pusherKey, {
                    cluster: this.config.pusherCluster || "us2",
                    authEndpoint: `${this.baseUrl}/api/pusher/auth`,
                });
            } catch (e) {
                console.warn("Pusher not available");
            }
        }
    }

    async checkAgentStatus(slug: string): Promise<AgentStatus> {
        const response = await fetch(`${this.baseUrl}/api/agent/status?slug=${encodeURIComponent(slug)}`);
        if (!response.ok) {
            throw new Error(`Failed to check status: ${response.statusText}`);
        }
        return response.json();
    }

    getSession(slug: string): Session {
        if (this.currentSession && this.currentSession.slug === slug) {
            return this.currentSession;
        }

        const storageKey = `ryoku_session_${slug}`;
        let id: string | null = null;

        if (typeof window !== "undefined" && this.config.persistSession !== false) {
            id = localStorage.getItem(storageKey);
        }

        if (!id) {
            id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
            if (typeof window !== "undefined" && this.config.persistSession !== false) {
                localStorage.setItem(storageKey, id);
            }
        }

        this.currentSession = { id, slug };
        return this.currentSession;
    }

    resetSession(slug: string): Session {
        const storageKey = `ryoku_session_${slug}`;
        const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
        
        if (typeof window !== "undefined" && this.config.persistSession !== false) {
            localStorage.setItem(storageKey, id);
        }

        this.currentSession = { id, slug };
        return this.currentSession;
    }

    async chat(options: ChatOptions): Promise<ReadableStream<string> | undefined> {
        const { slug, messages, onMessage, onError, onFinish } = options;
        const session = this.getSession(slug);

        try {
            const response = await fetch(`${this.baseUrl}/api/chat/${slug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages, id: session.id }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Chat failed: ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error("Response body is null");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = "";

            const stream = new ReadableStream<string>({
                start(controller) {
                    const process = async () => {
                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) {
                                    onFinish?.(fullText);
                                    controller.close();
                                    break;
                                }

                                const chunk = decoder.decode(value);
                                const lines = chunk.split("\n");

                                for (const line of lines) {
                                    if (!line.trim()) continue;
                                    
                                    // Vercel AI SDK format: 0:"text"
                                    const sseMatch = line.match(/^(\d+):"([^"]*)"$/);
                                    if (sseMatch) {
                                        const text = sseMatch[2];
                                        fullText += text;
                                        onMessage?.(text);
                                        controller.enqueue(text);
                                        continue;
                                    }
                                    
                                    // JSON format
                                    if (line.startsWith("data: ")) {
                                        const dataStr = line.slice(6).trim();
                                        if (dataStr === "[DONE]" || dataStr === "") continue;

                                        try {
                                            const parsed = JSON.parse(dataStr);
                                            if (parsed.type === "text-delta" && parsed.delta) {
                                                fullText += parsed.delta;
                                                onMessage?.(parsed.delta);
                                                controller.enqueue(parsed.delta);
                                            }
                                        } catch { }
                                    }
                                }
                            }
                        } catch (e) {
                            const error = e instanceof Error ? e : new Error(String(e));
                            onError?.(error);
                            controller.error(error);
                        }
                    };
                    process();
                }
            });

            return stream;
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            onError?.(error);
            throw error;
        }
    }

    async escalate(options: EscalateOptions): Promise<{ success: boolean }> {
        const { slug, conversationId, reason, email, phone } = options;

        const response = await fetch(`${this.baseUrl}/api/chat/escalate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, conversationId, reason, email, phone }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Escalation failed: ${response.statusText}`);
        }

        return response.json();
    }

    async sendOfflineQuery(options: OfflineQueryOptions): Promise<{ success: boolean }> {
        const { slug, name, email, query } = options;

        const response = await fetch(`${this.baseUrl}/api/chat/offline-query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, name, email, query }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Offline query failed: ${response.statusText}`);
        }

        return response.json();
    }

    subscribe(conversationId: string, event: string, callback: (data: unknown) => void): () => void {
        if (!this.pusher) {
            console.warn("Pusher not initialized");
            return () => {};
        }

        const channel = this.pusher.subscribe(`conversation-${conversationId}`);
        channel.bind(event, callback);
        
        const unsubscribe = () => {
            channel.unbind(event, callback);
            this.pusher?.unsubscribe(`conversation-${conversationId}`);
        };

        this.unsubscribeCallbacks.push(unsubscribe);
        return unsubscribe;
    }

    subscribeToAgentStatus(businessId: string, callback: (data: { online: boolean; count: number }) => void): () => void {
        if (!this.pusher) {
            console.warn("Pusher not initialized");
            return () => {};
        }

        const channel = this.pusher.subscribe(`private-business-${businessId}`);
        channel.bind("agent:status", callback);
        
        const unsubscribe = () => {
            channel.unbind("agent:status", callback);
            this.pusher?.unsubscribe(`private-business-${businessId}`);
        };

        this.unsubscribeCallbacks.push(unsubscribe);
        return unsubscribe;
    }

    destroy(): void {
        this.unsubscribeCallbacks.forEach((cb) => cb());
        this.unsubscribeCallbacks = [];
        if (this.pusher) {
            this.pusher.disconnect();
        }
        this.pusher = null;
    }
}

export default RyokuChat;
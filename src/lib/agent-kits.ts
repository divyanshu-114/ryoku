export type AgentKitId =
    | "knowledge-chatbot"
    | "internal-assistant"
    | "semantic-search"
    | "document-processing"
    | "deep-research"
    | "agentic-generation";

export type AgentKitCategory =
    | "support"
    | "search"
    | "automation"
    | "research"
    | "content";

export type AgentKit = {
    id: AgentKitId;
    name: string;
    category: AgentKitCategory;
    description: string;
    tags: string[];
    config: Record<string, unknown>;
    branding?: Record<string, unknown>;
};

export const AGENT_KITS: AgentKit[] = [
    {
        id: "knowledge-chatbot",
        name: "Knowledge Chatbot",
        category: "support",
        description:
            "Answer customer questions from your uploaded docs with smart fallback to human handoff.",
        tags: ["RAG", "FAQ", "customer support"],
        config: {
            canLookupOrders: "No",
            canProcessReturns: "No",
            escalationEmail: "support@yourbusiness.com",
            responseMode: "faq",
            autoHandoffConfidenceThreshold: 0.55,
            persona: {
                name: "Support Assistant",
                personality: "Helpful, concise, and accurate",
                capabilities: ["Answer product and policy questions", "Escalate when uncertain"],
            },
        },
        branding: {
            welcomeMessage: "Hi! Ask me anything about our products, shipping, or policies.",
        },
    },
    {
        id: "internal-assistant",
        name: "Internal Assistant",
        category: "automation",
        description:
            "Help internal teams retrieve process information, SOPs, and policy answers quickly.",
        tags: ["internal", "knowledge", "operations"],
        config: {
            responseMode: "internal",
            autoHandoffConfidenceThreshold: 0.45,
            persona: {
                name: "Ops Assistant",
                personality: "Direct, operational, and detail-oriented",
                capabilities: ["Find SOP answers", "Summarize internal docs", "Suggest next steps"],
            },
        },
    },
    {
        id: "semantic-search",
        name: "Semantic Search",
        category: "search",
        description:
            "Natural language search over uploaded knowledge with top-match snippets.",
        tags: ["vector search", "knowledge retrieval"],
        config: {
            responseMode: "search",
            autoHandoffConfidenceThreshold: 0.4,
            persona: {
                name: "Search Assistant",
                personality: "Precise and factual",
                capabilities: ["Retrieve best matching passages", "Cite source snippets"],
            },
        },
    },
    {
        id: "document-processing",
        name: "Document Processing",
        category: "automation",
        description:
            "Extract structured summaries and action items from long-form documents.",
        tags: ["documents", "summarization", "extraction"],
        config: {
            responseMode: "document",
            autoHandoffConfidenceThreshold: 0.5,
            persona: {
                name: "Document Assistant",
                personality: "Clear and structured",
                capabilities: ["Summarize documents", "Extract entities and action items"],
            },
        },
    },
    {
        id: "deep-research",
        name: "Deep Research",
        category: "research",
        description:
            "Produce structured research briefs from business context and user prompts.",
        tags: ["research", "analysis", "brief"],
        config: {
            responseMode: "research",
            autoHandoffConfidenceThreshold: 0.5,
            persona: {
                name: "Research Assistant",
                personality: "Analytical and balanced",
                capabilities: ["Create research plans", "Summarize tradeoffs", "Recommend actions"],
            },
        },
    },
    {
        id: "agentic-generation",
        name: "Agentic Generation",
        category: "content",
        description:
            "Generate support replies, JSON payloads, or content drafts from prompts.",
        tags: ["generation", "json", "content"],
        config: {
            responseMode: "generation",
            autoHandoffConfidenceThreshold: 0.5,
            persona: {
                name: "Generation Assistant",
                personality: "Creative but grounded",
                capabilities: ["Generate responses", "Output structured JSON", "Rewrite tone"],
            },
        },
    },
];

export function getAgentKitById(id: string): AgentKit | undefined {
    return AGENT_KITS.find((kit) => kit.id === id);
}

export function mergeKitIntoBusinessConfig(
    existingConfig: Record<string, unknown>,
    kitConfig: Record<string, unknown>,
    overrides: Record<string, unknown> = {}
): Record<string, unknown> {
    const existingPersona = (existingConfig.persona ?? {}) as Record<string, unknown>;
    const kitPersona = (kitConfig.persona ?? {}) as Record<string, unknown>;
    const overridePersona = (overrides.persona ?? {}) as Record<string, unknown>;

    return {
        ...existingConfig,
        ...kitConfig,
        ...overrides,
        persona: {
            ...existingPersona,
            ...kitPersona,
            ...overridePersona,
        },
        appliedKitId: overrides.appliedKitId ?? kitConfig.appliedKitId,
    };
}

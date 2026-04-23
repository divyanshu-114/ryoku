import {
    pgTable,
    text,
    timestamp,
    uuid,
    jsonb,
    bigserial,
    integer,
    boolean,
    primaryKey,
    index,
    vector,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Auth.js Tables ──

export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable(
    "accounts",
    {
        userId: uuid("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => [
        primaryKey({ columns: [account.provider, account.providerAccountId] }),
    ]
);

export const sessions = pgTable("sessions", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: uuid("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verification_tokens",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── Business Tables ──

export const businesses = pgTable(
    "businesses",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        slug: text("slug").unique().notNull(),
        name: text("name").notNull(),
        type: text("type").notNull(), // ecommerce, saas, restaurant, etc.
        config: jsonb("config").notNull().default({}),
        branding: jsonb("branding").default({}), // colors, logo, welcome message
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        index("idx_businesses_user").on(table.userId),
        index("idx_businesses_slug").on(table.slug),
    ]
);

// ── Documents (RAG) ──

export const documents = pgTable(
    "documents",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        content: text("content").notNull(),
        embedding: vector("embedding", { dimensions: 3072 }),
        metadata: jsonb("metadata").default({}),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => [index("idx_documents_business").on(table.businessId)]
);

// ── API Keys ──

export const apiKeys = pgTable(
    "api_keys",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        keyHash: text("key_hash").notNull(),
        keyPrefix: text("key_prefix").notNull(), // "rk_live_abc..."
        name: text("name").default("Default"),
        lastUsedAt: timestamp("last_used_at"),
        createdAt: timestamp("created_at").defaultNow(),
        active: boolean("active").default(true),
    },
    (table) => [index("idx_api_keys_business").on(table.businessId)]
);

// ── Conversations ──

export const conversations = pgTable(
    "conversations",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        customerName: text("customer_name"),
        customerEmail: text("customer_email"),
        customerEmailVerified: boolean("customer_email_verified").default(false),
        emailVerificationOtp: text("email_verification_otp"),
        emailVerificationOtpExpiry: timestamp("email_verification_otp_expiry"),
        status: text("status").default("active"), // active, escalated, resolved
        assignedAgent: uuid("assigned_agent"),
        rating: integer("rating"), // 1-5 CSAT
        summary: text("summary"), // AI-generated summary
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        index("idx_conversations_business").on(table.businessId, table.status),
    ]
);

// ── Messages ──

export const messages = pgTable(
    "messages",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => conversations.id, { onDelete: "cascade" }),
        role: text("role").notNull(), // user, assistant, agent, system
        content: text("content").notNull(),
        metadata: jsonb("metadata").default({}), // tool calls, actions
        sentiment: text("sentiment"), // positive, neutral, negative, frustrated
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => [
        index("idx_messages_conversation").on(
            table.conversationId,
            table.createdAt
        ),
    ]
);

// ── Orders (Removed as per request) ──

// ── Phase 2: Analytics Events ──

export const analyticsEvents = pgTable(
    "analytics_events",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        event: text("event").notNull(), // chat_started, chat_ended, tool_called, escalated, csat_submitted, api_request
        data: jsonb("data").default({}),
        apiKeyId: uuid("api_key_id"),
        sessionId: text("session_id"),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => [
        index("idx_analytics_business").on(table.businessId, table.event),
        index("idx_analytics_created").on(table.businessId, table.createdAt),
    ]
);

// ── Phase 2: Knowledge Gaps ──

export const knowledgeGaps = pgTable(
    "knowledge_gaps",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        question: text("question").notNull(),
        frequency: integer("frequency").default(1),
        resolved: boolean("resolved").default(false),
        suggestedAnswer: text("suggested_answer"),
        createdAt: timestamp("created_at").defaultNow(),
        updatedAt: timestamp("updated_at").defaultNow(),
    },
    (table) => [
        index("idx_knowledge_gaps_business").on(table.businessId, table.resolved),
    ]
);

// ── Phase 3: Agents ──

export const agents = pgTable(
    "agents",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        displayName: text("display_name").notNull(),
        avatar: text("avatar"),
        status: text("status").default("offline"), // online, away, offline
        maxConcurrent: integer("max_concurrent").default(5),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => [
        index("idx_agents_business").on(table.businessId, table.status),
    ]
);

// ── Phase 3: Canned Responses ──

export const cannedResponses = pgTable(
    "canned_responses",
    {
        id: uuid("id").defaultRandom().primaryKey(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        title: text("title").notNull(),
        content: text("content").notNull(),
        shortcut: text("shortcut"), // e.g. "/greeting"
        category: text("category").default("general"),
        createdAt: timestamp("created_at").defaultNow(),
    },
    (table) => [
        index("idx_canned_business").on(table.businessId),
    ]
);

// ── Phase 5: Widget Configs ──

export const widgetConfigs = pgTable("widget_configs", {
    id: uuid("id").defaultRandom().primaryKey(),
    businessId: uuid("business_id")
        .notNull()
        .references(() => businesses.id, { onDelete: "cascade" }),
    position: text("position").default("bottom-right"), // bottom-right, bottom-left
    theme: text("theme").default("dark"), // dark, light, auto
    bubbleColor: text("bubble_color").default("#6366f1"),
    bubbleIcon: text("bubble_icon").default("chat"), // chat, headphones, help
    headerText: text("header_text").default("Chat with us"),
    initiallyOpen: boolean("initially_open").default(false),
    allowedOrigins: jsonb("allowed_origins").default(["*"]),
    createdAt: timestamp("created_at").defaultNow(),
});

// ── Push Subscriptions (Web Push API) ──
export const pushSubscriptions = pgTable("push_subscriptions", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
    index("push_sub_user_idx").on(table.userId),
]);

// ── Type exports ──
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type KnowledgeGap = typeof knowledgeGaps.$inferSelect;
export type Agent = typeof agents.$inferSelect;
export type CannedResponse = typeof cannedResponses.$inferSelect;
export type WidgetConfig = typeof widgetConfigs.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

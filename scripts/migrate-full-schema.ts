/**
 * Full schema migration — ensures all tables and columns exist in Neon.
 * Run with: npx tsx scripts/migrate-full-schema.ts
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually
const envPath = resolve(import.meta.dirname || __dirname, "../.env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx);
    const val = trimmed.slice(eqIdx + 1);
    if (!process.env[key]) process.env[key] = val;
}

const sql = neon(process.env.DATABASE_URL!);

async function migrate() {
    console.log("🔄 Running full schema migration...\n");

    // 1. conversations — email verification columns
    const convoAlters = [
        { col: "customer_email_verified", stmt: sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_email_verified BOOLEAN DEFAULT false` },
        { col: "email_verification_otp", stmt: sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email_verification_otp TEXT` },
        { col: "email_verification_otp_expiry", stmt: sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email_verification_otp_expiry TIMESTAMP` },
    ];
    for (const { col, stmt } of convoAlters) {
        try { await stmt; console.log(`  ✓ conversations.${col}`); }
        catch (e: any) { console.error(`  ✕ conversations.${col}:`, e.message); }
    }

    // 2. analytics_events table
    try {
        await sql`CREATE TABLE IF NOT EXISTS analytics_events (
            id BIGSERIAL PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            event TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            api_key_id UUID,
            session_id TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_analytics_business ON analytics_events(business_id, event)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events(business_id, created_at)`;
        console.log("  ✓ analytics_events table");
    } catch (e: any) { console.error("  ✕ analytics_events:", e.message); }

    // 3. knowledge_gaps table
    try {
        await sql`CREATE TABLE IF NOT EXISTS knowledge_gaps (
            id BIGSERIAL PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            question TEXT NOT NULL,
            frequency INTEGER DEFAULT 1,
            resolved BOOLEAN DEFAULT false,
            suggested_answer TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_business ON knowledge_gaps(business_id, resolved)`;
        console.log("  ✓ knowledge_gaps table");
    } catch (e: any) { console.error("  ✕ knowledge_gaps:", e.message); }

    // 4. agents table
    try {
        await sql`CREATE TABLE IF NOT EXISTS agents (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            display_name TEXT NOT NULL,
            avatar TEXT,
            status TEXT DEFAULT 'offline',
            max_concurrent INTEGER DEFAULT 5,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_agents_business ON agents(business_id, status)`;
        console.log("  ✓ agents table");
    } catch (e: any) { console.error("  ✕ agents:", e.message); }

    // 5. canned_responses table
    try {
        await sql`CREATE TABLE IF NOT EXISTS canned_responses (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            shortcut TEXT,
            category TEXT DEFAULT 'general',
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS idx_canned_business ON canned_responses(business_id)`;
        console.log("  ✓ canned_responses table");
    } catch (e: any) { console.error("  ✕ canned_responses:", e.message); }

    // 6. widget_configs table
    try {
        await sql`CREATE TABLE IF NOT EXISTS widget_configs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
            position TEXT DEFAULT 'bottom-right',
            theme TEXT DEFAULT 'dark',
            bubble_color TEXT DEFAULT '#6366f1',
            bubble_icon TEXT DEFAULT 'chat',
            header_text TEXT DEFAULT 'Chat with us',
            initially_open BOOLEAN DEFAULT false,
            allowed_origins JSONB DEFAULT '["*"]',
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        console.log("  ✓ widget_configs table");
    } catch (e: any) { console.error("  ✕ widget_configs:", e.message); }

    // 7. push_subscriptions table
    try {
        await sql`CREATE TABLE IF NOT EXISTS push_subscriptions (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            endpoint TEXT NOT NULL,
            p256dh TEXT NOT NULL,
            auth TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )`;
        await sql`CREATE INDEX IF NOT EXISTS push_sub_user_idx ON push_subscriptions(user_id)`;
        console.log("  ✓ push_subscriptions table");
    } catch (e: any) { console.error("  ✕ push_subscriptions:", e.message); }

    // Verify all tables
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`;
    console.log("\n📋 All tables:", tables.map(t => t.table_name).join(", "));
    console.log("\n✅ Migration complete.");
}

migrate().catch(console.error);

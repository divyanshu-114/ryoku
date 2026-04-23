/**
 * One-shot migration: add email verification columns to conversations table.
 * Run with: npx tsx scripts/migrate-add-email-verification.ts
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env manually (no dotenv dependency)
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
    console.log("🔄 Checking and adding missing columns to conversations table...");

    try {
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_email_verified BOOLEAN DEFAULT false`;
        console.log("  ✓ customer_email_verified");
    } catch (err) { console.error("  ✕ customer_email_verified:", err); }

    try {
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email_verification_otp TEXT`;
        console.log("  ✓ email_verification_otp");
    } catch (err) { console.error("  ✕ email_verification_otp:", err); }

    try {
        await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS email_verification_otp_expiry TIMESTAMP`;
        console.log("  ✓ email_verification_otp_expiry");
    } catch (err) { console.error("  ✕ email_verification_otp_expiry:", err); }

    // Verify
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations' ORDER BY ordinal_position`;
    console.log("\n📋 Current conversations columns:", cols.map(c => c.column_name).join(", "));
    console.log("✅ Migration complete.");
}

migrate().catch(console.error);

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./src/lib/db/schema.js";
import { DrizzleAdapter } from "@auth/drizzle-adapter";

// The imported schema uses generic paths, but drizzle needs the actual runtime ones if running via TS.
// Since we are running via node with ts-node or tsx, we can just test with dynamic import or normal import.
// Actually, I will use a simple query first to verify tables were created.

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  try {
    console.log("schema.users:", !!schema.users);
    const adapter = DrizzleAdapter(db, {
        usersTable: schema.users,
        accountsTable: schema.accounts,
        sessionsTable: schema.sessions,
        verificationTokensTable: schema.verificationTokens,
    });
    // test if user exists or trying a dummy read
    const user = await adapter.getUserByEmail("test@example.com");
    console.log("Database Adapter test successful. User:", user);
  } catch (error) {
    console.error("Adapter Error:", error);
    process.exit(1);
  }
}

main();

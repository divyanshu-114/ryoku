import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

async function main() {
  try {
    console.log("Enabling pgvector extension...");
    await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
    console.log("pgvector extension enabled successfully.");
  } catch (error) {
    console.error("Error enabling pgvector:", error);
  }
}

main();

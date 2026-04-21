import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

async function main() {
  const res = await sql`SELECT slug FROM businesses LIMIT 1`;
  console.log(res);
}

main();

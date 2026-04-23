const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon('postgresql://neondb_owner:npg_QNeoPydEZ5T3@ep-muddy-rice-a4dj6ujd-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require');
  await sql`ALTER TABLE conversations ADD COLUMN IF NOT EXISTS customer_phone text;`;
  console.log('Column added');
}

run().catch(console.error);

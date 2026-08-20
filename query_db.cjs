require('dotenv').config({ path: '.env.local' });

async function run() {
  const { neon } = await import('@neondatabase/serverless');
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não configurado");
  const sql = neon(process.env.DATABASE_URL);

  const res = await sql`
    SELECT id, "buyerId", "productName", "totalPrice", status, "buyerPhone", "createdAt"
    FROM orders ORDER BY id DESC LIMIT 10;
  `;
  console.log(JSON.stringify(res, null, 2));
}

run().catch((e) => console.error(e));

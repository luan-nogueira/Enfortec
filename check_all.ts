import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const orders = await sql`SELECT o.id, o."buyerId", o."productName", o."totalPrice", o.status, o."buyerPhone", o."createdAt", o."paymentId", o."productType", o."digitalProductId", o."sellerId", u.name as buyer_name, u.email as buyer_email FROM orders o LEFT JOIN users u ON o."buyerId"=u.id ORDER BY o."createdAt" ASC`;
  console.log("ALL ORDERS:");
  console.log(JSON.stringify(orders, null, 2));

  const digital = await sql`SELECT id, name, price FROM "digitalProducts" WHERE name ILIKE '%quiet place%'`;
  console.log("DIGITAL QUIET PLACE:", JSON.stringify(digital, null, 2));
}

main().catch((e) => console.error(e));
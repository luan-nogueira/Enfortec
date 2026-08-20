import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const dismissed = await sql`SELECT * FROM "admin_dismissed_notifications" ORDER BY "dismissedAt" DESC LIMIT 30`;
  console.log("DISMISSED NOTIFICATIONS:");
  console.log(JSON.stringify(dismissed, null, 2));

  const order22 = await sql`SELECT o.id, o."buyerId", o."productName", o."totalPrice", o.status, o."buyerPhone", o."createdAt", o."paymentId", o."productType", u.name, u.email FROM orders o LEFT JOIN users u ON o."buyerId"=u.id WHERE o.id=22`;
  console.log("ORDER 22:");
  console.log(JSON.stringify(order22, null, 2));
}

main().catch((e) => console.error(e));
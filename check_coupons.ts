import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const coupons = await sql`SELECT id, code, "discountPercentage", "maxUses", "usedCount", "expiresAt", "isActive", "createdAt" FROM coupons ORDER BY id DESC`;
  console.log("CUPONS:");
  console.log(JSON.stringify(coupons, null, 2));

  const orders = await sql`SELECT id, "buyerId", "productName", "totalPrice", status, "buyerPhone", "createdAt", "paymentId", "productType" FROM orders ORDER BY id DESC LIMIT 5`;
  console.log("ORDERS:");
  console.log(JSON.stringify(orders, null, 2));
}

main().catch((e) => console.error(e));
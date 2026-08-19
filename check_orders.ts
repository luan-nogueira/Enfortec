import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function checkRecentOrders() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const rows = await sql`SELECT id, "buyerId", "productName", "totalPrice", status, "buyerPhone", "createdAt" FROM orders ORDER BY id DESC LIMIT 10`;
    console.log("📦 ÚLTIMOS 10 PEDIDOS REGISTRADOS NO BANCO:");
    console.log(JSON.stringify(rows, null, 2));
  } catch (err: any) {
    console.error("Erro ao consultar pedidos:", err.message);
  }
}

checkRecentOrders();

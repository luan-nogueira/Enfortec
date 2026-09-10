// Adiciona uma constraint UNIQUE em orders.paymentId, fechando a janela de corrida onde
// dois reenvios quase simultâneos do webhook do Mercado Pago poderiam criar pedidos
// duplicados pro mesmo pagamento (a checagem de idempotência em payment.ts já cobre a
// maioria dos casos, isso é a trava de segurança no próprio banco).
// Execute: pnpm tsx migrate_orders_payment_unique.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    const dupes = await sql`
      SELECT "paymentId", COUNT(*) AS total
      FROM orders
      WHERE "paymentId" IS NOT NULL
      GROUP BY "paymentId"
      HAVING COUNT(*) > 1
    `;
    if (dupes.length > 0) {
      console.error("❌ Existem pedidos duplicados com o mesmo paymentId — resolva antes de aplicar a constraint:");
      console.error(JSON.stringify(dupes, null, 2));
      return;
    }

    await sql`ALTER TABLE orders ADD CONSTRAINT orders_paymentid_unique UNIQUE ("paymentId")`;
    console.log("✅ Constraint UNIQUE em orders.paymentId aplicada com sucesso!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

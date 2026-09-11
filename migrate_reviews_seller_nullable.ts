// Torna reviews.sellerId opcional, pra permitir avaliar compras diretas do catálogo
// próprio da Eforte (sem vendedor terceiro/escrow envolvido).
// Execute: pnpm tsx migrate_reviews_seller_nullable.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE reviews ALTER COLUMN "sellerId" DROP NOT NULL`;
    console.log("✅ Coluna sellerId de reviews agora é opcional!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

// Script para adicionar a coluna buyerPhone na tabela orders
// Execute: pnpm tsx migrate_buyer_phone.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS "buyerPhone" varchar(30)`;
    console.log("✅ Coluna buyerPhone adicionada com sucesso na tabela orders!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

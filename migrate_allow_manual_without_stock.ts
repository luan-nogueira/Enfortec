// Adiciona a coluna allowManualWithoutStock em digitalProducts — quando ligada, o
// checkout nunca recusa por falta de estoque de um console específico, deixando vender
// pra entrega manual depois.
// Execute: pnpm tsx migrate_allow_manual_without_stock.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "allowManualWithoutStock" boolean DEFAULT false`;
    console.log("✅ Coluna allowManualWithoutStock adicionada com sucesso na tabela digitalProducts!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

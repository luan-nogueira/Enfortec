// Script para adicionar as colunas de cota (venda múltipla por conta, respeitando limite
// de ativações por plataforma/tipo) na tabela digitalProductAccounts.
// Execute: pnpm tsx migrate_digital_product_account_quotas.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "capPrimariaPs4" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "capPrimariaPs5" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "capPrimariaTotal" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "capSecundaria" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "usedPrimariaPs4" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "usedPrimariaPs5" integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "usedSecundaria" integer NOT NULL DEFAULT 0`;
    console.log("✅ Colunas de cota adicionadas com sucesso na tabela digitalProductAccounts!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

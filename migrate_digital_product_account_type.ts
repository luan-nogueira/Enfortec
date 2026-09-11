// Script para adicionar a coluna accountType ("primaria" | "secundaria" | null) na tabela
// digitalProductAccounts, permitindo pools separados de email+senha por modalidade.
// Execute: pnpm tsx migrate_digital_product_account_type.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE "digitalProductAccounts" ADD COLUMN IF NOT EXISTS "accountType" varchar(20)`;
    await sql`
      CREATE INDEX IF NOT EXISTS "idx_digital_product_accounts_type_lookup"
      ON "digitalProductAccounts" ("digitalProductId", "status", "accountType")
    `;
    console.log("✅ Coluna accountType adicionada com sucesso na tabela digitalProductAccounts!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

// Script para adicionar a coluna expiresAt na tabela digitalProducts
// Execute: pnpm tsx migrate_digital_product_expires.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp`;
    console.log("✅ Coluna expiresAt adicionada com sucesso na tabela digitalProducts!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

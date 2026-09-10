// Script para adicionar a coluna isBanned na tabela users.
// Execute: pnpm tsx migrate_user_ban.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "isBanned" boolean NOT NULL DEFAULT false`;
    console.log("✅ Coluna isBanned adicionada com sucesso na tabela users!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

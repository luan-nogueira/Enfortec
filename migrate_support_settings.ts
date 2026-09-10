// Script para adicionar as colunas supportWhatsapp, deliveryHelpVideo1Url e
// deliveryHelpVideo2Url na tabela platform_settings.
// Execute: pnpm tsx migrate_support_settings.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "supportWhatsapp" varchar(20) DEFAULT '554384253691'`;
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "deliveryHelpVideo1Url" varchar(500)`;
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "deliveryHelpVideo2Url" varchar(500)`;
    console.log("✅ Colunas de suporte (WhatsApp + vídeos de ajuda) adicionadas com sucesso em platform_settings!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

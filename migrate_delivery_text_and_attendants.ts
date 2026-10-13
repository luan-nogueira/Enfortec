// Script para adicionar em platform_settings as colunas deliveryMessageTemplate (texto
// automático de entrega, editável pelo admin) e waAttendantNumbers (WhatsApp de cada
// atendente, editável pelo admin).
// Tem que rodar ANTES de publicar o código que usa as colunas: settings.get lê a linha
// inteira, e sem as colunas no banco essa leitura falha no site todo.
// Execute: pnpm tsx migrate_delivery_text_and_attendants.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "deliveryMessageTemplate" text`;
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "waAttendantNumbers" json`;
    console.log("✅ Colunas deliveryMessageTemplate e waAttendantNumbers adicionadas com sucesso em platform_settings!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
    process.exitCode = 1;
  }
}

run();

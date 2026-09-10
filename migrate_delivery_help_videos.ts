// Script para adicionar a coluna deliveryHelpVideos (lista flexível de vídeos/links de
// ajuda, em JSON) na tabela platform_settings, migrando os 2 vídeos que já existiam nas
// colunas antigas deliveryHelpVideo1Url/deliveryHelpVideo2Url pra não perder o que já
// tinha sido cadastrado.
// Execute: pnpm tsx migrate_delivery_help_videos.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS "deliveryHelpVideos" json DEFAULT '[]'`;

    await sql`
      UPDATE platform_settings
      SET "deliveryHelpVideos" = (
        SELECT json_agg(v) FROM (
          SELECT json_build_object('title', 'Vídeo de Ajuda 1', 'url', "deliveryHelpVideo1Url", 'platform', 'ambos') AS v
          WHERE "deliveryHelpVideo1Url" IS NOT NULL
          UNION ALL
          SELECT json_build_object('title', 'Vídeo de Ajuda 2', 'url', "deliveryHelpVideo2Url", 'platform', 'ambos') AS v
          WHERE "deliveryHelpVideo2Url" IS NOT NULL
        ) sub
      )
      WHERE id = 1 AND ("deliveryHelpVideo1Url" IS NOT NULL OR "deliveryHelpVideo2Url" IS NOT NULL)
    `;

    console.log("✅ Coluna deliveryHelpVideos criada e vídeos antigos migrados com sucesso!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

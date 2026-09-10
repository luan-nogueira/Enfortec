// Script para criar a tabela digitalProductAccounts (pool de contas email+senha por jogo,
// usado na entrega automática). Execute: pnpm tsx migrate_digital_product_accounts.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS "digitalProductAccounts" (
        "id" serial PRIMARY KEY,
        "digitalProductId" integer NOT NULL,
        "email" varchar(255) NOT NULL,
        "password" varchar(255) NOT NULL,
        "status" varchar(20) NOT NULL DEFAULT 'disponivel',
        "orderId" integer,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "deliveredAt" timestamp
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS "idx_digital_product_accounts_lookup"
      ON "digitalProductAccounts" ("digitalProductId", "status")
    `;
    console.log("✅ Tabela digitalProductAccounts criada/confirmada com sucesso!");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
  }
}

run();

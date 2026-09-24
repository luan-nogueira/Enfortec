// Prepara o banco para o cargo "Suporte" e o "contatado" do Painel do Suporte:
//  - novo valor "suporte" no enum de cargos (role)
//  - coluna orders.supportContactedAt (quando o suporte falou com o comprador)
// As duas mudanças só ADICIONAM coisas: nada existente é alterado nem apagado, e o código
// antigo continua funcionando com elas. IMPORTANTE: rode ANTES de publicar o código novo —
// o código novo já lê a coluna nova em toda consulta de pedidos.
// Execute: pnpm tsx migrate_support_role.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  try {
    await sql`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'suporte'`;
    console.log("✅ Cargo 'suporte' disponível no enum role.");
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS "supportContactedAt" timestamp`;
    console.log("✅ Coluna supportContactedAt adicionada na tabela orders.");
  } catch (err: any) {
    console.error("❌ Erro:", err.message);
    process.exitCode = 1;
  }
}

run();

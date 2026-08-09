import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL não encontrado!");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log("Adicionando psnId na tabela users (se não existir)...");
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "psnId" varchar(255);`;
    console.log("OK!");
  } catch (e: any) {
    console.log("Erro (psnId):", e.message);
  }

  try {
    console.log("Ajustando limite da URL de imagem nos desafios de platina...");
    await sql`ALTER TABLE platinum_challenges ALTER COLUMN "imageUrl" TYPE varchar(1000);`;
    console.log("OK!");
  } catch (e: any) {
    console.log("Erro (imageUrl):", e.message);
  }

  try {
    console.log("Adicionando colunas novas em digitalProducts...");
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "stockPrimary" integer DEFAULT 0;`;
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "stockSecondary" integer DEFAULT 0;`;
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "pricePrimary" numeric(10, 2);`;
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "priceSecondary" numeric(10, 2);`;
    await sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "imageUrl" varchar(500);`;
    console.log("OK!");
  } catch (e: any) {
    console.log("Erro (stock):", e.message);
  }

  console.log("Tudo pronto!");
  process.exit(0);
}
run();

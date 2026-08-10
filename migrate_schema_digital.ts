import { getDb } from "./server/db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function migrate() {
  const db = getDb();
  if (!db) throw new Error("No DB");
  console.log("Migrando schema...");

  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "platform" varchar(50)`);
  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "category" varchar(100)`);
  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "coverFit" varchar(20)`);
  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "isPreVenda" boolean DEFAULT false`);
  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "showInEconomia" boolean DEFAULT false`);
  await db.execute(sql`ALTER TABLE "digitalProducts" ADD COLUMN IF NOT EXISTS "economiaLicenseType" varchar(50)`);

  console.log("Schema migrado com sucesso.");
  process.exit(0);
}

migrate();

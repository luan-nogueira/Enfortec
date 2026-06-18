const { neon } = require("@neondatabase/serverless");
const dotenv = require("dotenv");
const path = require("path");

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found in .env.local");
  process.exit(1);
}

async function run() {
  console.log("Connecting to Neon Database...");
  const sql = neon(dbUrl);
  
  console.log("Running migrations...");
  
  console.log("1. Adding 'cpf' column to 'users' table if not exists...");
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "cpf" varchar(18)`;
  
  console.log("2. Adding 'forteCoins' column to 'users' table if not exists...");
  await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "forteCoins" integer DEFAULT 10 NOT NULL`;
  
  console.log("3. Creating 'coupons' table if not exists...");
  await sql`CREATE TABLE IF NOT EXISTS "coupons" (
    "id" serial PRIMARY KEY,
    "code" varchar(50) NOT NULL UNIQUE,
    "discountPercentage" numeric(5, 2) NOT NULL,
    "maxUses" integer,
    "usedCount" integer DEFAULT 0,
    "expiresAt" timestamp,
    "isActive" boolean DEFAULT true,
    "createdAt" timestamp DEFAULT now() NOT NULL
  )`;
  
  console.log("4. Adding 'estado' column to 'usedProducts' table if not exists...");
  await sql`ALTER TABLE "usedProducts" ADD COLUMN IF NOT EXISTS "estado" varchar(50)`;
  
  console.log("5. Adding 'cidade' column to 'usedProducts' table if not exists...");
  await sql`ALTER TABLE "usedProducts" ADD COLUMN IF NOT EXISTS "cidade" varchar(100)`;
  
  console.log("Migrations successfully completed!");
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});

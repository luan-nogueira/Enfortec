import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log("TABLES:");
  console.log(JSON.stringify(tables.map(t => t.table_name), null, 2));

  const couponCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='coupons' ORDER BY ordinal_position`;
  console.log("COUPON COLUMNS:");
  console.log(JSON.stringify(couponCols, null, 2));

  const now = await sql`SELECT now() as now, current_setting('TimeZone') as tz`;
  console.log("NOW:", JSON.stringify(now, null, 2));
}

main().catch((e) => console.error(e));
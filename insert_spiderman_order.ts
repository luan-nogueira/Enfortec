import { config } from "dotenv";
config({ path: ".env.local" });
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurado nas variáveis de ambiente.");
  }
  const sql = neon(process.env.DATABASE_URL);

  console.log("Inserindo o pedido de Spider-Man Remastered PS5 no banco de dados...");

  const users = await sql`SELECT id FROM users WHERE email = 'rainbowflix000@gmail.com' LIMIT 1`;
  const buyerId = users.length > 0 ? users[0].id : 1;

  const digitalProds = await sql`SELECT id FROM "digitalProducts" WHERE name ILIKE '%Spider%' LIMIT 1`;
  let digitalProductId = digitalProds.length > 0 ? digitalProds[0].id : null;

  let storeProductId = null;
  if (!digitalProductId) {
    const storeProds = await sql`SELECT id FROM products WHERE name ILIKE '%Spider%' LIMIT 1`;
    if (storeProds.length > 0) storeProductId = storeProds[0].id;
  }

  const result = await sql`
    INSERT INTO orders (
      "buyerId",
      "sellerId",
      "digitalProductId",
      "productId",
      "productType",
      "productName",
      "quantity",
      "totalPrice",
      "commissionPercentage",
      "platformCommission",
      "sellerAmount",
      "status",
      "buyerPhone",
      "createdAt"
    ) VALUES (
      ${buyerId},
      NULL,
      ${digitalProductId},
      ${storeProductId},
      'digital',
      'Spider-Man Remastered PS5',
      1,
      '98.90',
      '6.00',
      '5.93',
      '92.97',
      'pago',
      '555591776810',
      NOW()
    )
    RETURNING id, "productName", "totalPrice", status, "buyerPhone";
  `;

  console.log("✅ Pedido inserido com sucesso no banco de dados!");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("❌ Erro ao inserir pedido:", err);
});

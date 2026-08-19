const https = require('https');

const host = "ep-wispy-sunset-ac5sonfy-pooler.sa-east-1.aws.neon.tech";
const password = "npg_0jJNSsBH7dFc";

function runQuery(sqlQuery) {
  const data = JSON.stringify({ query: sqlQuery });
  const options = {
    hostname: host,
    port: 443,
    path: '/sql',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${password}`,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (chunk) => { responseData += chunk; });
    res.on('end', () => {
      console.log("STATUS:", res.statusCode);
      try {
        const json = JSON.parse(responseData);
        console.log("RESULT:", JSON.stringify(json, null, 2));
      } catch (e) {
        console.log("RAW:", responseData);
      }
    });
  });

  req.on('error', (e) => {
    console.error("HTTP ERR:", e);
  });

  req.write(data);
  req.end();
}

console.log("Inserindo o pedido de A Quiet Place no banco de dados...");
runQuery(`
  DO $$
  DECLARE
    v_buyer_id INT;
    v_product_id INT;
    v_price VARCHAR;
  BEGIN
    SELECT id INTO v_buyer_id FROM users WHERE email = 'sandrinhooperfectt@gmail.com' LIMIT 1;
    SELECT id, price INTO v_product_id, v_price FROM digital_products WHERE name ILIKE '%Quiet Place%' LIMIT 1;

    INSERT INTO orders (
      "buyerId",
      "sellerId",
      "digitalProductId",
      "productType",
      "productName",
      "quantity",
      "totalPrice",
      "status",
      "buyerPhone",
      "createdAt"
    ) VALUES (
      COALESCE(v_buyer_id, 1),
      NULL,
      v_product_id,
      'digital',
      'A QUIET PLACE',
      1,
      COALESCE(v_price, '59.00'),
      'pago',
      '5571987650840',
      NOW()
    );
  END $$;
`);

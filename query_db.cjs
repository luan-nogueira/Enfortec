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

console.log("Checking recent orders for A Quiet Place...");
runQuery(`
  SELECT 
    o.id,
    o."buyerId",
    o."productName",
    o."totalPrice",
    o.status,
    o."buyerPhone",
    o."createdAt",
    u.name as buyer_name,
    u.email as buyer_email
  FROM orders o
  LEFT JOIN users u ON o."buyerId" = u.id
  ORDER BY o.id DESC
  LIMIT 15;
`);

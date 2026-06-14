import dotenv from "dotenv";
import path from "path";
// Carrega .env e .env.local (para desenvolvimento local)
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: false });
process.env.NODE_ENV = process.env.NODE_ENV || "development";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { registerSeedRoute } from "./seed";
import { registerAiRoute } from "./ai";
import { registerPaymentRoute } from "./payment";
import { appRouter } from "../routers";
import { createContext } from "./context";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

export const app = express();

// Configure body parser with larger size limit for file uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);
registerSeedRoute(app);
registerAiRoute(app);
registerPaymentRoute(app);

app.get("/api/test-db", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ success: false, error: "DATABASE_URL not set in environment" });
  }
  try {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const sql = neon(dbUrl);
    const db = drizzle(sql);
    const result = await db.execute("SELECT 1 AS ok");
    return res.json({ success: true, result, driver: "neon-serverless" });
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      error: err.message,
      errJson: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
  }
});

app.get("/api/test-create-order", async (req, res) => {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return res.status(500).json({ success: false, error: "DATABASE_URL not set in environment" });
  }
  try {
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const { eq } = await import("drizzle-orm");
    const { users: usersTable, orders: ordersTable } = await import("../../drizzle/schema");

    const sql = neon(dbUrl);
    const db = drizzle(sql);

    // 1. Busca Luan pelo email ou cria se não existir
    const userEmail = "luanmnogueira@gmail.com";
    let buyer = await db.select().from(usersTable).where(eq(usersTable.email, userEmail)).limit(1).then(r => r[0]);

    if (!buyer) {
      // Tenta criar Luan para o teste
      const mockOpenId = "test_luan_" + Math.random().toString(36).substring(7);
      await db.insert(usersTable).values({
        openId: mockOpenId,
        name: "Luan Nogueira",
        email: userEmail,
        loginMethod: "firebase",
        role: "admin"
      });
      buyer = await db.select().from(usersTable).where(eq(usersTable.email, userEmail)).limit(1).then(r => r[0]);
    } else if (buyer.role !== 'admin') {
      // Garante que o Luan tem o papel de admin no novo banco
      await db.update(usersTable).set({ role: 'admin' }).where(eq(usersTable.id, buyer.id));
      buyer = await db.select().from(usersTable).where(eq(usersTable.email, userEmail)).limit(1).then(r => r[0]);
    }

    if (!buyer) {
      throw new Error("Não foi possível carregar ou criar o usuário Luan.");
    }

    // 2. Insere um pedido mock pago associado a Luan
    const orderId = await db.insert(ordersTable).values({
      buyerId: buyer.id,
      productType: "digital",
      totalPrice: "89.90",
      commissionPercentage: "10.00",
      platformCommission: "8.99",
      sellerAmount: "80.91",
      status: "pago",
      paymentId: "TESTE-PGTO-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
    }).returning({ id: ordersTable.id }).then(r => r[0]?.id);

    return res.send(`
      <div style="font-family: sans-serif; max-width: 600px; margin: 40px auto; padding: 30px; border: 1px solid #ef4444; border-radius: 12px; background-color: #0b0f19; color: #fff; text-align: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);">
        <h2 style="color: #ef4444; margin-top: 0;">🎉 Pedido de Teste Criado!</h2>
        <p>Um jogo digital mock foi inserido na sua conta com sucesso.</p>
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; text-align: left; font-family: monospace; margin: 20px 0; border: 1px solid rgba(255,255,255,0.1);">
          <strong>ID do Pedido:</strong> #${orderId}<br>
          <strong>Comprador:</strong> ${buyer.name} (${buyer.email})<br>
          <strong>Jogo:</strong> FIFA 26 PS4/PS5 (Mock)<br>
          <strong>Valor:</strong> R$ 89,90<br>
          <strong>Status:</strong> pago (Pronto para entrega)
        </div>
        <p style="color: #94a3b8; font-size: 14px;">Agora acesse o seu **Painel do Gestor** no site para ver o pedido na aba **Gerenciar Vendas** e testar o envio de e-mail!</p>
        <a href="/admin" style="display: inline-block; background: #ef4444; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px; transition: 0.2s;">Ir para Painel do Gestor</a>
      </div>
    `);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/api/inspect-db-url", (req, res) => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    return res.json({ error: "DATABASE_URL is missing" });
  }
  try {
    const parsed = new URL(url);
    return res.json({
      protocol: parsed.protocol,
      host: parsed.host,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      searchParams: Object.fromEntries(parsed.searchParams.entries()),
    });
  } catch (e: any) {
    return res.json({ error: "Invalid URL", message: e.message, length: url.length });
  }
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

async function startServer() {
  console.log("[Server] starting server...");
  const server = createServer(app);

  console.log("[Server] NODE_ENV:", process.env.NODE_ENV);
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    console.log("[Server] Importing vite module...");
    const viteModule = "./vite.js";
    const { setupVite } = await import(viteModule);
    console.log("[Server] Setting up Vite...");
    await setupVite(app, server);
    console.log("[Server] Vite set up completed.");
  } else if (process.env.VERCEL !== "1") {
    console.log("[Server] Importing vite module for static...");
    const viteModule = "./vite.js";
    const { serveStatic } = await import(viteModule);
    console.log("[Server] Serving static files...");
    serveStatic(app);
  }

  console.log("[Server] Finding available port...");
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  console.log("[Server] Listening on port:", port);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start the server directly if it's not being imported as a module (e.g. by Vercel)
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}

export default app;

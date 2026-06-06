import "dotenv/config";
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
  // Try to connect directly and catch errors
  let connectError: any = null;
  let db: any = null;
  try {
    const mysql = await import("mysql2/promise");
    const { drizzle } = await import("drizzle-orm/mysql2");
    const useSsl = !dbUrl.includes("localhost") && !dbUrl.includes("127.0.0.1");
    const connection = await mysql.default.createConnection({
      uri: dbUrl,
      connectTimeout: 10000,
      ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
    });
    db = drizzle(connection);
  } catch (err: any) {
    connectError = err;
  }

  if (!db || connectError) {
    return res.status(500).json({ 
      success: false, 
      phase: "connect",
      error: connectError?.message || "Connection returned null",
      code: connectError?.code,
      errno: connectError?.errno,
      errJson: connectError ? JSON.stringify(connectError, Object.getOwnPropertyNames(connectError)) : null,
    });
  }

  try {
    const result = await db.execute("SELECT 1");
    return res.json({ success: true, result });
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      phase: "query",
      error: err.message,
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null,
      errJson: JSON.stringify(err, Object.getOwnPropertyNames(err)),
    });
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
  const server = createServer(app);

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    const viteModule = "./vite.js";
    const { setupVite } = await import(viteModule);
    await setupVite(app, server);
  } else if (process.env.VERCEL !== "1") {
    const viteModule = "./vite.js";
    const { serveStatic } = await import(viteModule);
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

// Only start the server directly if it's not being imported as a module (e.g. by Vercel)
if (process.env.NODE_ENV !== "production" || process.env.VERCEL !== "1") {
  startServer().catch(console.error);
}

export default app;

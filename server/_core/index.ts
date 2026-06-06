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
  try {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) {
      return res.status(500).json({ success: false, error: "Database instance is null (DATABASE_URL missing?)" });
    }
    // Run a raw query using the underlying pool or execute
    const result = await db.execute("SELECT 1");
    return res.json({ success: true, result });
  } catch (err: any) {
    console.error("[TestDB Error]", err);
    return res.status(500).json({ 
      success: false, 
      error: err.message, 
      cause: err.cause ? { message: err.cause.message, code: err.cause.code } : null,
      originalError: err.originalError ? { message: err.originalError.message, code: err.originalError.code, errno: err.originalError.errno, sqlState: err.originalError.sqlState } : null,
      keys: Object.keys(err),
      errJson: JSON.stringify(err, Object.getOwnPropertyNames(err)),
      stack: err.stack 
    });
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

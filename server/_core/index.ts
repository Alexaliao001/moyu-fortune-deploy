import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./static";
import { webhookRouter } from "../stripe/webhook";
import { startDailyNotificationCron } from "../cron/dailyNotification";
import { registerLightApi } from "../light/routes";
import { renderApiStatusPage } from "./statusPage";
import { ensureAnalyticsSchema, registerAnalyticsApi } from "./analytics";
import { registerAdminApi } from "./adminOverview";

const ALLOWED_ORIGINS = new Set(
  (process.env.MOYU_CORS_ORIGINS ||
    "https://chillworks.ai,https://www.chillworks.ai,http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
);

function corsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Device-Id, X-Device-Name, trpc-batch-mode"
    );
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
}

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

async function startServer() {
  const app = express();
  const server = createServer(app);
  const lightOnly = process.env.MOYU_LIGHT_ONLY === "1";
  const apiOnly =
    process.env.MOYU_API_ONLY === "1" ||
    (!lightOnly && !fs.existsSync(path.join(process.cwd(), "dist/public/index.html")));

  app.use(corsMiddleware);

  if (!lightOnly) {
    app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
    app.use(webhookRouter);
  }

  app.use(express.json({ limit: lightOnly ? "256kb" : "50mb" }));
  app.use(express.urlencoded({ limit: lightOnly ? "256kb" : "50mb", extended: true }));

  await ensureAnalyticsSchema().catch(error => {
    console.warn("[analytics] schema initialization failed", error);
  });

  app.get("/health", async (_req, res) => {
    res.json({
      ok: true,
      service: lightOnly ? "moyu-light" : "moyu-fortune",
      version: lightOnly ? "sx2b2-1.0" : "path-c-1.0",
      mode: lightOnly ? "light" : "full",
    });
  });

  registerLightApi(app);
  registerAnalyticsApi(app);
  registerAdminApi(app);

  if (lightOnly) {
    app.get("/", (_req, res) => {
      res
        .type("text")
        .send("moyu-light ok — API at /api/light/* · frontend https://chillworks.ai");
    });
  } else {
    registerOAuthRoutes(app);
    app.use(
      "/api/trpc",
      createExpressMiddleware({
        router: appRouter,
        createContext,
      })
    );
    if (process.env.NODE_ENV === "development") {
      const { setupVite } = await import("./vite");
      await setupVite(app, server);
    } else if (!apiOnly) {
      serveStatic(app);
    } else {
      app.get("/", (_req, res) => {
        res.type("html").send(renderApiStatusPage());
      });
    }
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    if (!lightOnly) {
      startDailyNotificationCron();
    }
  });
}

startServer().catch(console.error);

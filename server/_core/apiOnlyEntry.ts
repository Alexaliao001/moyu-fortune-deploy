import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
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

  app.use(corsMiddleware);
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  app.use(webhookRouter);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  await ensureAnalyticsSchema().catch(error => {
    console.warn("[analytics] schema initialization failed", error);
  });

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      service: "moyu-fortune",
      version: "path-c-1.0",
      mode: "api",
    });
  });

  registerLightApi(app);
  registerAnalyticsApi(app);
  registerAdminApi(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  app.get("/", (_req, res) => {
    res.type("html").send(renderApiStatusPage());
  });

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`moyu-fortune API on http://0.0.0.0:${port}/`);
    startDailyNotificationCron();
  });
}

startServer().catch(console.error);

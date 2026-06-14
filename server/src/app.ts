import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiGateway } from "./middlewares/apiGateway.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDistPath = path.resolve(__dirname, "../../dist");

export const createApp = () => {
  const app = express();

  // Security headers
  app.use(helmet({ contentSecurityPolicy: false }));

  // Request logging
  app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

  // Rate limiting
  const authLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, skip: () => process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT_IN_TESTS === "true", message: { ok: false, code: 429, message: "请求过于频繁，请稍后重试" } });
  const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, skip: () => process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT_IN_TESTS === "true", message: { ok: false, code: 429, message: "请求过于频繁，请稍后重试" } });

  app.use("/api/v1/mobile/auth", authLimiter);
  app.use(generalLimiter);

  const configuredOrigins = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    "https://daiyuannn.github.io",
    ...configuredOrigins
  ]);

  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && allowedOrigins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }
    if (req.method === "OPTIONS") { res.status(204).end(); return; }
    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(apiGateway);
  app.use(routes);

  // Production deployment: serve frontend static assets from Vite build output.
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
    app.use("/SuanXiaoZhi", express.static(webDistPath));
    app.get(/^\/(?!api|health).*/, (_req, res) => {
      res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  app.get("/health", async (_req, res) => {
    try { await import("./db.js").then(m => m.prisma.$queryRaw`SELECT 1`); } catch {}
    res.json({ ok: true });
  });
  app.use(errorHandler);

  return app;
};

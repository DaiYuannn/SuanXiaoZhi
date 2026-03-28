import express from "express";
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
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    next();
  });

  app.use(express.json({ limit: "1mb" }));
  app.use(apiGateway);
  app.use(routes);

  // Production deployment: serve frontend static assets from Vite build output.
  if (fs.existsSync(webDistPath)) {
    // Serve both root and GitHub Pages-style prefixed assets for local compatibility.
    app.use(express.static(webDistPath));
    app.use("/SuanXiaoZhi", express.static(webDistPath));
    app.get(/^\/(?!api|health).*/, (_req, res) => {
      res.sendFile(path.join(webDistPath, "index.html"));
    });
  }

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);

  return app;
};
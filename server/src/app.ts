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

  app.use(express.json({ limit: "1mb" }));
  app.use(apiGateway);
  app.use(routes);

  // Production deployment: serve frontend static assets from Vite build output.
  if (fs.existsSync(webDistPath)) {
    app.use(express.static(webDistPath));
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
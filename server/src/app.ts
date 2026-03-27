import express from "express";
import { apiGateway } from "./middlewares/apiGateway.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import routes from "./routes/index.js";

export const createApp = () => {
  const app = express();

  app.use(express.json({ limit: "1mb" }));
  app.use(apiGateway);
  app.use(routes);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);

  return app;
};
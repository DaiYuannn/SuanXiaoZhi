import dotenv from "dotenv";
import { createApp } from "./app.js";
import { parseServerEnv } from "./config/env.js";
import { initDB } from "./db.js";

dotenv.config();

const env = parseServerEnv(process.env);
const app = createApp();

const bootstrap = async (): Promise<void> => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? env.DATABASE_URL;
  await initDB();

  app.listen(env.PORT, () => {
    process.stdout.write(`server-running:${env.PORT}\n`);
  });
};

bootstrap().catch((error: unknown) => {
  process.stderr.write(`bootstrap-failed:${error instanceof Error ? error.message : "unknown"}\n`);
  process.exit(1);
});
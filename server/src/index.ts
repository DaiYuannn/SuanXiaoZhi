import dotenv from "dotenv";
import { createApp } from "./app.js";
import { parseServerEnv } from "./config/env.js";
import { initDB, prisma } from "./db.js";

dotenv.config();

const env = parseServerEnv(process.env);
const app = createApp();

let server: ReturnType<typeof app.listen> | null = null;

const shutdown = async (signal: string) => {
  process.stderr.write(`shutdown:${signal}\n`);
  if (server) {
    server.close(() => process.stderr.write("server-closed\n"));
    // Force exit after 30s
    setTimeout(() => { process.stderr.write("force-exit\n"); process.exit(0); }, 30000).unref();
  }
  try { await prisma.$disconnect(); } catch {}
  process.exit(0);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const bootstrap = async (): Promise<void> => {
  process.env.DATABASE_URL = process.env.DATABASE_URL ?? env.DATABASE_URL;
  await initDB();

  server = app.listen(env.PORT, () => {
    process.stdout.write(`server-running:${env.PORT}\n`);
  });
};

bootstrap().catch((error: unknown) => {
  process.stderr.write(`bootstrap-failed:${error instanceof Error ? error.message : "unknown"}\n`);
  process.exit(1);
});

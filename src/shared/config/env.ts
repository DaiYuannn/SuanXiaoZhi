import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  VITE_API_BASE: z.string().optional(),
  VITE_AUDIT_ENDPOINT: z.string().optional(),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),
  AUDIT_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  AUDIT_FLUSH_MS: z.coerce.number().int().positive().default(4000)
});

export type FrontendEnv = z.infer<typeof envSchema>;

export const parseFrontendEnv = (input: Record<string, string | undefined>): FrontendEnv => {
  return envSchema.parse(input);
};

const runtimeEnv =
  typeof import.meta !== "undefined" && (import.meta as { env?: Record<string, string | undefined> }).env
    ? ((import.meta as unknown as { env: Record<string, string | undefined> }).env)
    : undefined;

export const API_BASE = runtimeEnv?.VITE_API_BASE ?? "";
export const AUDIT_ENDPOINT = runtimeEnv?.VITE_AUDIT_ENDPOINT ?? "/api/v1/mobile/audit/batch";
export const DEFAULT_TIMEOUT_MS = 15000;
export const DEFAULT_RETRIES = 1;
export const DEFAULT_RETRY_DELAY_MS = 500;
export const AUDIT_BATCH_SIZE = 20;
export const AUDIT_FLUSH_INTERVAL_MS = 15000;
export const AUDIT_MAX_BACKLOG = 500;
export const AUTH_TOKEN_KEY = "auth_token";
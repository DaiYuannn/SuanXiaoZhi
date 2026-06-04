import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().default("postgresql://suanxiaozhi:suanxiaozhi123@localhost:5432/suanxiaozhi?schema=public"),
  ALLOWED_ORIGINS: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().min(1).default("mock-key"),
  DEEPSEEK_BASE_URL: z.string().url().default("https://api.deepseek.com"),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat")
});

export type ServerEnv = z.infer<typeof envSchema>;

export const parseServerEnv = (input: Record<string, string | undefined>): ServerEnv => {
  return envSchema.parse(input);
};
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["server/src/**/*.ts", "src/**/*.ts"],
      exclude: [
        "server/src/index.ts",
        "server/src/seed.ts",
        "server/src/db.ts",
        "server/src/services/user-context.ts",
        "server/src/routes/v1/**/*.ts",
        "server/src/types/express.d.ts",
        "src/**/*.d.ts",
        "src/**/*.css",
        "src/main.ts",
        "src/domains/auth/pages/**/*.ts",
        "src/domains/**/api/**/*.ts",
        "src/domains/**/hooks/**/*.ts",
        "src/shared/audit/audit-service.ts",
        "src/shared/config/env.ts",
        "src/shared/hooks/useAuditReminder.ts",
        "src/shared/hooks/useUserAndProgress.ts",
        "src/shared/utils/http-client.ts",
        "src/**/types/*.ts",
        "src/admin/pages/**/*.ts",
        "src/admin/pages/**/*.tsx",
        "src/shared/constants/**/*.ts"
      ],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      }
    }
  }
});
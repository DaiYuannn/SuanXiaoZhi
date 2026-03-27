import { describe, expect, it } from "vitest";
import { parseFrontendEnv } from "../../src/shared/config/env.js";
import { parseServerEnv } from "../../server/src/config/env.js";
import { hasPermission } from "../../src/shared/utils/permission-map.js";
import { Permission, UserRole } from "../../src/shared/types/permission.js";

describe("env and permission runtime", () => {
  it("parses frontend env with defaults", () => {
    const parsed = parseFrontendEnv({
      NODE_ENV: "test",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-chat",
      AUDIT_BATCH_SIZE: "15",
      AUDIT_FLUSH_MS: "3000"
    });

    expect(parsed.AUDIT_BATCH_SIZE).toBe(15);
  });

  it("parses server env with defaults", () => {
    const parsed = parseServerEnv({
      NODE_ENV: "test",
      PORT: "3100",
      DEEPSEEK_API_KEY: "mock",
      DEEPSEEK_BASE_URL: "https://api.deepseek.com",
      DEEPSEEK_MODEL: "deepseek-chat"
    });

    expect(parsed.PORT).toBe(3100);
  });

  it("checks role permission mapping", () => {
    expect(hasPermission(UserRole.OWNER, Permission.TRANSACTION_WRITE)).toBe(true);
    expect(hasPermission(UserRole.FAMILY_MEMBER, Permission.TRANSACTION_WRITE)).toBe(false);
  });
});
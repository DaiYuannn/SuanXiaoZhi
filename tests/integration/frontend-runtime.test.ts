import { afterEach, describe, expect, it, vi } from "vitest";
import { bootstrap } from "../../src/main.js";
import { detectGesture } from "../../src/shared/components/mobile-gesture.js";
import { AuditService } from "../../src/shared/audit/audit-service.js";
import { normalizeError } from "../../src/shared/errors/error-handler.js";
import { AppError } from "../../src/shared/errors/app-error.js";
import { fallbackReply } from "../../src/domains/assistant/hooks/useAssistantFallback.js";
import { listProducts } from "../../src/domains/products/api/products-api.js";
import { fetchKpiCards } from "../../src/domains/analysis/api/analysis-api.js";
import { listFamilyMembers } from "../../src/domains/family/api/family-api.js";
import { login } from "../../src/domains/auth/api/auth-api.js";
import { listAdminUsers } from "../../src/admin/api/admin-api.js";
import { useAdminMenu } from "../../src/admin/hooks/useAdminMenu.js";
import { UserRole } from "../../src/shared/types/permission.js";
import { mobileRoutes } from "../../src/router/routes.js";

describe("frontend runtime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bootstraps frontend marker", () => {
    expect(bootstrap().startsWith("frontend-ready")).toBe(true);
  });

  it("handles gesture detection", () => {
    expect(detectGesture(-90, 0)).toBe("delete");
    expect(detectGesture(90, 0)).toBe("edit");
    expect(detectGesture(0, 80)).toBe("pull-to-refresh");
  });

  it("flushes audit events by batch", () => {
    const audit = new AuditService({ batchSize: 2 });
    const first = audit.track({ event: "a", actorId: "u", ts: Date.now() });
    const second = audit.track({ event: "b", actorId: "u", ts: Date.now() });

    expect(first.length).toBe(0);
    expect(second.length).toBe(2);
  });

  it("normalizes known and unknown errors", () => {
    const appErr = normalizeError(new AppError("x", "X", 400));
    const rawErr = normalizeError(new Error("raw"));
    const unknownErr = normalizeError("oops");

    expect(appErr.status).toBe(400);
    expect(rawErr.code).toBe("UNEXPECTED_ERROR");
    expect(unknownErr.code).toBe("UNKNOWN_ERROR");
  });

  it("runs domain api placeholders", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/api/v1/mobile/auth/login")) {
        return new Response(
          JSON.stringify({
            ok: true,
            code: 0,
            message: "ok",
            token: "jwt-test-token",
            role: "owner",
            data: { userId: "u-test", username: "demo_owner" }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // 其他 domain API 在本测试中继续走各自 fallback，保持原本“占位 API 运行测试”的定位。
      throw new Error(`unmocked frontend runtime request: ${url}`);
    });

    const reply = fallbackReply("帮我看消费");
    const products = await listProducts();
    const kpi = await fetchKpiCards();
    const family = await listFamilyMembers();
    const auth = await login({ username: "demo_owner", password: "demo123" });
    const adminUsers = await listAdminUsers();

    expect(reply.length).toBeGreaterThan(0);
    expect(products.length).toBeGreaterThan(0);
    expect(kpi.length).toBeGreaterThan(0);
    expect(family.length).toBe(2);
    expect(auth.ok).toBe(true);
    expect(auth.token).toBe("jwt-test-token");
    expect(auth.role).toBe("owner");
    expect(adminUsers.length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("filters admin menu by role", () => {
    const viewerMenu = useAdminMenu({ id: "u", role: UserRole.VIEWER });
    const ownerRoutes = mobileRoutes.length;

    expect(viewerMenu.some((item) => item.path === "/admin")).toBe(true);
    expect(viewerMenu.some((item) => item.path === "/admin/users")).toBe(false);
    expect(ownerRoutes).toBeGreaterThan(0);
  });
});
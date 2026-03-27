import { describe, expect, it, vi } from "vitest";
import { checkPermission } from "../../server/src/services/rbac.js";
import { Permission, UserRole } from "../../server/src/types/permission.js";
import { apiGateway } from "../../server/src/middlewares/apiGateway.js";
import { adminAuthMiddleware, mobileAuthMiddleware } from "../../server/src/middlewares/auth.js";
import { errorHandler } from "../../server/src/middlewares/errorHandler.js";

describe("server support runtime", () => {
  it("checks permission matrix", () => {
    expect(checkPermission(UserRole.SUPER_ADMIN, Permission.SYSTEM_MANAGE)).toBe(true);
    expect(checkPermission(UserRole.VIEWER, Permission.SYSTEM_MANAGE)).toBe(false);
  });

  it("injects mobile user in gateway", () => {
    const req = { path: "/api/v1/mobile/analysis", header: () => undefined } as any;
    const next = vi.fn();
    apiGateway(req, {} as any, next);

    expect(req.user.role).toBe(UserRole.OWNER);
    expect(next).toHaveBeenCalled();
  });

  it("blocks invalid admin roles", () => {
    const req = { header: () => "owner" } as any;
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const res = { status, json } as any;
    const next = vi.fn();

    adminAuthMiddleware(req, res, next);

    expect(status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows mobile auth middleware", () => {
    const req = { header: () => undefined } as any;
    const next = vi.fn();

    mobileAuthMiddleware(req, {} as any, next);
    expect(req.user.id).toBe("mobile-user");
    expect(next).toHaveBeenCalled();
  });

  it("handles error serialization", () => {
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();
    const res = { status, json } as any;

    errorHandler(new Error("boom"), {} as any, res, vi.fn());
    expect(status).toHaveBeenCalledWith(500);

    errorHandler("x", {} as any, res, vi.fn());
    expect(status).toHaveBeenCalledWith(500);
  });
});
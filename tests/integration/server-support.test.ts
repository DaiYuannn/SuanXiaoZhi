import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/src/app.js";
import { checkPermission } from "../../server/src/services/rbac.js";
import { Permission, UserRole } from "../../server/src/types/permission.js";
import { apiGateway } from "../../server/src/middlewares/apiGateway.js";
import { errorHandler } from "../../server/src/middlewares/errorHandler.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("server support runtime", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "admin"]);
  });

  it("checks permission matrix", () => {
    expect(checkPermission(UserRole.SUPER_ADMIN, Permission.SYSTEM_MANAGE)).toBe(true);
    expect(checkPermission(UserRole.VIEWER, Permission.SYSTEM_MANAGE)).toBe(false);
  });

  it("allows public mobile auth routes through gateway", () => {
    const req = { path: "/api/v1/mobile/auth/login" } as any;
    const next = vi.fn();
    apiGateway(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it("blocks mobile route without token", async () => {
    const res = await request(app).get("/api/v1/mobile/analysis");
    expect(res.status).toBe(401);
  });

  it("allows mobile route with JWT token", async () => {
    const res = await request(app)
      .get("/api/v1/mobile/analysis")
      .set(auth.owner);
    expect(res.status).toBe(200);
  });

  it("blocks owner from admin route", async () => {
    const res = await request(app)
      .get("/api/v1/admin/system")
      .set(auth.owner);
    expect(res.status).toBe(403);
  });

  it("allows super admin on admin route", async () => {
    const res = await request(app)
      .get("/api/v1/admin/system")
      .set(auth.admin);
    expect(res.status).toBe(200);
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

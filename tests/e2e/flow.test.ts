import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";

describe("e2e core flow", () => {
  const app = createApp();

  it("runs login -> create transaction -> analysis flow", async () => {
    const loginResp = await request(app)
      .post("/api/v1/mobile/auth/login")
      .send({ username: "demo", password: "demo" });
    expect(loginResp.status).toBe(200);

    const createResp = await request(app)
      .post("/api/v1/mobile/transactions")
      .set("x-role", "owner")
      .send({ amountCent: 1990, category: "food", note: "meal" });
    expect(createResp.status).toBe(201);

    const analysisResp = await request(app)
      .get("/api/v1/mobile/analysis")
      .set("x-role", "owner");
    expect(analysisResp.status).toBe(200);
    expect(analysisResp.body.summary).toBeDefined();
  });

  it("runs admin dashboard related flow", async () => {
    const reportsResp = await request(app)
      .get("/api/v1/admin/reports")
      .set("x-role", "operator");
    expect(reportsResp.status).toBe(200);

    const systemResp = await request(app)
      .get("/api/v1/admin/system")
      .set("x-role", "super_admin");
    expect(systemResp.status).toBe(200);
  });
});
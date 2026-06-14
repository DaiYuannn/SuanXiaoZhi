import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("e2e core flow", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "operator", "admin"]);
  });

  it("runs login -> create transaction -> analysis flow", async () => {
    const createResp = await request(app)
      .post("/api/v1/mobile/transactions")
      .set(auth.owner)
      .send({ amountCent: 1990, type: "EXPENSE", categoryName: "餐饮", note: "meal" });
    expect(createResp.status).toBe(201);

    const analysisResp = await request(app)
      .get("/api/v1/mobile/analysis")
      .set(auth.owner);
    expect(analysisResp.status).toBe(200);
    expect(analysisResp.body.summary ?? analysisResp.body.data).toBeDefined();
  });

  it("runs admin dashboard related flow", async () => {
    const reportsResp = await request(app)
      .get("/api/v1/admin/reports")
      .set(auth.operator);
    expect(reportsResp.status).toBe(200);

    const systemResp = await request(app)
      .get("/api/v1/admin/system")
      .set(auth.admin);
    expect(systemResp.status).toBe(200);
  });
});

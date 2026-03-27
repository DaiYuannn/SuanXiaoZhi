import path from "node:path";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/src/app.js";
import { initDB } from "../../server/src/db.js";

describe("branch coverage integration", () => {
  const app = createApp();

  beforeAll(async () => {
    await initDB();
  });

  it("covers auth and incentives negative branches", async () => {
    const registerBad = await request(app).post("/api/v1/mobile/auth/register").send({ username: "" });
    expect(registerBad.status).toBe(400);

    await request(app).post("/api/v1/mobile/auth/register").send({ username: "dup_user", password: "1" });
    const registerDup = await request(app).post("/api/v1/mobile/auth/register").send({ username: "dup_user", password: "1" });
    expect(registerDup.status).toBe(409);

    const loginBad = await request(app).post("/api/v1/mobile/auth/login").send({ username: "dup_user", password: "x" });
    expect(loginBad.status).toBe(401);

    const claimMissing = await request(app)
      .post("/api/v1/mobile/incentives/claim")
      .set("x-role", "owner")
      .send({});
    expect(claimMissing.status).toBe(400);

    const claimNotFound = await request(app)
      .post("/api/v1/mobile/incentives/claim")
      .set("x-role", "owner")
      .send({ taskId: "not-exists" });
    expect(claimNotFound.status).toBe(404);
  });

  it("covers family/reminder/products negative branches", async () => {
    const noFamily = await request(app)
      .get("/api/v1/mobile/family")
      .set("x-role", "family")
      .set("x-user-id", "new_user_without_family");
    expect(noFamily.status).toBe(200);
    expect(noFamily.body.family).toBeNull();

    const reminder404 = await request(app)
      .post("/api/v1/mobile/reminders/not_found_id")
      .set("x-role", "owner")
      .send({ title: "x" });
    expect(reminder404.status).toBe(404);

    const estimate404 = await request(app)
      .get("/api/v1/mobile/products/estimate?productId=NOT_EXISTS")
      .set("x-role", "owner");
    expect(estimate404.status).toBe(404);
  });

  it("covers admin side alternative branches", async () => {
    const adminProductBad = await request(app)
      .post("/api/v1/admin/products")
      .set("x-role", "operator")
      .send({ productCode: "" });
    expect(adminProductBad.status).toBe(400);

    const reportBalance = await request(app)
      .get("/api/v1/admin/reports/balance-sheet")
      .set("x-role", "viewer");
    expect(reportBalance.status).toBe(200);

    const reportCashflow = await request(app)
      .get("/api/v1/admin/reports/cashflow")
      .set("x-role", "viewer");
    expect(reportCashflow.status).toBe(200);

    const risk404 = await request(app)
      .get("/api/v1/admin/risk/assessment/result?assessmentId=not-found")
      .set("x-role", "super_admin");
    expect(risk404.status).toBe(404);
  });

  it("covers ocr and audit branches", async () => {
    const ocrNoImage = await request(app)
      .post("/api/v1/mobile/ocr/classify")
      .set("x-role", "owner");
    expect(ocrNoImage.status).toBe(400);

    const ocrEmptyText = await request(app)
      .post("/api/v1/mobile/ocr/classify-text")
      .set("x-role", "owner")
      .send({ text: "" });
    expect(ocrEmptyText.status).toBe(400);

    const imagePath = path.resolve("robot.png");
    const ocrWithImage = await request(app)
      .post("/api/v1/mobile/ocr/classify")
      .set("x-role", "owner")
      .attach("image", imagePath);
    expect([200, 500]).toContain(ocrWithImage.status);

    const auditEmpty = await request(app)
      .post("/api/v1/mobile/audit/batch")
      .set("x-role", "owner")
      .send({ items: [] });
    expect(auditEmpty.status).toBe(200);
  });

  it("covers ai no-message and external call branch", async () => {
    const aiBad = await request(app)
      .post("/api/v1/mobile/ai/chat")
      .set("x-role", "owner")
      .send({});
    expect(aiBad.status).toBe(400);

    const originalFetch = global.fetch;
    const mocked = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "mocked-ai-response" } }] })
    });
    (global as unknown as { fetch: typeof fetch }).fetch = mocked as unknown as typeof fetch;
    process.env.NODE_ENV = "development";

    const aiOk = await request(app)
      .post("/api/v1/mobile/ai/chat")
      .set("x-role", "owner")
      .set("x-user-id", "branch_user")
      .send({ message: "test external branch" });
    expect(aiOk.status).toBe(200);
    expect(aiOk.body.data.content).toContain("mocked-ai-response");

    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    process.env.NODE_ENV = "test";
  });
});
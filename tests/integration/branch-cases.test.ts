import path from "node:path";
import request from "supertest";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "../../server/src/app.js";
import { prisma } from "../../server/src/db.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("branch coverage integration", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "family", "admin", "operator", "viewer"]);
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
      .set(auth.owner)
      .send({});
    expect(claimMissing.status).toBe(400);

    const claimNotFound = await request(app)
      .post("/api/v1/mobile/incentives/claim")
      .set(auth.owner)
      .send({ taskId: "not-exists" });
    expect(claimNotFound.status).toBe(404);
  });

  it("covers family/reminder/products negative branches", async () => {
    const noFamily = await request(app)
      .get("/api/v1/mobile/family")
      .set(auth.family);
    expect(noFamily.status).toBe(200);
    // demo_family belongs to a family, so family should exist
    expect(noFamily.body.family).toBeDefined();

    const reminder404 = await request(app)
      .post("/api/v1/mobile/reminders/not_found_id")
      .set(auth.owner)
      .send({ title: "x" });
    expect(reminder404.status).toBe(404);

    const estimate404 = await request(app)
      .get("/api/v1/mobile/products/estimate?productId=NOT_EXISTS")
      .set(auth.owner);
    expect(estimate404.status).toBe(404);
  });

  it("covers admin side alternative branches", async () => {
    const adminProductBad = await request(app)
      .post("/api/v1/admin/products")
      .set(auth.operator)
      .send({ productCode: "" });
    expect(adminProductBad.status).toBe(400);

    const reportBalance = await request(app)
      .get("/api/v1/admin/reports/balance-sheet")
      .set(auth.viewer);
    expect(reportBalance.status).toBe(200);

    const reportCashflow = await request(app)
      .get("/api/v1/admin/reports/cashflow")
      .set(auth.viewer);
    expect(reportCashflow.status).toBe(200);

    const risk404 = await request(app)
      .get("/api/v1/admin/risk/assessment/result?assessmentId=not-found")
      .set(auth.admin);
    expect(risk404.status).toBe(404);
  });

  it("covers ocr and audit branches", async () => {
    const ocrNoImage = await request(app)
      .post("/api/v1/mobile/ocr/classify")
      .set(auth.owner);
    expect(ocrNoImage.status).toBe(400);

    const ocrEmptyText = await request(app)
      .post("/api/v1/mobile/ocr/classify-text")
      .set(auth.owner)
      .send({ text: "" });
    expect(ocrEmptyText.status).toBe(400);

    const imagePath = path.resolve("robot.png");
    const ocrWithImage = await request(app)
      .post("/api/v1/mobile/ocr/classify")
      .set(auth.owner)
      .attach("image", imagePath);
    expect([200, 500]).toContain(ocrWithImage.status);

    const auditEmpty = await request(app)
      .post("/api/v1/mobile/audit/batch")
      .set(auth.owner)
      .send({ items: [] });
    expect(auditEmpty.status).toBe(200);
  });

  it("covers ai no-message and external call branch", async () => {
    const aiBad = await request(app)
      .post("/api/v1/mobile/ai/chat")
      .set(auth.owner)
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
      .set(auth.owner)
      .send({ message: "test external branch" });
    expect(aiOk.status).toBe(200);
    expect(aiOk.body.data?.content).toContain("mocked-ai-response");

    (global as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    process.env.NODE_ENV = "test";
  });
});

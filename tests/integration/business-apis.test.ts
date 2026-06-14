import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../server/src/db.js";
import { createApp } from "../../server/src/app.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("business api integration", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "admin"]);
  });

  it("persists transaction create and update", async () => {
    const createResp = await request(app)
      .post("/api/v1/mobile/transactions")
      .set(auth.owner)
      .send({ amountCent: 4567, type: "EXPENSE", categoryName: "餐饮", note: "integration" });

    expect(createResp.status).toBe(201);
    const txId = createResp.body.data?.transactionId as string;
    expect(txId).toBeTruthy();

    const updateResp = await request(app)
      .patch(`/api/v1/mobile/transactions/${txId}`)
      .set(auth.owner)
      .send({ note: "integration-updated", isAnomaly: true });
    expect(updateResp.status).toBe(200);

    const row = await prisma.transaction.findUnique({ where: { id: txId } });
    expect(row?.note).toBe("integration-updated");
    expect(row?.isAnomaly).toBe(true);
  });

  it("supports ocr classify-text fallback", async () => {
    const resp = await request(app)
      .post("/api/v1/mobile/ocr/classify-text")
      .set(auth.owner)
      .send({ text: "午餐花了30元" });

    expect(resp.status).toBe(200);
    expect(resp.body.data?.amount).toBeDefined();
  });

  it("stores ai chat messages and session", async () => {
    const resp = await request(app)
      .post("/api/v1/mobile/ai/chat")
      .set(auth.owner)
      .send({ message: "帮我分析本月消费" });

    expect(resp.status).toBe(200);
    const sessionId = resp.body.data?.sessionId as string;
    expect(sessionId).toBeTruthy();

    const msgs = await prisma.chatMessage.findMany({ where: { sessionId } });
    expect(msgs.length).toBeGreaterThanOrEqual(2);
  });

  it("returns db-backed products and estimate", async () => {
    const listResp = await request(app)
      .get("/api/v1/mobile/products")
      .set(auth.owner);
    expect(listResp.status).toBe(200);
    expect(Array.isArray(listResp.body.data)).toBe(true);
    expect(listResp.body.data.length).toBeGreaterThan(0);

    const productId = listResp.body.data[0].productId as string;
    const estimateResp = await request(app)
      .get(`/api/v1/mobile/products/estimate?productId=${productId}&amount=10000&termDays=180`)
      .set(auth.owner);
    expect(estimateResp.status).toBe(200);
    expect(estimateResp.body.data?.estimate).toBeGreaterThan(0);
  });

  it("supports incentives and reminders persistence", async () => {
    const tasksResp = await request(app)
      .get("/api/v1/mobile/incentives/tasks")
      .set(auth.owner);
    expect(tasksResp.status).toBe(200);
    expect(tasksResp.body.data.length).toBeGreaterThan(0);

    const remindersResp = await request(app)
      .post("/api/v1/mobile/reminders")
      .set(auth.owner)
      .send({ title: "integration-reminder", type: "CUSTOM", config: { frequency: "WEEK" } });
    expect(remindersResp.status).toBe(201);
    const reminderId = remindersResp.body.data?.id as string;

    const dbReminder = await prisma.reminder.findUnique({ where: { id: reminderId } });
    expect(dbReminder?.id).toBe(reminderId);
  });

  it("supports admin risk assessment persistence", async () => {
    const startResp = await request(app)
      .post("/api/v1/admin/risk/assessment/start")
      .set(auth.admin)
      .send({});
    expect(startResp.status).toBe(200);
    const assessmentId = startResp.body.data?.assessmentId as string;

    const submitResp = await request(app)
      .post("/api/v1/admin/risk/assessment/submit")
      .set(auth.admin)
      .send({ assessmentId, answers: [{ qid: "q1", optionId: "o1" }] });
    expect(submitResp.status).toBe(200);
    expect(submitResp.body.data?.level).toBeTruthy();

    const dbAssessment = await prisma.riskAssessment.findUnique({ where: { id: assessmentId } });
    expect(dbAssessment?.status).toBe("COMPLETED");
  });
});

import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("route coverage integration", () => {
  const app = createApp();
  let auth: AuthMap;
  let covAuth: { Authorization: string };

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "admin", "operator", "viewer"]);

    // Create and login as cov_user for route coverage tests
    await request(app).post("/api/v1/mobile/auth/register").send({ username: "cov_user", password: "123" });
    const login = await request(app)
      .post("/api/v1/mobile/auth/login")
      .send({ username: "cov_user", password: "123" });
    covAuth = { Authorization: `Bearer ${login.body.token}` };
  });

  it("covers mobile auth register and me", async () => {
    const login = await request(app)
      .post("/api/v1/mobile/auth/login")
      .send({ username: "cov_user", password: "123" });
    expect(login.status).toBe(200);

    const me = await request(app)
      .get("/api/v1/mobile/auth/me")
      .set(covAuth);
    expect(me.status).toBe(200);
  });

  it("covers mobile transaction list/anomaly/delete", async () => {
    const created = await request(app)
      .post("/api/v1/mobile/transactions")
      .set(auth.owner)
      .send({ amountCent: 230000, type: "EXPENSE", categoryName: "购物", note: "anomaly" });
    expect(created.status).toBe(201);

    const list = await request(app)
      .get("/api/v1/mobile/transactions?page=1&size=10&categoryName=购物")
      .set(auth.owner);
    expect(list.status).toBe(200);

    const anomaly = await request(app)
      .get("/api/v1/mobile/transactions/anomaly-scan")
      .set(auth.owner);
    expect(anomaly.status).toBe(200);

    const txId = created.body.data?.transactionId as string;
    const del = await request(app)
      .delete(`/api/v1/mobile/transactions/${txId}`)
      .set(auth.owner);
    expect(del.status).toBe(200);
  });

  it("covers mobile analysis summary and insights", async () => {
    const summary = await request(app)
      .get("/api/v1/mobile/analysis/summary")
      .set(auth.owner);
    expect(summary.status).toBe(200);

    const insights = await request(app)
      .get("/api/v1/mobile/analysis/insights")
      .set(auth.owner);
    expect(insights.status).toBe(200);
  });

  it("covers mobile family endpoints", async () => {
    const create = await request(app)
      .post("/api/v1/mobile/family")
      .set(auth.owner)
      .send({ name: "覆盖家庭", description: "for-test" });
    expect(create.status).toBe(201);

    const members = await request(app)
      .get("/api/v1/mobile/family/members")
      .set(auth.owner);
    expect(members.status).toBe(200);

    const ledgers = await request(app)
      .get("/api/v1/mobile/family/ledgers")
      .set(auth.owner);
    expect(ledgers.status).toBe(200);

    const invite = await request(app)
      .post("/api/v1/mobile/family/invite")
      .set(auth.owner)
      .send({});
    expect(invite.status).toBe(200);
  });

  it("covers reminders update and status", async () => {
    const create = await request(app)
      .post("/api/v1/mobile/reminders")
      .set(auth.owner)
      .send({ title: "cov-reminder", type: "CUSTOM", dueAt: new Date().toISOString() });
    expect(create.status).toBe(201);
    const id = create.body.data?.id as string;

    const upd = await request(app)
      .post(`/api/v1/mobile/reminders/${id}`)
      .set(auth.owner)
      .send({ title: "cov-reminder-2" });
    expect(upd.status).toBe(200);

    const status = await request(app)
      .post(`/api/v1/mobile/reminders/${id}/status`)
      .set(auth.owner)
      .send({ status: "DONE" });
    expect(status.status).toBe(200);
  });

  it("covers products and audit routes", async () => {
    const list = await request(app)
      .get("/api/v1/mobile/products?riskLevel=MID")
      .set(auth.owner);
    expect(list.status).toBe(200);

    const detailId = (list.body.data?.[0]?.productId as string) || "P002";
    const detail = await request(app)
      .get(`/api/v1/mobile/products/${detailId}`)
      .set(auth.owner);
    expect(detail.status).toBe(200);

    const rec = await request(app)
      .get("/api/v1/mobile/products/recommend?riskPreference=MID&termDays=90")
      .set(auth.owner);
    expect(rec.status).toBe(200);

    const audit = await request(app)
      .post("/api/v1/mobile/audit/batch")
      .set(auth.owner)
      .send({ items: [{ action: "open-page", detail: { page: "home" } }] });
    expect(audit.status).toBe(200);
  });

  it("covers admin module routes", async () => {
    const uniqueName = `cov_admin_${Date.now()}`;
    const createUser = await request(app)
      .post("/api/v1/admin/users")
      .set(auth.admin)
      .send({ username: uniqueName, role: "viewer" });
    expect(createUser.status).toBe(201);
    const userId = createUser.body.data?.id as string;

    const usersList = await request(app)
      .get("/api/v1/admin/users?page=1&size=10&keyword=cov")
      .set(auth.admin);
    expect(usersList.status).toBe(200);

    const patchUser = await request(app)
      .patch(`/api/v1/admin/users/${userId}`)
      .set(auth.admin)
      .send({ isActive: false, role: "operator" });
    expect(patchUser.status).toBe(200);

    const txList = await request(app)
      .get("/api/v1/admin/transactions?page=1&size=10")
      .set(auth.operator);
    expect(txList.status).toBe(200);

    const txId = txList.body.data?.items?.[0]?.id as string | undefined;
    if (txId) {
      const txPatch = await request(app)
        .patch(`/api/v1/admin/transactions/${txId}`)
        .set(auth.operator)
        .send({ isAnomaly: true, note: "by-admin" });
      expect(txPatch.status).toBe(200);
    }

    const uniqueProductCode = `PCOV_${Date.now()}`;
    const productCreate = await request(app)
      .post("/api/v1/admin/products")
      .set(auth.operator)
      .send({ productCode: uniqueProductCode, name: "覆盖产品", riskLevel: "LOW", expectedYield: 2.1, termDays: 30 });
    expect(productCreate.status).toBe(201);
    const productId = productCreate.body.data?.id as string;

    const productPatch = await request(app)
      .patch(`/api/v1/admin/products/${productId}`)
      .set(auth.operator)
      .send({ isActive: false });
    expect(productPatch.status).toBe(200);

    const productDelete = await request(app)
      .delete(`/api/v1/admin/products/${productId}`)
      .set(auth.operator);
    expect(productDelete.status).toBe(200);

    const reports = await request(app)
      .get("/api/v1/admin/reports/income-expense")
      .set(auth.viewer);
    expect(reports.status).toBe(200);

    const system = await request(app)
      .get("/api/v1/admin/system")
      .set(auth.admin);
    expect(system.status).toBe(200);

    const audit = await request(app)
      .get("/api/v1/admin/system/audit")
      .set(auth.admin);
    expect(audit.status).toBe(200);
  });
});

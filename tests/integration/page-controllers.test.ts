import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";
import { initDB } from "../../server/src/db.js";
import { loadAccountingPageData } from "../../src/domains/ledger/pages/accounting-page.js";
import { loadConsumptionAnalysisData } from "../../src/domains/analysis/pages/consumption-analysis-page.js";
import { loadFinancialProductsData, loadRecommendedProducts } from "../../src/domains/products/pages/financial-products-page.js";
import { sendCustomerServiceMessage } from "../../src/domains/assistant/pages/customer-service-page.js";
import { loadFamilyMembersPage } from "../../src/domains/family/pages/family-page.js";
import { loadIncentiveTasks } from "../../src/domains/incentives/pages/incentive-center-page.js";
import { loadAdminDashboard } from "../../src/admin/pages/dashboard-page.js";
import { HttpClient } from "../../src/shared/utils/http-client.js";
import request from "supertest";

describe("page controllers migration", () => {
  const app = createApp();
  let server: ReturnType<typeof app.listen>;
  let client: HttpClient;
  let adminClient: HttpClient;

  beforeAll(async () => {
    await initDB();

    // Login to get JWT tokens
    const ownerLogin = await request(app)
      .post("/api/v1/mobile/auth/login")
      .send({ username: "demo_owner", password: "demo123" });
    const adminLogin = await request(app)
      .post("/api/v1/mobile/auth/login")
      .send({ username: "demo_admin", password: "demo123" });
    const ownerToken = ownerLogin.body.token as string;
    const adminToken = adminLogin.body.token as string;

    server = app.listen(3301);
    client = new HttpClient({
      baseUrl: "http://127.0.0.1:3301",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ownerToken}` }
    });
    adminClient = new HttpClient({
      baseUrl: "http://127.0.0.1:3301",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` }
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("loads accounting and analysis page data", async () => {
    const accounting = await loadAccountingPageData(client);
    const analysis = await loadConsumptionAnalysisData(client);

    expect(Array.isArray(accounting.list)).toBe(true);
    expect(Array.isArray(analysis.byCategory)).toBe(true);
  });

  it("loads products and recommendation page data", async () => {
    const products = await loadFinancialProductsData(client);
    const recommend = await loadRecommendedProducts(client, "MID");

    expect(products.length).toBeGreaterThan(0);
    expect(Array.isArray(recommend)).toBe(true);
  });

  it("loads assistant/family/incentive/dashboard page data", async () => {
    const ai = await sendCustomerServiceMessage(client, "你好，分析一下最近消费");
    const familyMembers = await loadFamilyMembersPage(client);
    const tasks = await loadIncentiveTasks(client);
    const dashboard = await loadAdminDashboard(adminClient);

    expect(ai.content.length).toBeGreaterThan(0);
    expect(Array.isArray(familyMembers)).toBe(true);
    expect(Array.isArray(tasks)).toBe(true);
    expect(dashboard.userCount).toBeGreaterThan(0);
  });
});

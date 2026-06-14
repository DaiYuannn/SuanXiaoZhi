import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("permission integration", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner", "family", "admin", "viewer"]);
  });

  it("allows owner to create mobile transaction", async () => {
    const response = await request(app)
      .post("/api/v1/mobile/transactions")
      .set(auth.owner)
      .send({ amountCent: 5200, type: "EXPENSE", categoryName: "餐饮", note: "dinner" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  it("denies family member transaction write", async () => {
    const response = await request(app)
      .post("/api/v1/mobile/transactions")
      .set(auth.family)
      .send({ amountCent: 5200, type: "EXPENSE", categoryName: "餐饮" });

    expect(response.status).toBe(403);
  });

  it("allows super admin to read users", async () => {
    const response = await request(app)
      .get("/api/v1/admin/users")
      .set(auth.admin);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.users ?? response.body.data)).toBe(true);
  });

  it("denies viewer to manage users", async () => {
    const response = await request(app)
      .post("/api/v1/admin/users")
      .set(auth.viewer)
      .send({ username: `new-user-${Date.now()}`, role: "viewer" });

    expect(response.status).toBe(403);
  });
});

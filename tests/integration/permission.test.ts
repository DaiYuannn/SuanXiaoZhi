import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";

describe("permission integration", () => {
  const app = createApp();

  it("allows owner to create mobile transaction", async () => {
    const response = await request(app)
      .post("/api/v1/mobile/transactions")
      .set("x-role", "owner")
      .send({ amountCent: 5200, category: "food", note: "dinner" });

    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
  });

  it("denies family member transaction write", async () => {
    const response = await request(app)
      .post("/api/v1/mobile/transactions")
      .set("x-role", "family")
      .send({ amountCent: 5200, category: "food" });

    expect(response.status).toBe(403);
  });

  it("allows super admin to read users", async () => {
    const response = await request(app)
      .get("/api/v1/admin/users")
      .set("x-role", "super_admin");

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.users)).toBe(true);
  });

  it("denies viewer to manage users", async () => {
    const response = await request(app)
      .post("/api/v1/admin/users")
      .set("x-role", "viewer")
      .send({ username: "new-user", role: "viewer" });

    expect(response.status).toBe(403);
  });
});
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";
import { seedTestDb, setupAuth, type AuthMap } from "../helpers/auth.js";

describe("performance baseline", () => {
  const app = createApp();
  let auth: AuthMap;

  beforeAll(async () => {
    await seedTestDb();
    auth = await setupAuth(app, ["owner"]);
  });

  it("keeps api response under 500ms", async () => {
    // Warm-up request to avoid cold-start penalty
    await request(app)
      .get("/api/v1/mobile/analysis")
      .set(auth.owner);

    const begin = performance.now();
    const response = await request(app)
      .get("/api/v1/mobile/analysis")
      .set(auth.owner);
    const cost = performance.now() - begin;

    expect(response.status).toBe(200);
    expect(cost).toBeLessThan(500);
  });
});

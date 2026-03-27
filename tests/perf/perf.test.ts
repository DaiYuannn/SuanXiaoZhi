import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../server/src/app.js";

describe("performance baseline", () => {
  const app = createApp();

  it("keeps api response under 500ms", async () => {
    const begin = performance.now();
    const response = await request(app)
      .get("/api/v1/mobile/analysis")
      .set("x-role", "owner");
    const cost = performance.now() - begin;

    expect(response.status).toBe(200);
    expect(cost).toBeLessThan(500);
  });
});
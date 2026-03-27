import { describe, expect, it } from "vitest";
import {
  createTransactionRequestSchema,
  createTransactionResponseSchema,
  listAdminUsersResponseSchema
} from "../../src/shared/contracts/api-contracts.js";

describe("api contracts", () => {
  it("validates create transaction request schema", () => {
    const parsed = createTransactionRequestSchema.parse({
      amountCent: 3000,
      category: "food",
      note: "lunch"
    });

    expect(parsed.amountCent).toBe(3000);
  });

  it("validates create transaction response schema", () => {
    const result = createTransactionResponseSchema.safeParse({
      ok: true,
      transaction: {
        id: "t-1",
        amountCent: 3000,
        category: "food",
        note: "ok",
        ts: new Date().toISOString()
      }
    });

    expect(result.success).toBe(true);
  });

  it("validates admin users response schema", () => {
    const result = listAdminUsersResponseSchema.safeParse({
      ok: true,
      users: [{ id: "a1", username: "root", role: "super_admin", isActive: true }]
    });

    expect(result.success).toBe(true);
  });
});
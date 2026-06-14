import request from "supertest";
import type { Express } from "express";
import { initDB } from "../../server/src/db.js";

type RoleKey = "owner" | "family" | "admin" | "operator" | "viewer" | "demo" | "owner2" | "family2";

type Account = {
  username: string;
  password: string;
};

const accounts: Record<RoleKey, Account> = {
  owner: { username: "demo_owner", password: "demo123" },
  family: { username: "demo_family", password: "demo123" },
  admin: { username: "demo_admin", password: "demo123" },
  operator: { username: "demo_operator", password: "demo123" },
  viewer: { username: "demo_viewer", password: "demo123" },
  demo: { username: "demo", password: "demo" },
  owner2: { username: "test_owner2", password: "test123" },
  family2: { username: "test_family2", password: "test123" }
};

export type AuthHeader = { Authorization: string };
export type AuthMap = Record<RoleKey, AuthHeader>;

export const seedTestDb = async (): Promise<void> => {
  await initDB();
};

export const loginAs = async (app: Express, key: RoleKey): Promise<AuthHeader> => {
  const account = accounts[key];
  const res = await request(app)
    .post("/api/v1/mobile/auth/login")
    .send(account);

  if (res.status !== 200 || !res.body?.token) {
    throw new Error(
      `loginAs(${key}) failed: status=${res.status}, body=${JSON.stringify(res.body)}`
    );
  }

  return { Authorization: `Bearer ${res.body.token}` };
};

export const setupAuth = async (
  app: Express,
  keys: RoleKey[] = ["owner", "family", "admin", "operator", "viewer", "demo", "owner2", "family2"]
): Promise<AuthMap> => {
  const result = {} as AuthMap;

  for (const key of keys) {
    result[key] = await loginAs(app, key);
  }

  return result;
};

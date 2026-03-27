import { Request } from "express";
import { prisma } from "../db.js";

const normalizeUsername = (input: string): string => {
  const safe = input.trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  return safe.length > 0 ? safe.slice(0, 40) : "demo";
};

export const resolveRequestUser = async (req: Request): Promise<{ id: string; username: string }> => {
  const hintRaw = req.user?.id ?? req.header("x-user-id") ?? "demo";
  const hint = String(hintRaw);

  const existed = await prisma.user.findFirst({
    where: {
      OR: [{ id: hint }, { username: hint }]
    }
  });

  if (existed) {
    return { id: existed.id, username: existed.username };
  }

  const username = normalizeUsername(hint);
  const created = await prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      passwordHash: "mock",
      role: req.user?.role ?? "owner"
    }
  });

  return { id: created.id, username: created.username };
};
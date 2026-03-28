import { Request } from "express";
import { prisma } from "../db.js";

export const resolveRequestUser = async (req: Request): Promise<{ id: string; username: string }> => {
  if (!req.user?.id) {
    throw new Error("unauthenticated");
  }

  const existed = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!existed) {
    throw new Error("user-not-found");
  }

  return { id: existed.id, username: existed.username };
};
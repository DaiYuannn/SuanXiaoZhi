import { z } from "zod";

export const loginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

export const createTransactionSchema = z.object({
  amountCent: z.number().int().positive(),
  category: z.string().min(1),
  note: z.string().max(200).optional()
});

export const aiChatSchema = z.object({
  message: z.string().min(1)
});

export const adminUserCreateSchema = z.object({
  username: z.string().min(1),
  role: z.enum(["super_admin", "operator", "viewer"])
});
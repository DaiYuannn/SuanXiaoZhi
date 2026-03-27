import { z } from "zod";

export const transactionSchema = z.object({
  id: z.string().min(1),
  amountCent: z.number().int().nonnegative(),
  category: z.string().min(1),
  note: z.string().default(""),
  ts: z.string().datetime()
});

export const createTransactionRequestSchema = z.object({
  amountCent: z.number().int().positive(),
  category: z.string().min(1),
  note: z.string().max(200).optional()
});

export const createTransactionResponseSchema = z.object({
  ok: z.literal(true),
  transaction: transactionSchema
});

export const adminUserSchema = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  role: z.string().min(1),
  isActive: z.boolean()
});

export const listAdminUsersResponseSchema = z.object({
  ok: z.literal(true),
  users: z.array(adminUserSchema)
});
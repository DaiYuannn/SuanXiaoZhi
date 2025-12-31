import { z } from 'zod';

export const PageRespSchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
  data: z.object({
    total: z.number(),
    page: z.number(),
    size: z.number(),
    list: z.array(z.any())
  })
});

export const ConsumptionSummarySchema = z.object({
  code: z.number().optional(),
  message: z.string().optional(),
  data: z.object({
    byCategory: z.array(z.object({ category: z.string(), amount: z.number(), count: z.number() })),
    trend: z.array(z.object({ date: z.string(), amount: z.number() })),
    frequency: z.array(z.object({ category: z.string(), count: z.number() }))
  })
});

export function assertPageResp(payload: any): boolean {
  const parsed = PageRespSchema.safeParse(payload);
  return parsed.success;
}

export function assertConsumptionSummary(payload: any): boolean {
  const parsed = ConsumptionSummarySchema.safeParse(payload);
  return parsed.success;
}

// Bill OCR result from vision LLM
// This schema is intentionally permissive while ensuring key fields exist.
export const BillOCRSchema = z.object({
  vendor: z.string().optional(),
  platform: z.string().optional(),
  datetime: z.string().optional(),
  currency: z.string().optional(),
  totalPaid: z.number().optional(),
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().optional(),
      price: z.number().optional(), // single item price
      amount: z.number().optional() // line amount
    })
  ).min(1)
});

export function assertBillOCR(payload: any): boolean {
  const parsed = BillOCRSchema.safeParse(payload);
  return parsed.success;
}

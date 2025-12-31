import { Router } from 'express';
import { prisma } from '../db.js';

export const consumptionRouter = Router();

// GET /api/v1/consumption/summary?from&to
consumptionRouter.get('/summary', async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();
    const rows = await prisma.transaction.findMany({
      where: { ts: { gte: from, lte: to } },
      select: { amountCent: true, category: true, ts: true }
    });

    // byCategory
    const byCategoryMap = new Map<string, { amount: number; count: number }>();
    for (const r of rows) {
      const key = r.category || '未分类';
      const cur = byCategoryMap.get(key) || { amount: 0, count: 0 };
      cur.amount += r.amountCent; // 单位：分
      cur.count += 1;
      byCategoryMap.set(key, cur);
    }
    const byCategory = Array.from(byCategoryMap.entries()).map(([category, v]) => ({ category, amount: v.amount, count: v.count }));

    // trend by day
    const dayKey = (d: Date) => d.toISOString().slice(0, 10);
    const trendMap = new Map<string, number>();
    for (const r of rows) {
      const k = dayKey(r.ts);
      trendMap.set(k, (trendMap.get(k) || 0) + r.amountCent);
    }
    // fill missing days
    const days: string[] = [];
    const cur = new Date(from);
    while (cur <= to) {
      days.push(dayKey(cur));
      cur.setDate(cur.getDate() + 1);
    }
    const trend = days.map(d => ({ date: d, amount: trendMap.get(d) || 0 }));

    // frequency by category
    const frequency = byCategory.map(x => ({ category: x.category, count: x.count }));

    res.json({ code: 0, message: 'ok', data: { byCategory, trend, frequency } });
  } catch (e) { next(e); }
});

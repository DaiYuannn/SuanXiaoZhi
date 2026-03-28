import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { prisma } from "../../../db.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/summary", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : new Date(Date.now() - 7 * 86400000);
    const to = req.query.to ? new Date(String(req.query.to)) : new Date();

    const rows = await prisma.transaction.findMany({
      where: { ts: { gte: from, lte: to } },
      select: { amountCent: true, categoryName: true, ts: true }
    });

    const byCategoryMap = new Map<string, { amount: number; count: number }>();
    const trendMap = new Map<string, number>();

    for (const row of rows) {
      const categoryName = (row.categoryName || 'Uncategorized') || "未分类";
      const stat = byCategoryMap.get(categoryName) ?? { amount: 0, count: 0 };
      stat.amount += row.amountCent;
      stat.count += 1;
      byCategoryMap.set(categoryName, stat);

      const day = row.ts.toISOString().slice(0, 10);
      trendMap.set(day, (trendMap.get(day) ?? 0) + row.amountCent);
    }

    const byCategory = Array.from(byCategoryMap.entries()).map(([categoryName, value]) => ({
      categoryName,
      amount: value.amount,
      count: value.count
    }));

    const trend = Array.from(trendMap.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const frequency = byCategory.map((item) => ({ categoryName: item.categoryName, count: item.count }));

    res.json({ ok: true, code: 0, message: "ok", data: { byCategory, trend, frequency } });
  } catch (error) {
    next(error);
  }
});

router.get("/insights", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const where = from || to ? { ts: { gte: from, lte: to } } : undefined;
    const rows = await prisma.transaction.findMany({ where });

    const byCategory = new Map<string, number>();
    for (const row of rows) {
      byCategory.set((row.categoryName || 'Uncategorized'), (byCategory.get((row.categoryName || 'Uncategorized')) ?? 0) + Math.abs(row.amountCent));
    }

    const top = Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1])[0];
    const total = Array.from(byCategory.values()).reduce((sum, value) => sum + value, 0);
    const topPct = top ? Math.round((top[1] / Math.max(total, 1)) * 100) : 0;

    const summary = [
      top ? `主要支出集中在${top[0]}，约占${topPct}%` : "暂无明显支出集中分类",
      `统计周期内共${rows.length}笔交易`
    ];

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        summary,
        recommendation: top ? `建议为${top[0]}设置预算上限并追踪周环比` : "建议先建立基础预算分类"
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (_req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthly = await prisma.transaction.findMany({ where: { ts: { gte: startOfMonth } } });

    const monthExpenseCent = monthly.filter((row) => row.amountCent > 0).reduce((sum, row) => sum + row.amountCent, 0);
    const monthIncomeCent = 1200000;
    const savingRate = monthIncomeCent > 0 ? Number(((monthIncomeCent - monthExpenseCent) / monthIncomeCent).toFixed(3)) : 0;

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      summary: { monthExpenseCent, monthIncomeCent, savingRate }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
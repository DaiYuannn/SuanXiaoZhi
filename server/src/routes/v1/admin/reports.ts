import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.REPORT_READ), (_req, res) => {
  res.json({ ok: true, code: 0, message: "ok", reports: ["daily", "weekly", "monthly"] });
});

router.get("/:type", requirePermission(Permission.REPORT_READ), async (req, res, next) => {
  try {
    const type = req.params.type;

    if (type === "income-expense") {
      const rows = await prisma.transaction.findMany({ orderBy: { ts: "desc" }, take: 200 });
      const map = new Map<string, { income: number; expense: number }>();
      for (const row of rows) {
        const month = row.ts.toISOString().slice(0, 7);
        const stat = map.get(month) ?? { income: 0, expense: 0 };
        if (row.amountCent < 0) {
          stat.income += Math.abs(row.amountCent);
        } else {
          stat.expense += row.amountCent;
        }
        map.set(month, stat);
      }
      const byMonth = Array.from(map.entries()).map(([month, stat]) => ({ month, income: stat.income, expense: stat.expense }));
      res.json({ ok: true, code: 0, message: "ok", data: { type, payload: { byMonth } } });
      return;
    }

    if (type === "balance-sheet") {
      const products = await prisma.product.findMany({ where: { isActive: true } });
      const totalInvest = products.reduce((sum, product) => sum + product.termDays * product.expectedYield, 0);
      res.json({
        ok: true,
        code: 0,
        message: "ok",
        data: { type, payload: { assets: Math.round(totalInvest * 100), liabilities: 300000, netWorth: Math.round(totalInvest * 100 - 300000) } }
      });
      return;
    }

    const tx = await prisma.transaction.findMany({ where: { ts: { gte: new Date(Date.now() - 30 * 86400000) } } });
    const outflow = tx.reduce((sum, row) => sum + Math.max(row.amountCent, 0), 0);
    const inflow = 120000;
    res.json({ ok: true, code: 0, message: "ok", data: { type: "cashflow", payload: { inflow, outflow, net: inflow - outflow } } });
  } catch (error) {
    next(error);
  }
});

export default router;
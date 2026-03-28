import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const date = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);

    let rows = await prisma.transaction.findMany({
      where: { userId: user.id, ts: { gte: from, lte: to } },
      orderBy: { ts: "desc" }
    });

    let sourceDate = date;

    // If the requested day has no records, fallback to latest day with transactions.
    if (rows.length === 0) {
      const latest = await prisma.transaction.findFirst({
        where: { userId: user.id },
        orderBy: { ts: "desc" },
        select: { ts: true }
      });

      if (latest?.ts) {
        sourceDate = latest.ts.toISOString().slice(0, 10);
        const latestFrom = new Date(`${sourceDate}T00:00:00.000Z`);
        const latestTo = new Date(`${sourceDate}T23:59:59.999Z`);
        rows = await prisma.transaction.findMany({
          where: { userId: user.id, ts: { gte: latestFrom, lte: latestTo } },
          orderBy: { ts: "desc" }
        });
      }
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      meta: { requestedDate: date, sourceDate },
      data: rows.map((row) => ({
        id: row.id,
        amount: row.amountCent >= 0 ? -Math.abs(row.amountCent) : Math.abs(row.amountCent),
        time: row.ts.toISOString(),
        channel: row.source,
        category: row.categoryName ?? "未分类",
        categoryName: row.categoryName
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

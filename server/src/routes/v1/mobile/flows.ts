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

    const rows = await prisma.transaction.findMany({
      where: { userId: user.id, ts: { gte: from, lte: to } },
      orderBy: { ts: "desc" }
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
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

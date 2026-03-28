import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.TRANSACTION_MANAGE), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    const categoryName = req.query.categoryName ? String(req.query.categoryName) : undefined;
    const where = categoryName ? { categoryName } : undefined;

    const [total, items] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({ where, orderBy: { ts: "desc" }, skip: (page - 1) * size, take: size })
    ]);

    res.json({ ok: true, code: 0, message: "ok", data: { total, page, size, items } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.TRANSACTION_MANAGE), async (req, res, next) => {
  try {
    const row = await prisma.transaction.update({
      where: { id: req.params.id },
      data: {
        ...(req.body?.categoryName ? { categoryName: String(req.body.categoryName) } : {}),
        ...(req.body?.note !== undefined ? { note: req.body.note ? String(req.body.note) : null } : {}),
        ...(typeof req.body?.isAnomaly === "boolean" ? { isAnomaly: req.body.isAnomaly } : {})
      }
    });
    res.json({ ok: true, code: 0, message: "ok", data: row });
  } catch (error) {
    next(error);
  }
});

export default router;
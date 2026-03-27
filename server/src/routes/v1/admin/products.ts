import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.PRODUCT_MANAGE), async (_req, res, next) => {
  try {
    const items = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
    res.json({ ok: true, code: 0, message: "ok", data: items });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.PRODUCT_MANAGE), async (req, res, next) => {
  try {
    const productCode = String(req.body?.productCode ?? "").trim();
    const name = String(req.body?.name ?? "").trim();
    if (!productCode || !name) {
      res.status(400).json({ ok: false, code: 400, message: "productCode and name required" });
      return;
    }

    const row = await prisma.product.create({
      data: {
        productCode,
        name,
        riskLevel: String(req.body?.riskLevel ?? "MID"),
        expectedYield: Number(req.body?.expectedYield ?? 3.5),
        termDays: Number(req.body?.termDays ?? 180),
        description: req.body?.description ? String(req.body.description) : null,
        isActive: req.body?.isActive === undefined ? true : Boolean(req.body.isActive)
      }
    });

    res.status(201).json({ ok: true, code: 0, message: "ok", data: row });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.PRODUCT_MANAGE), async (req, res, next) => {
  try {
    const row = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...(req.body?.name ? { name: String(req.body.name) } : {}),
        ...(req.body?.riskLevel ? { riskLevel: String(req.body.riskLevel) } : {}),
        ...(req.body?.expectedYield !== undefined ? { expectedYield: Number(req.body.expectedYield) } : {}),
        ...(req.body?.termDays !== undefined ? { termDays: Number(req.body.termDays) } : {}),
        ...(req.body?.description !== undefined ? { description: req.body.description ? String(req.body.description) : null } : {}),
        ...(req.body?.isActive !== undefined ? { isActive: Boolean(req.body.isActive) } : {})
      }
    });
    res.json({ ok: true, code: 0, message: "ok", data: row });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requirePermission(Permission.PRODUCT_MANAGE), async (req, res, next) => {
  try {
    const row = await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true, code: 0, message: "ok", data: row });
  } catch (error) {
    next(error);
  }
});

export default router;
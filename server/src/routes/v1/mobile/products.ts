import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const risk = req.query.riskLevel ? String(req.query.riskLevel) : undefined;
    const rows = await prisma.product.findMany({ where: { isActive: true, ...(risk ? { riskLevel: risk } : {}) } });
    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: rows.map((row) => ({
        productId: row.productCode,
        name: row.name,
        riskLevel: row.riskLevel,
        expectedYield: row.expectedYield,
        termDays: row.termDays,
        description: row.description
      }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/recommend", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const riskPreference = String(req.query.riskPreference ?? "MID");
    const termDays = Number(req.query.termDays ?? 180);

    const rows = await prisma.product.findMany({ where: { isActive: true } });
    const sorted = rows
      .map((row) => {
        const riskScore = row.riskLevel === riskPreference ? 0.2 : 0;
        const termScore = 1 - Math.min(Math.abs(row.termDays - termDays) / 365, 1);
        const yieldScore = Math.min(row.expectedYield / 10, 1);
        const score = Number((riskScore + termScore * 0.4 + yieldScore * 0.4).toFixed(2));
        return { row, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((item) => ({
        product: {
          productId: item.row.productCode,
          name: item.row.name,
          riskLevel: item.row.riskLevel,
          expectedYield: item.row.expectedYield,
          termDays: item.row.termDays
        },
        score: item.score,
        reason: "风险与期限匹配"
      }));

    res.json({ ok: true, code: 0, message: "ok", data: sorted });
  } catch (error) {
    next(error);
  }
});

router.get("/estimate", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const productId = String(req.query.productId ?? "P002");
    const amount = Number(req.query.amount ?? 10000);
    const termDays = Number(req.query.termDays ?? 180);

    const product = await prisma.product.findUnique({ where: { productCode: productId } });
    if (!product) {
      res.status(404).json({ ok: false, code: 404, message: "product not found" });
      return;
    }

    const estimate = Number((amount * (product.expectedYield / 100) * (termDays / 365)).toFixed(2));
    res.json({ ok: true, code: 0, message: "ok", data: { productId, estimate, termDays } });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { productCode: req.params.id } });
    if (!product) {
      res.status(404).json({ ok: false, code: 404, message: "product not found" });
      return;
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        productId: product.productCode,
        name: product.name,
        riskLevel: product.riskLevel,
        expectedYield: product.expectedYield,
        termDays: product.termDays,
        description: product.description,
        historyYieldPoints: []
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
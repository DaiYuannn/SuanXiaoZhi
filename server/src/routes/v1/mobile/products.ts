import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

// ---------------------------------------------------------------------------
// Product risk metrics & history yield generator (deterministic)
// ---------------------------------------------------------------------------
interface ProductMetrics {
  riskScore: number;
  volatility: number;
  sharpe: number;
  historyYieldPoints: Array<{ date: string; yield: number }>;
}

// Deterministic pseudo-random based on product code
const seedFromCode = (code: string): number => {
  let h = 0;
  for (let i = 0; i < code.length; i++) {
    h = ((h << 5) - h) + code.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
};

const productMetricsCache = new Map<string, ProductMetrics>();

const generateMetrics = (productCode: string, riskLevel: string, expectedYield: number): ProductMetrics => {
  const cached = productMetricsCache.get(productCode);
  if (cached) return cached;

  const seed = seedFromCode(productCode);
  const rand = (min: number, max: number): number => {
    const r = (seed * 16807 + (productCode.length * 31)) % 2147483647;
    return min + (r / 2147483647) * (max - min);
  };

  // Risk score based on risk level
  const riskScoreMap: Record<string, { min: number; max: number }> = {
    LOW: { min: 15, max: 28 },
    MID: { min: 35, max: 55 },
    HIGH: { min: 58, max: 78 },
  };
  const rs = riskScoreMap[riskLevel] || { min: 30, max: 45 };
  const riskScore = Math.round(rand(rs.min, rs.max));

  // Volatility based on risk level
  const volMap: Record<string, { min: number; max: number }> = {
    LOW: { min: 1.2, max: 3.5 },
    MID: { min: 4.0, max: 8.5 },
    HIGH: { min: 10.0, max: 18.0 },
  };
  const vm = volMap[riskLevel] || { min: 3, max: 8 };
  const volatility = Math.round(rand(vm.min, vm.max) * 10) / 10;

  // Sharpe ratio based on risk level
  const sharpeMap: Record<string, { min: number; max: number }> = {
    LOW: { min: 1.2, max: 2.8 },
    MID: { min: 0.6, max: 1.6 },
    HIGH: { min: 0.2, max: 1.0 },
  };
  const sm = sharpeMap[riskLevel] || { min: 0.5, max: 1.5 };
  const sharpe = Math.round(rand(sm.min, sm.max) * 100) / 100;

  // Generate 12 months of historical yield data
  const baseYield = expectedYield;
  const months = 12;
  const historyYieldPoints: Array<{ date: string; yield: number }> = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = date.toISOString().slice(0, 7); // YYYY-MM
    // Yield varies around baseYield with volatility-based noise
    const seasonal = Math.sin((i / months) * Math.PI * 2 + seed * 0.01) * 0.3;
    const noise = (rand(-1, 1) * volatility * 0.15);
    const y = Math.round((baseYield + seasonal * baseYield * 0.15 + noise) * 100) / 100;
    historyYieldPoints.push({ date: dateStr, yield: y });
  }

  const metrics: ProductMetrics = { riskScore, volatility, sharpe, historyYieldPoints };
  productMetricsCache.set(productCode, metrics);
  return metrics;
};

const productToResponse = (row: { productCode: string; name: string; riskLevel: string; expectedYield: number; termDays: number; description: string | null; isActive: boolean }) => {
  const metrics = generateMetrics(row.productCode, row.riskLevel, row.expectedYield);
  return {
    productId: row.productCode,
    name: row.name,
    riskLevel: row.riskLevel,
    expectedYield: row.expectedYield,
    termDays: row.termDays,
    description: row.description,
    isActive: row.isActive,
    riskScore: metrics.riskScore,
    volatility: metrics.volatility,
    sharpe: metrics.sharpe,
    historyYieldPoints: metrics.historyYieldPoints,
  };
};

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const risk = req.query.riskLevel ? String(req.query.riskLevel) : undefined;
    const rows = await prisma.product.findMany({ where: { isActive: true, ...(risk ? { riskLevel: risk } : {}) } });
    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: rows.map(productToResponse)
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
      data: productToResponse(product)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
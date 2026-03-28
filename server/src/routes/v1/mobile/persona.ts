import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/profile", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const [detail, persona] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { id: true } }),
      prisma.persona.findUnique({ where: { userId: user.id } })
    ]);

    const riskLevel =
      persona?.riskProfile === "进取" || persona?.riskProfile === "HIGH"
        ? "HIGH"
        : persona?.riskProfile === "保守" || persona?.riskProfile === "LOW"
          ? "LOW"
          : "MID";

    const preferences = persona?.spendTopCategories
      ? (() => {
          try {
            return JSON.parse(persona.spendTopCategories) as Record<string, number>;
          } catch {
            return { food: 0.3, shopping: 0.2, transport: 0.1 };
          }
        })()
      : { food: 0.3, shopping: 0.2, transport: 0.1 };

    const tags = [
      riskLevel === "HIGH" ? "进取型" : riskLevel === "LOW" ? "稳健型" : "平衡型",
      persona?.incomeBand ? `收入:${persona.incomeBand}` : "画像待完善"
    ];

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        userId: detail?.id ?? user.id,
        riskLevel,
        preferences,
        tags
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/profile/tags", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const size = Number(req.query.size ?? 20);
    const rows = await prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { ts: "desc" },
      take: Number.isFinite(size) ? Math.max(1, Math.min(size, 200)) : 20
    });

    const byCategory = new Map<string, number>();
    for (const row of rows) {
      byCategory.set((row.categoryName || 'Uncategorized'), (byCategory.get((row.categoryName || 'Uncategorized')) ?? 0) + Math.abs(row.amountCent));
    }

    const topCategories = Array.from(byCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((item) => item[0]);

    const groups = [
      { group: "风险偏好", tags: ["中风险承受", "目标导向"] },
      { group: "消费画像", tags: topCategories.length ? topCategories : ["交易样本不足"] }
    ];

    const total = groups.reduce((sum, group) => sum + group.tags.length, 0);
    res.json({ ok: true, code: 0, message: "ok", data: { groups, total } });
  } catch (error) {
    next(error);
  }
});

export default router;

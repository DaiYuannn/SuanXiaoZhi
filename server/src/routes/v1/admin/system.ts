import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.SYSTEM_MANAGE), async (_req, res, next) => {
  try {
    const [userCount, txCount, auditCount] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.auditEvent.count()
    ]);

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      system: {
        uptimeSec: Math.floor(process.uptime()),
        mode: process.env.NODE_ENV ?? "development",
        userCount,
        txCount,
        auditCount
      }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/audit", requirePermission(Permission.SYSTEM_MANAGE), async (_req, res, next) => {
  try {
    const rows = await prisma.auditEvent.findMany({ orderBy: { ts: "desc" }, take: 50 });
    res.json({ ok: true, code: 0, message: "ok", data: rows });
  } catch (error) {
    next(error);
  }
});

export default router;
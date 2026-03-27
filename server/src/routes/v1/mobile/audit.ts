import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.post("/batch", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (items.length > 0) {
      await prisma.auditEvent.createMany({
        data: items.map((item: { action?: unknown; detail?: unknown; ts?: unknown }) => ({
          actorId: user.id,
          action: String(item.action ?? "unknown"),
          detail: item.detail ? JSON.stringify(item.detail) : null,
          ts: item.ts ? new Date(String(item.ts)) : new Date()
        }))
      });
    }

    res.json({ ok: true, code: 0, message: "ok", data: { accepted: items.length } });
  } catch (error) {
    next(error);
  }
});

export default router;
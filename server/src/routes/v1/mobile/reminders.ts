import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const toApi = (row: { id: string; type: string; status: string; config: string | null }): {
  id: string;
  title: string;
  type: string;
  dueAt: string;
  status: string;
  config: unknown;
} => {
  let cfg: Record<string, unknown> = {};
  if (row.config) {
    try {
      cfg = JSON.parse(row.config) as Record<string, unknown>;
    } catch {
      cfg = {};
    }
  }

  return {
    id: row.id,
    title: String(cfg.title ?? "提醒"),
    type: row.type,
    dueAt: String(cfg.dueAt ?? new Date().toISOString()),
    status: row.status === "ACTIVE" ? "PENDING" : row.status,
    config: cfg
  };
};

const router = Router();

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const count = await prisma.reminder.count({ where: { userId: user.id } });
    if (count === 0) {
      await prisma.reminder.createMany({
        data: [
          {
            userId: user.id,
            type: "AUDIT",
            status: "ACTIVE",
            config: JSON.stringify({ title: "每周账单对账", frequency: "WEEK", timeOfDay: "09:00" })
          },
          {
            userId: user.id,
            type: "BILL",
            status: "ACTIVE",
            config: JSON.stringify({ title: "信用卡还款", frequency: "MONTH", timeOfDay: "10:00" })
          }
        ]
      });
    }

    const rows = await prisma.reminder.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" } });
    res.json({ ok: true, code: 0, message: "ok", data: rows.map(toApi) });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const title = req.body?.title ? String(req.body.title) : "提醒";
    const dueAt = req.body?.dueAt ? String(req.body.dueAt) : new Date().toISOString();
    const type = String(req.body?.type ?? "CUSTOM");
    const status = String(req.body?.status ?? "ACTIVE");
    const config = JSON.stringify({ ...(req.body?.config ?? {}), title, dueAt });

    const row = await prisma.reminder.create({ data: { userId: user.id, type, status, config } });
    res.status(201).json({ ok: true, code: 0, message: "ok", data: toApi(row) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/status", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const row = await prisma.reminder.update({
      where: { id: req.params.id },
      data: { status: String(req.body?.status ?? "ACTIVE") }
    });
    res.json({ ok: true, code: 0, message: "ok", data: toApi(row) });
  } catch (error) {
    next(error);
  }
});

router.post("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const current = await prisma.reminder.findUnique({ where: { id: req.params.id } });
    if (!current) {
      res.status(404).json({ ok: false, code: 404, message: "not found" });
      return;
    }

    let cfg: Record<string, unknown> = {};
    try {
      cfg = current.config ? (JSON.parse(current.config) as Record<string, unknown>) : {};
    } catch {
      cfg = {};
    }

    const nextCfg = JSON.stringify({
      ...cfg,
      ...(req.body?.config ?? {}),
      ...(req.body?.title ? { title: String(req.body.title) } : {}),
      ...(req.body?.dueAt ? { dueAt: String(req.body.dueAt) } : {})
    });

    const row = await prisma.reminder.update({ where: { id: req.params.id }, data: { config: nextCfg } });
    res.json({ ok: true, code: 0, message: "ok", data: toApi(row) });
  } catch (error) {
    next(error);
  }
});

export default router;
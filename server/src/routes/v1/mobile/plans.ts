import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";

const router = Router();

type PlanStatus = "ongoing" | "done" | "adjusted";

// 获取当前用户可访问的所有用户 ID（自己 + 同家庭其他成员）
const getAccessibleUserIds = async (userId: string): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { family: { include: { members: { select: { id: true } } } } },
  });
  if (!user?.family) return [userId];
  return user.family.members.map((m) => m.id);
};

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const accessibleUserIds = await getAccessibleUserIds(user.id);
    const rows = await prisma.plan.findMany({
      where: { userId: { in: accessibleUserIds } },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: rows.map((row) => ({
        planId: row.id,
        name: row.name,
        goal: row.goal ?? undefined,
        content: row.content ? (() => { try { return JSON.parse(row.content); } catch { return row.content; } })() : undefined,
        status: row.status as PlanStatus,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};

    const row = await prisma.plan.create({
      data: {
        userId: user.id,
        name: String(body.name ?? "新规划"),
        goal: body.goal ? String(body.goal) : null,
        content: body.content ? JSON.stringify(body.content) : null,
        status: ["done", "adjusted", "ongoing"].includes(body.status) ? body.status : "ongoing",
      },
    });

    res.status(201).json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        planId: row.id,
        name: row.name,
        goal: row.goal ?? undefined,
        content: row.content ? (() => { try { return JSON.parse(row.content!); } catch { return row.content; } })() : undefined,
        status: row.status as PlanStatus,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const accessibleUserIds = await getAccessibleUserIds(user.id);
    const plan = await prisma.plan.findFirst({
      where: { id: req.params.id, userId: { in: accessibleUserIds } },
    });
    if (!plan) {
      res.status(404).json({ ok: false, code: 404, message: "plan not found" });
      return;
    }

    const body = req.body ?? {};
    const row = await prisma.plan.update({
      where: { id: plan.id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.goal !== undefined ? { goal: String(body.goal) } : {}),
        ...(body.content !== undefined ? { content: JSON.stringify(body.content) } : {}),
        ...(["done", "adjusted", "ongoing"].includes(body.status) ? { status: body.status } : {}),
      },
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        planId: row.id,
        name: row.name,
        goal: row.goal ?? undefined,
        content: row.content ? (() => { try { return JSON.parse(row.content!); } catch { return row.content; } })() : undefined,
        status: row.status as PlanStatus,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const accessibleUserIds = await getAccessibleUserIds(user.id);
    const plan = await prisma.plan.findFirst({
      where: { id: req.params.id, userId: { in: accessibleUserIds } },
    });
    if (!plan) {
      res.status(404).json({ ok: false, code: 404, message: "plan not found" });
      return;
    }

    await prisma.plan.delete({ where: { id: plan.id } });
    res.json({ ok: true, code: 0, message: "ok", data: { planId: plan.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;

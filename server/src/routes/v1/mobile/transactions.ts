import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/anomaly-scan", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const since = req.query.since
      ? new Date(String(req.query.since))
      : new Date(Date.now() - 30 * 86400000);
    const suspects = await prisma.transaction.findMany({
      where: { ts: { gte: since }, amountCent: { gt: 200000 } },
      select: { id: true }
    });

    res.json({ ok: true, code: 0, message: "ok", data: { anomalies: suspects.map((item) => item.id) } });
  } catch (error) {
    next(error);
  }
});

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const category = req.query.category ? String(req.query.category) : undefined;
    const ledgerId = req.query.ledgerId ? String(req.query.ledgerId) : undefined;

    const where: {
      ts?: { gte?: Date; lte?: Date };
      category?: string;
      ledgerId?: string;
    } = {};

    if (from || to) {
      where.ts = { gte: from, lte: to };
    }
    if (category) {
      where.category = category;
    }
    if (ledgerId) {
      where.ledgerId = ledgerId;
    }

    const total = await prisma.transaction.count({ where });
    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { ts: "desc" },
      skip: (page - 1) * size,
      take: size
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        total,
        page,
        size,
        list: rows.map((row) => ({
          transactionId: row.id,
          accountId: row.ledgerId ?? "default",
          time: row.ts.toISOString(),
          type: row.amountCent >= 0 ? "EXPENSE" : "INCOME",
          amount: Math.abs(row.amountCent),
          category: row.category,
          description: row.note ?? undefined,
          remark: row.note ?? undefined,
          isAnomaly: row.isAnomaly,
          source: row.source
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};
    const amountCent = Number(body.amountCent ?? body.amount ?? 0);
    const note = body.note ?? body.remark ?? body.description;

    const row = await prisma.transaction.create({
      data: {
        amountCent,
        category: String(body.category ?? "未分类"),
        note: note ? String(note) : null,
        ts: body.ts || body.time ? new Date(body.ts ?? body.time) : new Date(),
        source: String(body.source ?? "manual"),
        isAnomaly: Boolean(body.isAnomaly ?? false),
        ledgerId: body.ledgerId ? String(body.ledgerId) : undefined,
        userId: user.id
      }
    });

    const task = await prisma.task.findUnique({ where: { code: "ADD_TRANSACTION" } });
    if (task) {
      await prisma.userTask.upsert({
        where: { userId_taskId: { userId: user.id, taskId: task.id } },
        update: { status: "COMPLETED", progress: 1, lastCompletedAt: new Date() },
        create: {
          userId: user.id,
          taskId: task.id,
          status: "COMPLETED",
          progress: 1,
          lastCompletedAt: new Date()
        }
      });
    }

    const txCount = await prisma.transaction.count({ where: { userId: user.id } });
    if (txCount === 1) {
      const firstStep = await prisma.achievement.findUnique({ where: { code: "FIRST_STEP" } });
      if (firstStep) {
        await prisma.userAchievement
          .create({ data: { userId: user.id, achievementId: firstStep.id } })
          .catch(() => undefined);
      }
    }

    res.status(201).json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        transactionId: row.id,
        time: row.ts.toISOString(),
        amount: Math.abs(row.amountCent),
        category: row.category,
        remark: row.note ?? undefined,
        isAnomaly: row.isAnomaly,
        source: row.source
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const id = req.params.id;
    const body = req.body ?? {};

    const row = await prisma.transaction.update({
      where: { id },
      data: {
        amountCent: body.amountCent ?? body.amount,
        category: body.category,
        note: body.note ?? body.remark ?? body.description,
        ts: body.ts || body.time ? new Date(body.ts ?? body.time) : undefined,
        source: body.source,
        isAnomaly: body.isAnomaly
      }
    });

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        transactionId: row.id,
        time: row.ts.toISOString(),
        amount: Math.abs(row.amountCent),
        category: row.category,
        remark: row.note ?? undefined,
        isAnomaly: row.isAnomaly
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ ok: true, code: 0, message: "ok", data: { deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;
import { Router } from "express";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/anomaly-scan", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const since = req.query.since
      ? new Date(String(req.query.since))
      : new Date(Date.now() - 30 * 86400000);

    // 获取当前用户可访问的账本（与 GET / 列表一致）
    const userDetail = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        family: {
          include: {
            ledgers: { select: { id: true } },
            members: { select: { id: true } }
          }
        }
      }
    });

    // 共享家庭账本 + 所有家庭成员的个人账本
    const familyLedgerIds = userDetail?.family?.ledgers.map((item) => item.id) ?? [];
    const familyMemberIds = userDetail?.family?.members.map(m => m.id) ?? [];
    const memberLedgers = userDetail?.family
      ? await prisma.ledger.findMany({
          where: { ownerId: { in: familyMemberIds } },
          select: { id: true }
        })
      : [];
    const accessibleLedgerIds = Array.from(new Set([...familyLedgerIds, ...memberLedgers.map(l => l.id)]));

    const suspects = await prisma.transaction.findMany({
      where: {
        ts: { gte: since },
        amountCent: { gt: 200000 },
        AND: [
          {
            OR: [
              { userId: user.id },
              { ledgerId: { in: accessibleLedgerIds } },
              { targetLedgerId: { in: accessibleLedgerIds } }
            ]
          }
        ]
      },
      select: { id: true }
    });

    res.json({ ok: true, code: 0, message: "ok", data: { anomalies: suspects.map((item) => item.id) } });
  } catch (error) {
    next(error);
  }
});

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    const from = req.query.from ? new Date(String(req.query.from)) : undefined;
    const to = req.query.to ? new Date(String(req.query.to)) : undefined;
    const categoryName = req.query.categoryName ? String(req.query.categoryName) : undefined;
    const ledgerId = req.query.ledgerId ? String(req.query.ledgerId) : undefined;

    const userDetail = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        family: {
          include: {
            ledgers: { select: { id: true } },
            members: { select: { id: true } }
          }
        }
      }
    });

    // 共享家庭账本 + 所有家庭成员的个人账本
    const familyLedgerIds = userDetail?.family?.ledgers.map((item) => item.id) ?? [];
    const familyMemberIds = userDetail?.family?.members.map(m => m.id) ?? [];
    const memberLedgers = userDetail?.family
      ? await prisma.ledger.findMany({
          where: { ownerId: { in: familyMemberIds } },
          select: { id: true }
        })
      : [];
    const accessibleLedgerIds = Array.from(new Set([...familyLedgerIds, ...memberLedgers.map(l => l.id)]));

    const where: {
      ts?: { gte?: Date; lte?: Date };
      categoryName?: string;
      AND?: any[];
    } = {};

    if (from || to) {
      where.ts = { gte: from, lte: to };
    }
    if (categoryName) {
      where.categoryName = categoryName;
    }
    if (ledgerId && accessibleLedgerIds.includes(ledgerId)) {
      where.AND = [
        {
          OR: [{ ledgerId }, { targetLedgerId: ledgerId }, { userId: user.id }]
        }
      ];
    } else {
      where.AND = [
        {
          OR: [
            { userId: user.id },
            { ledgerId: { in: accessibleLedgerIds } },
            { targetLedgerId: { in: accessibleLedgerIds } }
          ]
        }
      ];
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
          targetAccountId: row.targetLedgerId,
          time: row.ts.toISOString(),
          type: row.type || (row.amountCent >= 0 ? "EXPENSE" : "INCOME"),
          amount: Math.abs(row.amountCent),
          fee: row.feeCent,
          categoryName: row.categoryName,
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

    // 验证 ledgerId 是否真实存在，前端可能传虚拟的账户标识
    const rawLedgerId: string | undefined = body.ledgerId ?? body.accountId ?? undefined;
    let validLedgerId: string | undefined = undefined;
    if (rawLedgerId) {
      const ledger = await prisma.ledger.findUnique({ where: { id: rawLedgerId }, select: { id: true } });
      if (ledger) {
        validLedgerId = ledger.id;
      }
    }

    // categoryName: 前端传 "category" 字段，后端兼容映射
    const categoryName = String(body.categoryName ?? body.category ?? "未分类");

    const row = await prisma.transaction.create({
      data: {
        amountCent,
        type: body.type ?? (amountCent >= 0 ? "EXPENSE" : "INCOME"),
        categoryName,
        note: note ? String(note) : null,
        ts: body.ts || body.time ? new Date(body.ts ?? body.time) : new Date(),
        source: String(body.source ?? "manual"),
        isAnomaly: Boolean(body.isAnomaly ?? false),
        ledgerId: validLedgerId,
        userId: user.id
      }
    });

    // 原子更新账本余额
    if (validLedgerId) {
      await prisma.ledger.update({
        where: { id: validLedgerId },
        data: { balanceCent: { increment: amountCent } }
      });
    }

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
        categoryName: row.categoryName,
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
    const user = await resolveRequestUser(req);
    const id = req.params.id;
    const body = req.body ?? {};

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ ok: false, code: 404, message: "not found" }); return; }
    if (existing.userId !== user.id) { res.status(403).json({ ok: false, code: 403, message: "forbidden" }); return; }

    const row = await prisma.transaction.update({
      where: { id },
      data: {
        amountCent: body.amountCent ?? body.amount,
        categoryName: body.categoryName,
        note: body.note ?? body.remark ?? body.description,
        ts: body.ts || body.time ? new Date(body.ts ?? body.time) : undefined,
        source: body.source,
        isAnomaly: body.isAnomaly
      }
    });

    res.json({ ok: true, code: 0, message: "ok", data: { transactionId: row.id, time: row.ts.toISOString(), amount: Math.abs(row.amountCent), categoryName: row.categoryName, remark: row.note ?? undefined, isAnomaly: row.isAnomaly } });
  } catch (error) { next(error); }
});

router.delete("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const existing = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ ok: false, code: 404, message: "transaction not found" }); return; }
    if (existing.userId !== user.id) { res.status(403).json({ ok: false, code: 403, message: "forbidden" }); return; }
    await prisma.transaction.delete({ where: { id: req.params.id } });
    res.json({ ok: true, code: 0, message: "ok", data: { deleted: true } });
  } catch (error) { next(error); }
});

export default router;
import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const date = req.query.date ? String(req.query.date) : new Date().toISOString().slice(0, 10);
    const from = new Date(`${date}T00:00:00.000Z`);
    const to = new Date(`${date}T23:59:59.999Z`);

    // 获取当前用户可访问的账本（与 transactions 列表一致）
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
    const familyLedgerIds = userDetail?.family?.ledgers.map((item) => item.id) ?? [];
    const familyMemberIds = userDetail?.family?.members.map(m => m.id) ?? [];
    const memberLedgers = userDetail?.family
      ? await prisma.ledger.findMany({
          where: { ownerId: { in: familyMemberIds } },
          select: { id: true }
        })
      : [];
    const accessibleLedgerIds = Array.from(new Set([...familyLedgerIds, ...memberLedgers.map(l => l.id)]));

    const buildWhere = (tsFilter: { gte: Date; lte: Date }) => ({
      AND: [
        {
          OR: [
            { userId: user.id },
            { ledgerId: { in: accessibleLedgerIds } },
            { targetLedgerId: { in: accessibleLedgerIds } }
          ]
        },
        { ts: tsFilter }
      ]
    });

    let rows = await prisma.transaction.findMany({
      where: buildWhere({ gte: from, lte: to }),
      orderBy: { ts: "desc" }
    });

    let sourceDate = date;

    // If the requested day has no records, fallback to latest day with transactions.
    if (rows.length === 0) {
      const latest = await prisma.transaction.findFirst({
        where: {
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
        orderBy: { ts: "desc" },
        select: { ts: true }
      });

      if (latest?.ts) {
        sourceDate = latest.ts.toISOString().slice(0, 10);
        const latestFrom = new Date(`${sourceDate}T00:00:00.000Z`);
        const latestTo = new Date(`${sourceDate}T23:59:59.999Z`);
        rows = await prisma.transaction.findMany({
          where: buildWhere({ gte: latestFrom, lte: latestTo }),
          orderBy: { ts: "desc" }
        });
      }
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      meta: { requestedDate: date, sourceDate },
      data: rows.map((row) => ({
        id: row.id,
        amount: (row.amountCent >= 0 ? -Math.abs(row.amountCent) : Math.abs(row.amountCent)) / 100,
        time: row.ts.toISOString(),
        channel: row.source,
        category: row.categoryName ?? "未分类",
        categoryName: row.categoryName
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

type AccountMeta = {
  institution?: string;
  currency?: string;
};

const parseMeta = (description: string | null): AccountMeta => {
  if (!description) {
    return {};
  }

  try {
    const parsed = JSON.parse(description) as AccountMeta;
    return {
      institution: typeof parsed.institution === "string" ? parsed.institution : undefined,
      currency: typeof parsed.currency === "string" ? parsed.currency : undefined
    };
  } catch {
    return {};
  }
};

const toMetaString = (meta: AccountMeta): string | null => {
  const clean: AccountMeta = {
    institution: meta.institution?.trim() || undefined,
    currency: meta.currency?.trim() || undefined
  };

  if (!clean.institution && !clean.currency) {
    return null;
  }

  return JSON.stringify(clean);
};

// 账户汇总：总资产/负债/净资产/本月收支
router.get("/summary", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);

    const ledgers = await prisma.ledger.findMany({ where: { ownerId: user.id }, select: { id: true } });
    const ledgerIds = ledgers.map(l => l.id);

    // 所有交易（正=收入，负=支出）
    const allTx = ledgerIds.length > 0
      ? await prisma.transaction.findMany({ where: { ledgerId: { in: ledgerIds } }, select: { amountCent: true, ts: true } })
      : [];

    const totalCent = allTx.reduce((s, r) => s + r.amountCent, 0);
    const assetCent = Math.max(0, totalCent);
    const debtCent = Math.abs(Math.min(0, totalCent));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthIncome = allTx
      .filter(r => r.ts >= monthStart && r.amountCent > 0)
      .reduce((s, r) => s + r.amountCent, 0);
    const monthExpense = allTx
      .filter(r => r.ts >= monthStart && r.amountCent < 0)
      .reduce((s, r) => s + Math.abs(r.amountCent), 0);

    res.json({
      ok: true, code: 0, message: "ok",
      data: {
        totalAssetCent: assetCent,
        totalDebtCent: debtCent,
        netAssetCent: assetCent - debtCent,
        monthIncomeCent: monthIncome,
        monthExpenseCent: monthExpense
      }
    });
  } catch (error) { next(error); }
});

router.get("/", requirePermission(Permission.TRANSACTION_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);

    const ledgers = await prisma.ledger.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" }
    });

    const ledgerIds = ledgers.map((item) => item.id);
    const rows =
      ledgerIds.length > 0
        ? await prisma.transaction.findMany({
            where: { ledgerId: { in: ledgerIds } },
            select: { ledgerId: true, amountCent: true }
          })
        : [];

    const balances = new Map<string, number>();
    for (const row of rows) {
      const key = row.ledgerId;
      if (!key) {
        continue;
      }
      balances.set(key, (balances.get(key) ?? 0) + row.amountCent);
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: ledgers.map((ledger) => {
        const meta = parseMeta(ledger.description);
        return {
          accountId: ledger.id,
          name: ledger.name,
          icon: ledger.icon,
          type: ledger.type,
          balance: balances.get(ledger.id) ?? 0,
          institution: meta.institution,
          currency: ledger.currency ?? meta.currency ?? "USD"
        };
      })
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};

    const row = await prisma.ledger.create({
      data: {
        ownerId: user.id,
        name: String(body.name ?? "新账户"),
        type: String(body.type ?? "BANK"),
        description: toMetaString({
          institution: body.institution ? String(body.institution) : undefined,
          currency: body.currency ? String(body.currency) : undefined
        })
      }
    });

    const meta = parseMeta(row.description);
    res.status(201).json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        accountId: row.id,
        name: row.name,
        icon: row.icon,
        type: row.type,
        balance: 0,
        institution: meta.institution,
        currency: row.currency ?? meta.currency ?? "USD"
      }
    });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const body = req.body ?? {};

    const existed = await prisma.ledger.findFirst({
      where: { id: req.params.id, ownerId: user.id }
    });

    if (!existed) {
      res.status(404).json({ ok: false, code: 404, message: "account not found" });
      return;
    }

    const oldMeta = parseMeta(existed.description);
    const nextMeta = {
      institution: body.institution !== undefined ? String(body.institution) : oldMeta.institution,
      currency: body.currency !== undefined ? String(body.currency) : oldMeta.currency
    };

    const row = await prisma.ledger.update({
      where: { id: existed.id },
      data: {
        ...(body.name !== undefined ? { name: String(body.name) } : {}),
        ...(body.type !== undefined ? { type: String(body.type) } : {}),
        description: toMetaString(nextMeta)
      }
    });

    const balance = await prisma.transaction.aggregate({
      where: { ledgerId: row.id },
      _sum: { amountCent: true }
    });

    const meta = parseMeta(row.description);
    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        accountId: row.id,
        name: row.name,
        icon: row.icon,
        type: row.type,
        balance: balance._sum.amountCent ?? 0,
        institution: meta.institution,
        currency: row.currency ?? meta.currency ?? "USD"
      }
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);

    const existed = await prisma.ledger.findFirst({
      where: { id: req.params.id, ownerId: user.id }
    });

    if (!existed) {
      res.status(404).json({ ok: false, code: 404, message: "account not found" });
      return;
    }

    await prisma.$transaction([
      prisma.transaction.updateMany({ where: { ledgerId: existed.id }, data: { ledgerId: null } }),
      prisma.ledger.delete({ where: { id: existed.id } })
    ]);

    res.json({ ok: true, code: 0, message: "ok", data: { accountId: existed.id, deleted: true } });
  } catch (error) {
    next(error);
  }
});

export default router;

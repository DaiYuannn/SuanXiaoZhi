import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.get("/", requirePermission(Permission.USER_MANAGE), async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 20);
    const keyword = req.query.keyword ? String(req.query.keyword) : undefined;
    const role = req.query.role ? String(req.query.role) : undefined;
    const where = {
      ...(keyword ? { username: { contains: keyword } } : {}),
      ...(role ? { role } : {})
    };

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * size, take: size })
    ]);

    res.json({ ok: true, code: 0, message: "ok", users, data: { total, page, size, users } });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/detail", requirePermission(Permission.USER_MANAGE), async (req, res, next) => {
  try {
    const userId = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        family: {
          include: {
            members: {
              select: { id: true, username: true, role: true, isActive: true }
            }
          }
        },
        ledgers: {
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!user) {
      res.status(404).json({ ok: false, code: 404, message: "user not found" });
      return;
    }

    const txRows = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { ts: "desc" },
      take: 12
    });

    const aggregates = await prisma.transaction.groupBy({
      by: ["type"],
      where: { userId },
      _sum: { amountCent: true },
      _count: { _all: true }
    });

    const expenseTotal = aggregates
      .filter((item) => item.type === "EXPENSE")
      .reduce((sum, item) => sum + Math.abs(item._sum.amountCent ?? 0), 0);

    const incomeTotal = aggregates
      .filter((item) => item.type === "INCOME")
      .reduce((sum, item) => sum + Math.abs(item._sum.amountCent ?? 0), 0);

    const totalTransactions = aggregates.reduce((sum, item) => sum + item._count._all, 0);

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        profile: {
          id: user.id,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          familyName: user.family?.name ?? null
        },
        stats: {
          ledgerCount: user.ledgers.length,
          totalTransactions,
          expenseTotal,
          incomeTotal
        },
        ledgers: user.ledgers,
        familyMembers:
          user.family?.members.map((member) => ({
            id: member.id,
            username: member.username,
            role: member.role,
            isActive: member.isActive
          })) ?? [],
        recentTransactions: txRows.map((row) => ({
          id: row.id,
          type: row.type,
          amountCent: row.amountCent,
          categoryName: row.categoryName,
          source: row.source,
          note: row.note,
          ts: row.ts,
          ledgerId: row.ledgerId
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/", requirePermission(Permission.USER_MANAGE), async (req, res, next) => {
  try {
    const username = String(req.body?.username ?? "").trim();
    const role = String(req.body?.role ?? "viewer");
    if (!username) {
      res.status(400).json({ ok: false, code: 400, message: "username required" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: "mock",
        role,
        isActive: true
      }
    });

    const roleRow = await prisma.role.findUnique({ where: { code: role } });
    if (roleRow) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
        update: {},
        create: { userId: user.id, roleId: roleRow.id }
      });
    }

    res.status(201).json({ ok: true, code: 0, message: "ok", data: user });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requirePermission(Permission.USER_MANAGE), async (req, res, next) => {
  try {
    const id = req.params.id;
    const role = req.body?.role ? String(req.body.role) : undefined;
    const isActive = req.body?.isActive;

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {})
      }
    });

    if (role) {
      const roleRow = await prisma.role.findUnique({ where: { code: role } });
      if (roleRow) {
        await prisma.userRole.upsert({
          where: { userId_roleId: { userId: user.id, roleId: roleRow.id } },
          update: {},
          create: { userId: user.id, roleId: roleRow.id }
        });
      }
    }

    res.json({ ok: true, code: 0, message: "ok", data: user });
  } catch (error) {
    next(error);
  }
});

export default router;
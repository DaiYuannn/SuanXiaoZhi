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
    const where = keyword ? { username: { contains: keyword } } : undefined;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * size, take: size })
    ]);

    res.json({ ok: true, code: 0, message: "ok", users, data: { total, page, size, users } });
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
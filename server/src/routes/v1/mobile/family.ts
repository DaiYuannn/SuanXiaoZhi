import { Router } from "express";
import { prisma } from "../../../db.js";
import { requirePermission } from "../../../middlewares/requirePermission.js";
import { resolveRequestUser } from "../../../services/user-context.js";
import { Permission } from "../../../types/permission.js";

const router = Router();

router.post("/", requirePermission(Permission.TRANSACTION_WRITE), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const name = String(req.body?.name ?? "我的家庭");
    const description = req.body?.description ? String(req.body.description) : undefined;

    const family = await prisma.family.create({
      data: {
        name,
        description,
        members: { connect: { id: user.id } }
      }
    });

    await prisma.ledger.create({
      data: {
        name: `${name}的公共账本`,
        type: "FAMILY",
        familyId: family.id,
        ownerId: user.id
      }
    });

    res.status(201).json({ ok: true, code: 0, message: "ok", data: family });
  } catch (error) {
    next(error);
  }
});

router.get("/members", requirePermission(Permission.FAMILY_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({
      where: { id: user.id },
      include: { family: { include: { members: true } } }
    });

    const members = detail?.family?.members ?? [];
    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: members.map((member) => ({ id: member.id, username: member.username, role: member.role }))
    });
  } catch (error) {
    next(error);
  }
});

router.get("/ledgers", requirePermission(Permission.FAMILY_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({
      where: { id: user.id },
      include: { family: { include: { ledgers: true } } }
    });

    res.json({ ok: true, code: 0, message: "ok", data: detail?.family?.ledgers ?? [] });
  } catch (error) {
    next(error);
  }
});

router.post("/invite", requirePermission(Permission.FAMILY_READ), (_req, res) => {
  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();
  res.json({ ok: true, code: 0, message: "ok", data: { inviteCode, expiry: "24h" } });
});

router.get("/", requirePermission(Permission.FAMILY_READ), async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({
      where: { id: user.id },
      include: { family: { include: { members: true } } }
    });

    if (!detail?.family) {
      res.json({ ok: true, code: 0, message: "ok", family: null });
      return;
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      family: {
        id: detail.family.id,
        name: detail.family.name,
        members: detail.family.members.length
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
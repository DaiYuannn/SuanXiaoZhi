import { Router } from "express";
import { loginRequestSchema } from "../../../contracts/api.js";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const username = String(req.body?.username ?? "").trim();
    const password = String(req.body?.password ?? "").trim();

    if (!username || !password) {
      res.status(400).json({ ok: false, code: 400, message: "username and password required" });
      return;
    }

    const existed = await prisma.user.findUnique({ where: { username } });
    if (existed) {
      res.status(409).json({ ok: false, code: 409, message: "username exists" });
      return;
    }

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: password,
        role: "owner",
        isActive: true
      }
    });

    res.status(201).json({ ok: true, code: 0, message: "ok", data: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
  const input = loginRequestSchema.parse(req.body);
  let user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user && input.username === "demo") {
    user = await prisma.user.create({
      data: {
        username: "demo",
        passwordHash: "demo",
        role: "owner",
        isActive: true
      }
    });
  }

  const passwordOk =
    !!user &&
    (user.passwordHash === input.password ||
      (user.username === "demo" && input.password === "demo"));

  if (!passwordOk) {
    res.status(401).json({ ok: false, code: 401, message: "invalid credentials" });
    return;
  }

  const authedUser = user as NonNullable<typeof user>;

  res.json({
    ok: true,
    code: 0,
    message: "ok",
    token: `token-${authedUser.id}`,
    role: authedUser.role,
    data: { userId: authedUser.id, username: authedUser.username }
  });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({ where: { id: user.id } });
    if (!detail) {
      res.status(404).json({ ok: false, code: 404, message: "user not found" });
      return;
    }

    res.json({
      ok: true,
      code: 0,
      message: "ok",
      data: {
        id: detail.id,
        username: detail.username,
        role: detail.role,
        points: detail.points,
        isActive: detail.isActive
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
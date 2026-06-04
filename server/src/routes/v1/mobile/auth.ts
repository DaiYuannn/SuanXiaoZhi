import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { loginRequestSchema } from "../../../contracts/api.js";
import { prisma } from "../../../db.js";
import { resolveRequestUser } from "../../../services/user-context.js";

export const JWT_SECRET = process.env.JWT_SECRET ?? "suanxiaozhi-dev-secret-change-in-prod";

export const signToken = (userId: string, role: string): string =>
  jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: "7d" });

export const verifyToken = (token: string): { sub: string; role: string } =>
  jwt.verify(token, JWT_SECRET) as { sub: string; role: string };

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

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, passwordHash, role: "owner", isActive: true }
    });

    const token = signToken(user.id, user.role);
    res.status(201).json({ ok: true, code: 0, message: "ok", token, role: user.role, data: { id: user.id, username: user.username } });
  } catch (error) {
    next(error);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginRequestSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { username: input.username } });

    let passwordOk = false;
    if (user) {
      if (user.passwordHash.startsWith("$2")) {
        passwordOk = await bcrypt.compare(input.password, user.passwordHash);
      } else {
        // 明文密码迁移期兼容
        passwordOk = user.passwordHash === input.password;
        if (passwordOk) {
          const hashed = await bcrypt.hash(input.password, 10);
          await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed } });
        }
      }
    }

    if (!user || !passwordOk) {
      await recordLoginHistory(user?.id, req, false);
      res.status(401).json({ ok: false, code: 401, message: "invalid credentials" });
      return;
    }

    await recordLoginHistory(user.id, req, true);
    const token = signToken(user.id, user.role);

    res.json({
      ok: true, code: 0, message: "ok",
      token, role: user.role,
      data: { userId: user.id, username: user.username }
    });
  } catch (error) {
    next(error);
  }
});

router.get("/me", async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const detail = await prisma.user.findUnique({ where: { id: user.id } });
    if (!detail) { res.status(404).json({ ok: false, code: 404, message: "user not found" }); return; }
    res.json({
      ok: true, code: 0, message: "ok",
      data: { id: detail.id, username: detail.username, role: detail.role, points: detail.points, isActive: detail.isActive, email: detail.email, phone: detail.phone, gender: detail.gender, address: detail.address }
    });
  } catch (error) { next(error); }
});

router.post("/change-password", async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const currentPassword = String(req.body?.currentPassword ?? "");
    const newPassword = String(req.body?.newPassword ?? "");

    if (!currentPassword || !newPassword) {
      res.status(400).json({ ok: false, code: 400, message: "当前密码和新密码不能为空" }); return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ ok: false, code: 400, message: "新密码至少需要6位" }); return;
    }

    const detail = await prisma.user.findUnique({ where: { id: user.id } });
    if (!detail) { res.status(404).json({ ok: false, code: 404, message: "user not found" }); return; }

    const match = detail.passwordHash.startsWith("$2")
      ? await bcrypt.compare(currentPassword, detail.passwordHash)
      : detail.passwordHash === currentPassword;

    if (!match) { res.status(400).json({ ok: false, code: 400, message: "当前密码不正确" }); return; }

    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
    res.json({ ok: true, code: 0, message: "密码修改成功" });
  } catch (error) { next(error); }
});

router.get("/login-history", async (req, res, next) => {
  try {
    const user = await resolveRequestUser(req);
    const rows = await prisma.loginHistory.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
    res.json({ ok: true, code: 0, message: "ok", data: rows.map(r => ({ id: r.id, ipAddress: r.ipAddress, userAgent: r.userAgent, success: r.success, createdAt: r.createdAt.toISOString() })) });
  } catch (error) { next(error); }
});

router.post("/forgot-password", async (req, res, next) => {
  try {
    const { username, phone, newPassword } = req.body ?? {};
    if (!username || !phone || !newPassword || String(newPassword).length < 6) {
      res.status(400).json({ ok: false, code: 400, message: "参数不完整或新密码过短" }); return;
    }
    const user = await prisma.user.findUnique({ where: { username: String(username) } });
    if (!user || user.phone !== String(phone)) {
      res.status(400).json({ ok: false, code: 400, message: "用户名或手机号不匹配" }); return;
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(String(newPassword), 10) } });
    res.json({ ok: true, code: 0, message: "密码重置成功" });
  } catch (error) { next(error); }
});

const recordLoginHistory = async (userId: string | undefined, req: any, success: boolean): Promise<void> => {
  try {
    await prisma.loginHistory.create({ data: { userId: userId ?? "unknown", ipAddress: req.ip ?? req.socket?.remoteAddress ?? null, userAgent: req.headers?.["user-agent"] ?? null, success } });
  } catch { /* ignore */ }
};

export default router;

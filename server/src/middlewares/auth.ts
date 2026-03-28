import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/permission.js";
import { prisma } from "../db.js";

const asRole = (roleHeader: string | undefined): UserRole => {
  switch (roleHeader) {
    case UserRole.FAMILY_MEMBER:
      return UserRole.FAMILY_MEMBER;
    case UserRole.SUPER_ADMIN:
      return UserRole.SUPER_ADMIN;
    case UserRole.OPERATOR:
      return UserRole.OPERATOR;
    case UserRole.VIEWER:
      return UserRole.VIEWER;
    case UserRole.OWNER:
    default:
      return UserRole.OWNER;
  }
};

export const mobileAuthMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  void (async () => {
    const authHeader = req.header("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token.startsWith("token-")) {
      _res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    const userId = token.slice("token-".length);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      _res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    req.user = {
      id: user.id,
      role: asRole(user.role)
    };
    next();
  })().catch((error) => next(error));
};

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  void (async () => {
    const authHeader = req.header("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token.startsWith("token-")) {
      res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    const userId = token.slice("token-".length);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    const role = asRole(user.role);
    if (![UserRole.SUPER_ADMIN, UserRole.OPERATOR, UserRole.VIEWER].includes(role)) {
      res.status(403).json({ ok: false, error: "admin-role-required" });
      return;
    }

    req.user = {
      id: user.id,
      role
    };
    next();
  })().catch((error) => next(error));
};
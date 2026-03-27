import { NextFunction, Request, Response } from "express";
import { UserRole } from "../types/permission.js";

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
  req.user = {
    id: req.header("x-user-id") ?? "mobile-user",
    role: asRole(req.header("x-role") ?? UserRole.OWNER)
  };
  next();
};

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const role = asRole(req.header("x-role") ?? UserRole.VIEWER);
  if (![UserRole.SUPER_ADMIN, UserRole.OPERATOR, UserRole.VIEWER].includes(role)) {
    res.status(403).json({ ok: false, error: "admin-role-required" });
    return;
  }

  req.user = {
    id: req.header("x-user-id") ?? "admin-user",
    role
  };
  next();
};
import { NextFunction, Request, Response } from "express";
import { checkPermission } from "../services/rbac.js";
import { Permission } from "../types/permission.js";

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    const hasAccess = checkPermission(req.user.role, permission);
    if (!hasAccess) {
      res.status(403).json({ ok: false, error: "permission-denied" });
      return;
    }

    next();
  };
};
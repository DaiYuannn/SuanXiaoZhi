import { NextFunction, Request, Response } from "express";
import { adminAuthMiddleware, mobileAuthMiddleware } from "./auth.js";

export const apiGateway = (req: Request, res: Response, next: NextFunction): void => {
  const isPublicMobileAuth = req.path === "/api/v1/mobile/auth/login" || req.path === "/api/v1/mobile/auth/register";

  if (req.path.startsWith("/api/v1/mobile")) {
    if (isPublicMobileAuth) {
      next();
      return;
    }

    mobileAuthMiddleware(req, res, next);
    return;
  }

  if (req.path.startsWith("/api/v1/admin")) {
    adminAuthMiddleware(req, res, next);
    return;
  }

  next();
};
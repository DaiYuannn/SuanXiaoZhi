import { NextFunction, Request, Response } from "express";
import { adminAuthMiddleware, mobileAuthMiddleware } from "./auth.js";

export const apiGateway = (req: Request, res: Response, next: NextFunction): void => {
  if (req.path.startsWith("/api/v1/mobile")) {
    mobileAuthMiddleware(req, res, next);
    return;
  }

  if (req.path.startsWith("/api/v1/admin")) {
    adminAuthMiddleware(req, res, next);
    return;
  }

  next();
};
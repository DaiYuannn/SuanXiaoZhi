import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof Error) {
    if (error.message === "unauthenticated") {
      res.status(401).json({ ok: false, error: "unauthenticated" });
      return;
    }

    if (error.message === "user-not-found") {
      res.status(404).json({ ok: false, error: "user-not-found" });
      return;
    }

    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(500).json({ ok: false, error: "unknown-error" });
};
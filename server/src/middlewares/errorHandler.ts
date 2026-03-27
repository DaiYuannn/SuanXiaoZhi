import { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (error instanceof Error) {
    res.status(500).json({ ok: false, error: error.message });
    return;
  }

  res.status(500).json({ ok: false, error: "unknown-error" });
};
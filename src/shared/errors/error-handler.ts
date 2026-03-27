import { AppError } from "./app-error.js";

export interface ErrorPayload {
  code: string;
  message: string;
  status: number;
}

export const normalizeError = (error: unknown): ErrorPayload => {
  if (error instanceof AppError) {
    return { code: error.code, message: error.message, status: error.status };
  }

  if (error instanceof Error) {
    return { code: "UNEXPECTED_ERROR", message: error.message, status: 500 };
  }

  return { code: "UNKNOWN_ERROR", message: "Unknown error", status: 500 };
};
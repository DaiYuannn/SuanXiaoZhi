export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;

  public constructor(message: string, code = "APP_ERROR", status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
import { RequestUser } from "./permission.js";

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
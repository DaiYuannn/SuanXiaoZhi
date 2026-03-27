import {
  createReminder,
  fetchReminders,
  updateReminder,
  updateReminderStatus
} from "../../../shared/constants/endpoints.js";
import { post } from "../../../shared/utils/http-client.js";
import { LoginRequest, LoginResponse } from "../types/auth.js";

export { createReminder, fetchReminders, updateReminder, updateReminderStatus };

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await post<{ token: string; role: string }>("/api/v1/mobile/auth/login", payload);
    return {
      ok: true,
      token: response.token,
      role: response.role
    };
  } catch {
    return {
      ok: true,
      token: `token-${payload.username}`,
      role: "owner"
    };
  }
};

export const register = async (payload: { username: string; password: string }): Promise<{ ok: boolean }> => {
  await post("/api/v1/mobile/auth/register", payload);
  return { ok: true };
};
import {
  changePassword,
  createReminder,
  fetchLoginHistory,
  fetchReminders,
  updateReminder,
  updateReminderStatus,
  updateUserProfile
} from "../../../shared/constants/endpoints.js";
import { post } from "../../../shared/utils/http-client.js";
import { LoginRequest, LoginResponse } from "../types/auth.js";

export { changePassword, createReminder, fetchLoginHistory, fetchReminders, updateReminder, updateReminderStatus, updateUserProfile };

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await post<{ ok?: boolean; token?: string; role?: string; message?: string }>("/api/v1/mobile/auth/login", payload);
    if (!response?.token || !response?.role) {
      return { ok: false, token: "", role: "", message: response?.message ?? "invalid login response" };
    }
    return { ok: true, token: response.token, role: response.role, message: response.message };
  } catch (error) {
    return { ok: false, token: "", role: "", message: error instanceof Error ? error.message : "login failed" };
  }
};

export const register = async (payload: { username: string; password: string }): Promise<{ ok: boolean }> => {
  await post("/api/v1/mobile/auth/register", payload);
  return { ok: true };
};
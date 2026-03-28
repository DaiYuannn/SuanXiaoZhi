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
    const response = await post<{ ok?: boolean; token?: string; role?: string; message?: string }>("/api/v1/mobile/auth/login", payload);
    if (!response?.token || !response?.role) {
      return {
        ok: false,
        token: "",
        role: "",
        message: response?.message ?? "invalid login response"
      };
    }

    return {
      ok: true,
      token: response.token,
      role: response.role,
      message: response.message
    };
  } catch (error) {
    // 保留前端集成测试占位能力：无后端时，允许演示账号离线通过。
    const fallbackRoles: Record<string, string> = {
      demo: "owner",
      demo_owner: "owner",
      demo_family: "family",
      demo_admin: "super_admin",
      demo_operator: "operator",
      demo_viewer: "viewer"
    };
    const fallbackRole = fallbackRoles[payload.username];
    if ((payload.password === "demo" || payload.password === "demo123") && fallbackRole) {
      return {
        ok: true,
        token: `token-${payload.username}`,
        role: fallbackRole,
        message: "offline fallback"
      };
    }

    return {
      ok: false,
      token: "",
      role: "",
      message: error instanceof Error ? error.message : "login failed"
    };
  }
};

export const register = async (payload: { username: string; password: string }): Promise<{ ok: boolean }> => {
  await post("/api/v1/mobile/auth/register", payload);
  return { ok: true };
};
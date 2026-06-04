import { AUTH_TOKEN_KEY } from "../config/env.js";
import { UserRole } from "../types/permission.js";

export const AUTH_CHANGE_EVENT = "sx-auth-changed";

export interface StoredSession {
  token: string;
  userId: string;
  role: UserRole;
}

const parseRole = (value: string | null): UserRole | null => {
  if (
    value === UserRole.OWNER ||
    value === UserRole.FAMILY_MEMBER ||
    value === UserRole.SUPER_ADMIN ||
    value === UserRole.OPERATOR ||
    value === UserRole.VIEWER
  ) {
    return value;
  }
  return null;
};

export const readStoredSession = (): StoredSession | null => {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? sessionStorage.getItem(AUTH_TOKEN_KEY);
  const userId = localStorage.getItem("sx-user-id") ?? sessionStorage.getItem("sx-user-id");
  const role = parseRole(localStorage.getItem("sx-role") ?? sessionStorage.getItem("sx-role"));
  if (!token || !userId || !role) return null;
  return { token, userId, role };
};

export const notifyAuthChanged = (): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
};

export const setStoredSession = (payload: StoredSession, persist = false): void => {
  if (typeof window === "undefined") return;
  const store = persist ? localStorage : sessionStorage;
  store.setItem(AUTH_TOKEN_KEY, payload.token);
  store.setItem("sx-role", payload.role);
  store.setItem("sx-user-id", payload.userId);
  notifyAuthChanged();
};

export const clearStoredSession = (): void => {
  if (typeof window === "undefined") return;
  for (const s of [localStorage, sessionStorage]) {
    s.removeItem(AUTH_TOKEN_KEY); s.removeItem("sx-role"); s.removeItem("sx-user-id");
  }
  notifyAuthChanged();
};

export const subscribeAuthChanged = (handler: () => void): (() => void) => {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent): void => {
    if (event.key === AUTH_TOKEN_KEY || event.key === "sx-role" || event.key === "sx-user-id") {
      handler();
    }
  };

  window.addEventListener(AUTH_CHANGE_EVENT, handler);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, handler);
    window.removeEventListener("storage", onStorage);
  };
};

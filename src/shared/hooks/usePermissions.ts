import { Permission, SessionUser } from "../types/permission.js";
import { hasPermission } from "../utils/permission-map.js";

export interface PermissionApi {
  hasPermission: (permission: Permission) => boolean;
}

export const usePermissions = (user: SessionUser): PermissionApi => {
  return {
    hasPermission: (permission: Permission) => hasPermission(user.role, permission)
  };
};
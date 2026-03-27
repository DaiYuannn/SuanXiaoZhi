import { Permission, UserRole } from "../types/permission.js";

export const rolePermissionMap: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_WRITE,
    Permission.FAMILY_READ
  ],
  [UserRole.FAMILY_MEMBER]: [Permission.TRANSACTION_READ, Permission.FAMILY_READ],
  [UserRole.SUPER_ADMIN]: [
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_WRITE,
    Permission.FAMILY_READ,
    Permission.USER_MANAGE,
    Permission.TRANSACTION_MANAGE,
    Permission.PRODUCT_MANAGE,
    Permission.SYSTEM_MANAGE,
    Permission.REPORT_READ
  ],
  [UserRole.OPERATOR]: [
    Permission.TRANSACTION_READ,
    Permission.TRANSACTION_MANAGE,
    Permission.PRODUCT_MANAGE,
    Permission.REPORT_READ
  ],
  [UserRole.VIEWER]: [Permission.TRANSACTION_READ, Permission.REPORT_READ]
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  rolePermissionMap[role].includes(permission);
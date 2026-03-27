export enum UserRole {
  OWNER = "owner",
  FAMILY_MEMBER = "family",
  SUPER_ADMIN = "super_admin",
  OPERATOR = "operator",
  VIEWER = "viewer"
}

export enum Permission {
  TRANSACTION_READ = "transaction:read",
  TRANSACTION_WRITE = "transaction:write",
  FAMILY_READ = "family:read",
  USER_MANAGE = "user:manage",
  TRANSACTION_MANAGE = "transaction:manage",
  PRODUCT_MANAGE = "product:manage",
  SYSTEM_MANAGE = "system:manage",
  REPORT_READ = "report:read"
}

export interface RequestUser {
  id: string;
  role: UserRole;
}
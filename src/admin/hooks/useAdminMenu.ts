import { Permission, SessionUser } from "../../shared/types/permission.js";
import { filterRoutesByPermission } from "../../router/permission-guard.js";
import { adminRoutes } from "../../router/routes.js";

export interface AdminMenuItem {
  path: string;
  name: string;
  permission?: Permission;
}

export const useAdminMenu = (user: SessionUser): AdminMenuItem[] => {
  return filterRoutesByPermission(user, adminRoutes);
};
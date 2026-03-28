import { AppRoute } from "./routes.js";
import { SessionUser } from "../shared/types/permission.js";
import { usePermissions } from "../shared/hooks/usePermissions.js";

export const canAccessRoute = (user: SessionUser | null, route: AppRoute): boolean => {
  if (!user) {
    return false;
  }

  if (!route.permission) {
    return true;
  }

  return usePermissions(user).hasPermission(route.permission);
};

export const filterRoutesByPermission = (user: SessionUser | null, routes: AppRoute[]): AppRoute[] => {
  if (!user) {
    return [];
  }

  return routes.filter((route) => canAccessRoute(user, route));
};
import { AppRoute } from "./routes.js";
import { SessionUser } from "../shared/types/permission.js";
import { usePermissions } from "../shared/hooks/usePermissions.js";

export const canAccessRoute = (user: SessionUser, route: AppRoute): boolean => {
  if (!route.permission) {
    return true;
  }

  return usePermissions(user).hasPermission(route.permission);
};

export const filterRoutesByPermission = (user: SessionUser, routes: AppRoute[]): AppRoute[] => {
  return routes.filter((route) => canAccessRoute(user, route));
};
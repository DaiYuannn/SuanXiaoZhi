import React from "react";
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "../shared/components/layouts/AdminLayout";
import MobileLayout from "../shared/components/layouts/MobileLayout";
import { ErrorBoundary } from "../shared/components/ErrorBoundary";
import { adminRoutes, AppRoute, mobileRoutes } from "./routes.js";
import { canAccessRoute } from "./permission-guard.js";
import { SessionUser, UserRole } from "../shared/types/permission.js";
import { AUTH_TOKEN_KEY } from "../shared/config/env.js";

import HomePage from "../domains/home/pages/HomePage";
import AccountingPage from "../domains/ledger/pages/AccountingPage";
import TransferPage from "../domains/ledger/pages/TransferPage";
import TransferSuccessPage from "../domains/ledger/pages/TransferSuccessPage";
import AddTransactionPage from "../domains/ledger/pages/AddTransactionPage";
import TransactionDetailPage from "../domains/ledger/pages/TransactionDetailPage";
import BillUploadPage from "../domains/ledger/pages/BillUploadPage";
import ConsumptionAnalysisPage from "../domains/analysis/pages/ConsumptionAnalysisPage";
import FinancialPlanningPage from "../domains/analysis/pages/FinancialPlanningPage";
import FinancialProductsPage from "../domains/products/pages/FinancialProductsPage";
import ProductDetailPage from "../domains/products/pages/ProductDetailPage";
import RiskAssessmentPage from "../domains/products/pages/RiskAssessmentPage";
import IncentiveCenterPage from "../domains/incentives/pages/IncentiveCenterPage";
import FamilyPage from "../domains/family/pages/FamilyPage";
import CustomerServicePage from "../domains/assistant/pages/CustomerServicePage";
import LoginPage from "../domains/auth/pages/LoginPage";
import RegisterPage from "../domains/auth/pages/RegisterPage";
import UserSettingsPage from "../domains/auth/pages/UserSettingsPage";
import AdminDashboardPage from "../admin/pages/AdminDashboardPage";
import UsersPage from "../admin/pages/UsersPage";
import AdminTransactionsPage from "../admin/pages/AdminTransactionsPage";
import AdminProductsPage from "../admin/pages/AdminProductsPage";
import SystemPage from "../admin/pages/SystemPage";

const componentRegistry: Record<string, React.ComponentType> = {
  HomePage,
  AccountingPage,
  TransferPage,
  TransferSuccessPage,
  AddTransactionPage,
  TransactionDetailPage,
  BillUploadPage,
  ConsumptionAnalysisPage,
  FinancialPlanningPage,
  FinancialProductsPage,
  ProductDetailPage,
  RiskAssessmentPage,
  IncentiveCenterPage,
  FamilyPage,
  CustomerServicePage,
  LoginPage,
  RegisterPage,
  UserSettingsPage,
  AdminDashboardPage,
  UsersPage,
  AdminTransactionsPage,
  AdminProductsPage,
  SystemPage
};

const publicPaths = new Set(["/login", "/register", "/403"]);

const resolveRole = (input: string | null): UserRole | null => {
  if (input === UserRole.OWNER || input === UserRole.FAMILY_MEMBER || input === UserRole.SUPER_ADMIN || input === UserRole.OPERATOR || input === UserRole.VIEWER) {
    return input;
  }
  return null;
};

const resolveSessionUser = (): SessionUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const id = localStorage.getItem("sx-user-id");
  const role = resolveRole(localStorage.getItem("sx-role"));
  if (!token || !id || !role) {
    return null;
  }

  return { id, role };
};

const renderRouteElement = (route: AppRoute): React.ReactElement => {
  const Comp = componentRegistry[route.component];
  if (!Comp) {
    return <div className="p-6 text-danger">页面组件未注册: {route.component}</div>;
  }

  if (publicPaths.has(route.path)) {
    return (
      <ErrorBoundary>
        <Comp />
      </ErrorBoundary>
    );
  }

  const user = resolveSessionUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessRoute(user, route)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <ErrorBoundary>
      <Comp />
    </ErrorBoundary>
  );
};

const authPaths = new Set(["/login", "/register"]);

const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary px-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-card border border-border-light">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <i className="fas fa-ban text-xl" />
        </div>
        <h1 className="text-2xl font-bold text-text-primary">403 无权限访问</h1>
        <p className="mt-2 text-sm text-text-secondary">当前身份没有此页面权限，请使用有权限账号登录。</p>
        <a href="/" className="inline-block mt-5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">返回首页</a>
      </div>
    </div>
  );
};

const resolveFallbackPath = (): string => {
  const user = resolveSessionUser();
  if (!user) {
    return "/login";
  }
  return user.role === UserRole.SUPER_ADMIN || user.role === UserRole.OPERATOR || user.role === UserRole.VIEWER
    ? "/admin"
    : "/";
};

export const AppRouterProvider: React.FC = () => {
  const authRoutes = mobileRoutes.filter((route) => authPaths.has(route.path));
  const appRoutes = mobileRoutes.filter((route) => !authPaths.has(route.path));
  const useHashRouter = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  const RouterComponent = useHashRouter ? HashRouter : BrowserRouter;

  return (
    <RouterComponent>
      <Routes>
        {authRoutes.map((route) => (
          <Route
            key={route.name}
            path={route.path}
            element={resolveSessionUser() ? <Navigate to={resolveFallbackPath()} replace /> : renderRouteElement(route)}
          />
        ))}

        <Route path="/403" element={<ForbiddenPage />} />

        <Route element={<MobileLayout />}>
          {appRoutes.map((route) => (
            <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
          ))}
        </Route>

        <Route element={<AdminLayout />}>
          {adminRoutes.map((route) => (
            <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to={resolveFallbackPath()} replace />} />
      </Routes>
    </RouterComponent>
  );
};

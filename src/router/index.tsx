import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../shared/components/MainLayout";
import { ErrorBoundary } from "../shared/components/ErrorBoundary";
import { adminRoutes, AppRoute, mobileRoutes } from "./routes.js";
import { canAccessRoute } from "./permission-guard.js";
import { SessionUser, UserRole } from "../shared/types/permission.js";

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

const resolveRole = (input: string | null): UserRole => {
  if (input === UserRole.OWNER || input === UserRole.FAMILY_MEMBER || input === UserRole.SUPER_ADMIN || input === UserRole.OPERATOR || input === UserRole.VIEWER) {
    return input;
  }
  return UserRole.OWNER;
};

const resolveSessionUser = (): SessionUser => {
  if (typeof window === "undefined") {
    return { id: "demo", role: UserRole.OWNER };
  }

  const id = localStorage.getItem("sx-user-id") ?? "demo";
  const role = resolveRole(localStorage.getItem("sx-role"));
  return { id, role };
};

const renderRouteElement = (route: AppRoute): React.ReactElement => {
  const Comp = componentRegistry[route.component];
  if (!Comp) {
    return <div className="p-6 text-danger">页面组件未注册: {route.component}</div>;
  }

  const user = resolveSessionUser();
  if (!canAccessRoute(user, route)) {
    return <Navigate to="/login" replace />;
  }

  return (
    <ErrorBoundary>
      <Comp />
    </ErrorBoundary>
  );
};

const authPaths = new Set(["/login", "/register"]);

export const AppRouterProvider: React.FC = () => {
  const authRoutes = mobileRoutes.filter((route) => authPaths.has(route.path));
  const appRoutes = mobileRoutes.filter((route) => !authPaths.has(route.path));

  return (
    <BrowserRouter>
      <Routes>
        {authRoutes.map((route) => (
          <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
        ))}

        <Route element={<MainLayout />}>
          {appRoutes.map((route) => (
            <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
          ))}
          {adminRoutes.map((route) => (
            <Route key={route.name} path={route.path} element={renderRouteElement(route)} />
          ))}
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

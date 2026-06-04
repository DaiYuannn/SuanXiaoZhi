import { Permission } from "../shared/types/permission.js";

export interface AppRoute {
  path: string;
  name: string;
  component: string;
  permission?: Permission;
}

export const mobileRoutes: AppRoute[] = [
  { path: "/", name: "home", component: "HomePage" },
  { path: "/accounting", name: "accounting", component: "AccountingPage", permission: Permission.TRANSACTION_READ },
  { path: "/ledger/transfer", name: "transfer", component: "TransferPage", permission: Permission.TRANSACTION_WRITE },
  { path: "/ledger/transfer/success", name: "transferSuccess", component: "TransferSuccessPage", permission: Permission.TRANSACTION_WRITE },
  { path: "/add-transaction", name: "addTransaction", component: "AddTransactionPage", permission: Permission.TRANSACTION_WRITE },
  { path: "/transaction/:id", name: "transactionDetail", component: "TransactionDetailPage", permission: Permission.TRANSACTION_READ },
  { path: "/bill-upload", name: "billUpload", component: "BillUploadPage", permission: Permission.TRANSACTION_WRITE },
  { path: "/analysis", name: "analysis", component: "ConsumptionAnalysisPage", permission: Permission.TRANSACTION_READ },
  { path: "/planning", name: "planning", component: "FinancialPlanningPage", permission: Permission.TRANSACTION_READ },
  { path: "/products", name: "products", component: "FinancialProductsPage" },
  { path: "/product/:id", name: "productDetail", component: "ProductDetailPage" },
  { path: "/risk", name: "risk", component: "RiskAssessmentPage" },
  { path: "/incentives", name: "incentives", component: "IncentiveCenterPage" },
  { path: "/family", name: "family", component: "FamilyPage", permission: Permission.FAMILY_READ },
  { path: "/customer-service", name: "customerService", component: "CustomerServicePage" },
  { path: "/login", name: "login", component: "LoginPage" },
  { path: "/register", name: "register", component: "RegisterPage" },
  { path: "/settings", name: "settings", component: "UserSettingsPage" },
  // Backward-compatible aliases during migration
  { path: "/home", name: "homeAlias", component: "HomePage" },
  { path: "/consumption-analysis", name: "analysisAlias", component: "ConsumptionAnalysisPage", permission: Permission.TRANSACTION_READ },
  { path: "/financial-planning", name: "planningAlias", component: "FinancialPlanningPage", permission: Permission.TRANSACTION_READ },
  { path: "/financial-products", name: "productsAlias", component: "FinancialProductsPage" },
  { path: "/product-detail", name: "productDetailAlias", component: "ProductDetailPage" },
  { path: "/risk-assessment", name: "riskAlias", component: "RiskAssessmentPage" },
  { path: "/incentive-center", name: "incentivesAlias", component: "IncentiveCenterPage" },
  { path: "/user-settings", name: "settingsAlias", component: "UserSettingsPage" },
  { path: "/transaction-detail", name: "transactionDetailAlias", component: "TransactionDetailPage" }
];

export const adminRoutes: AppRoute[] = [
  { path: "/admin", name: "dashboard", component: "AdminDashboardPage", permission: Permission.REPORT_READ },
  { path: "/admin/users", name: "users", component: "UsersPage", permission: Permission.USER_MANAGE },
  { path: "/admin/transactions", name: "transactions", component: "AdminTransactionsPage", permission: Permission.TRANSACTION_MANAGE },
  { path: "/admin/products", name: "products", component: "AdminProductsPage", permission: Permission.PRODUCT_MANAGE },
  { path: "/admin/reports", name: "reports", component: "AdminReportsPage", permission: Permission.REPORT_READ },
  { path: "/admin/system", name: "system", component: "SystemPage", permission: Permission.SYSTEM_MANAGE }
];
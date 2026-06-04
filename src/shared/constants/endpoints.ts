import { del, get, patch, post } from "../utils/http-client.js";
import type {
  AccountInfo,
  AccountingClassifyResponse,
  AnalysisInsights,
  ApiResponse,
  ConsumptionSummary,
  FamilyInfo,
  FamilyMember,
  IncentiveItem,
  LedgerInfo,
  LoginHistoryItem,
  PageResp,
  PlanItem,
  PlanProgress,
  ProductInfo,
  RecommendedProduct,
  ReminderItem,
  ReportData,
  RiskAssessmentHistoryItem,
  RiskAssessmentState,
  TransactionFlow,
  TransactionItem,
  UserProfile,
  UserProfileDetail,
  UserProfileTags
} from "../types/api.js";

export type {
  AccountInfo,
  AnalysisInsights,
  ApiResponse,
  ConsumptionSummary,
  FamilyInfo,
  FamilyMember,
  IncentiveItem,
  LedgerInfo,
  LoginHistoryItem,
  PageResp,
  PlanItem,
  PlanProgress,
  ProductInfo,
  RecommendedProduct,
  ReminderItem,
  ReportData,
  RiskAssessmentHistoryItem,
  RiskAssessmentState,
  TransactionFlow,
  TransactionItem,
  UserProfile,
  UserProfileDetail,
  UserProfileTags
} from "../types/api.js";

const mobile = "/api/v1/mobile";
const admin = "/api/v1/admin";

export const fetchUserProfile = (): Promise<ApiResponse<UserProfile>> =>
  get<ApiResponse<UserProfile>>(`${mobile}/user/profile`);

export const fetchPlanProgress = (goalId?: string): Promise<ApiResponse<PlanProgress[]>> =>
  get<ApiResponse<PlanProgress[]>>(`${mobile}/plan/progress`, goalId ? { goalId } : undefined);

export interface AccountingClassifyParams {
  images: (File | Blob)[];
  extra?: Record<string, unknown>;
}

export const classifyAccounting = async (params: AccountingClassifyParams): Promise<ApiResponse<AccountingClassifyResponse>> => {
  const form = new FormData();
  params.images.forEach((img, idx) => form.append("image", img, `upload_${idx}.jpg`));
  if (params.extra) {
    Object.entries(params.extra).forEach(([k, v]) => form.append(k, String(v)));
  }
  return post<ApiResponse<AccountingClassifyResponse>>(`${mobile}/ocr/classify`, form, { headers: {} });
};

export interface ProductQuery {
  riskLevel?: "LOW" | "MID" | "HIGH";
  minYield?: number;
  maxYield?: number;
  minTermDays?: number;
  maxTermDays?: number;
}

export const fetchProducts = (query: ProductQuery): Promise<ApiResponse<ProductInfo[]>> =>
  get<ApiResponse<ProductInfo[]>>(`${mobile}/products`, query as Record<string, unknown>);

export const fetchProductDetail = (productId: string): Promise<ApiResponse<ProductInfo>> =>
  get<ApiResponse<ProductInfo>>(`${mobile}/products/${encodeURIComponent(productId)}`);

export const fetchDailyFlows = (date: string): Promise<ApiResponse<TransactionFlow[]>> =>
  get<ApiResponse<TransactionFlow[]>>(`${mobile}/flows`, { date });

export interface RecognizeIntentRequest {
  text: string;
}

export type IntentType = "navigate" | "incentive";
export interface IntentItem {
  type: IntentType;
  score: number;
  payload?: unknown;
}

export const recognizeIntent = (text: string): Promise<ApiResponse<IntentItem[]>> =>
  post<ApiResponse<IntentItem[]>>(`${mobile}/intent/recognize`, { text });

export const fetchIncentives = (): Promise<ApiResponse<IncentiveItem[]>> =>
  get<ApiResponse<IncentiveItem[]>>(`${mobile}/incentives/tasks`);

export const claimIncentive = (taskId: string): Promise<ApiResponse<{ id: string; status: "claimed" }>> =>
  post<ApiResponse<{ id: string; status: "claimed" }>>(`${mobile}/incentives/claim`, { taskId });

export const fetchUserPoints = (): Promise<ApiResponse<{ points: number }>> =>
  get<ApiResponse<{ points: number }>>(`${mobile}/incentives/points`);

export const createFamily = (name: string, description?: string): Promise<ApiResponse<FamilyInfo>> =>
  post<ApiResponse<FamilyInfo>>(`${mobile}/family`, { name, description });

export const fetchFamilyMembers = (): Promise<ApiResponse<FamilyMember[]>> =>
  get<ApiResponse<FamilyMember[]>>(`${mobile}/family/members`);

export const fetchFamilyLedgers = (): Promise<ApiResponse<LedgerInfo[]>> =>
  get<ApiResponse<LedgerInfo[]>>(`${mobile}/family/ledgers`);

export const inviteFamilyMember = (): Promise<ApiResponse<{ inviteCode: string; expiry: string }>> =>
  post<ApiResponse<{ inviteCode: string; expiry: string }>>(`${mobile}/family/invite`, {});

export const fetchAccounts = (): Promise<ApiResponse<AccountInfo[]>> =>
  get<ApiResponse<AccountInfo[]>>(`${mobile}/accounts`);

export const createAccount = (payload: Partial<AccountInfo>): Promise<ApiResponse<AccountInfo>> =>
  post<ApiResponse<AccountInfo>>(`${mobile}/accounts`, payload);

export const updateAccount = (accountId: string, payload: Partial<AccountInfo>): Promise<ApiResponse<AccountInfo>> =>
  patch<ApiResponse<AccountInfo>>(`${mobile}/accounts/${accountId}`, payload);

export const deleteAccount = (accountId: string): Promise<ApiResponse<{ accountId: string; deleted: boolean }>> =>
  del<ApiResponse<{ accountId: string; deleted: boolean }>>(`${mobile}/accounts/${accountId}`);

export interface TransactionQuery {
  page?: number;
  size?: number;
  accountId?: string;
  category?: string;
  from?: string;
  to?: string;
  ledgerId?: string;
}

export const fetchTransactions = (query: TransactionQuery): Promise<ApiResponse<PageResp<TransactionItem>>> =>
  get<ApiResponse<PageResp<TransactionItem>>>(`${mobile}/transactions`, query as Record<string, unknown>);

export const createTransaction = (payload: Partial<TransactionItem>): Promise<ApiResponse<TransactionItem>> =>
  post<ApiResponse<TransactionItem>>(`${mobile}/transactions`, payload);

export const updateTransaction = (transactionId: string, payload: Partial<TransactionItem>): Promise<ApiResponse<TransactionItem>> =>
  patch<ApiResponse<TransactionItem>>(`${mobile}/transactions/${transactionId}`, payload);

export const deleteTransaction = (transactionId: string): Promise<ApiResponse<{ transactionId: string; deleted: boolean }>> =>
  del<ApiResponse<{ transactionId: string; deleted: boolean }>>(`${mobile}/transactions/${transactionId}`);

export const scanTransactionAnomalies = (since: string): Promise<ApiResponse<{ anomalies: string[] }>> =>
  get<ApiResponse<{ anomalies: string[] }>>(`${mobile}/transactions/anomaly-scan`, { since });

export const fetchReminders = (): Promise<ApiResponse<ReminderItem[]>> =>
  get<ApiResponse<ReminderItem[]>>(`${mobile}/reminders`);

export const createReminder = (payload: Partial<ReminderItem>): Promise<ApiResponse<ReminderItem>> =>
  post<ApiResponse<ReminderItem>>(`${mobile}/reminders`, payload);

export const updateReminderStatus = (id: string, status: ReminderItem["status"]): Promise<ApiResponse<ReminderItem>> =>
  post<ApiResponse<ReminderItem>>(`${mobile}/reminders/${id}/status`, { status });

export const updateReminder = (id: string, payload: Partial<ReminderItem>): Promise<ApiResponse<ReminderItem>> =>
  post<ApiResponse<ReminderItem>>(`${mobile}/reminders/${id}`, payload);

export const fetchConsumptionSummary = (range: { from: string; to: string }): Promise<ApiResponse<ConsumptionSummary>> =>
  get<ApiResponse<ConsumptionSummary>>(`${mobile}/analysis/summary`, range);

export const fetchAnalysisInsights = (range?: { from?: string; to?: string }): Promise<ApiResponse<AnalysisInsights>> =>
  get<ApiResponse<AnalysisInsights>>(`${mobile}/analysis/insights`, range);

export const fetchUserProfileTags = (params?: { page?: number; size?: number }): Promise<ApiResponse<UserProfileTags>> =>
  get<ApiResponse<UserProfileTags>>(`${mobile}/user/profile/tags`, params);

export const fetchPlans = (): Promise<ApiResponse<PlanItem[]>> =>
  get<ApiResponse<PlanItem[]>>(`${mobile}/plans`);

export const createPlan = (payload: Partial<PlanItem>): Promise<ApiResponse<PlanItem>> =>
  post<ApiResponse<PlanItem>>(`${mobile}/plans`, payload);

export const updatePlan = (planId: string, payload: Partial<PlanItem>): Promise<ApiResponse<PlanItem>> =>
  patch<ApiResponse<PlanItem>>(`${mobile}/plans/${planId}`, payload);

export const deletePlan = (planId: string): Promise<ApiResponse<{ planId: string; deleted: boolean }>> =>
  del<ApiResponse<{ planId: string; deleted: boolean }>>(`${mobile}/plans/${planId}`);

export const generatePlans = (payload: {
  target?: string;
  budget?: number;
  deadline?: string;
  constraints?: string[];
}): Promise<ApiResponse<{ plans: Array<{ name: string; rationale?: string; steps: string[]; checkpoints: string[] }> }>> =>
  post<ApiResponse<{ plans: Array<{ name: string; rationale?: string; steps: string[]; checkpoints: string[] }> }>>(
    `${mobile}/plan/generate`,
    payload
  );

export const startRiskAssessment = (): Promise<ApiResponse<RiskAssessmentState>> =>
  post<ApiResponse<RiskAssessmentState>>(`${admin}/risk/assessment/start`, {});

export const submitRiskAssessment = (
  assessmentId: string,
  answers: Array<{ qid: string; optionId: string }>
): Promise<ApiResponse<RiskAssessmentState>> =>
  post<ApiResponse<RiskAssessmentState>>(`${admin}/risk/assessment/submit`, { assessmentId, answers });

export const fetchRiskAssessmentResult = (assessmentId: string): Promise<ApiResponse<RiskAssessmentState>> =>
  get<ApiResponse<RiskAssessmentState>>(`${admin}/risk/assessment/result`, { assessmentId });

export interface RecommendQuery {
  budget?: number;
  termDays?: number;
  riskPreference?: "LOW" | "MID" | "HIGH";
}

export const fetchRecommendedProducts = (query: RecommendQuery): Promise<ApiResponse<RecommendedProduct[]>> =>
  get<ApiResponse<RecommendedProduct[]>>(`${mobile}/products/recommend`, query as Record<string, unknown>);

export const estimateProductYield = (
  productId: string,
  amount: number,
  termDays?: number
): Promise<ApiResponse<{ productId: string; estimate: number; termDays: number }>> =>
  get<ApiResponse<{ productId: string; estimate: number; termDays: number }>>(`${mobile}/products/estimate`, {
    productId,
    amount,
    termDays
  });

export const fetchReport = (type: ReportData["type"], params?: Record<string, unknown>): Promise<ApiResponse<ReportData>> =>
  get<ApiResponse<ReportData>>(`${admin}/reports/${type}`, params);

export const batchAudit = (items: Array<{ ts: number; action: string; detail?: unknown }>): Promise<ApiResponse<{ accepted: number }>> =>
  post<ApiResponse<{ accepted: number }>>(`${mobile}/audit/batch`, { items });

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export const aiChat = (
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number; max_tokens?: number }
): Promise<ApiResponse<{ content: string; raw: unknown }>> => post<ApiResponse<{ content: string; raw: unknown }>>(`${mobile}/ai/chat`, {
  messages,
  ...(options ?? {})
});

export const classifyTextQuick = async (text: string): Promise<AccountingClassifyResponse> => {
  const system =
    "你是票据/流水解析助手。请严格输出 JSON，结构如下：" +
    '{"ocr":[],"categories":[{"label":"餐饮","score":0.95}],"amount":24.5,"merchant":"沃尔玛","ts":"2024-06-12T18:30:00.000Z"}';

  const resp = await aiChat([
    { role: "system", content: system },
    { role: "user", content: text }
  ]);

  let content = resp.data?.content ?? "";
  content = content.trim();
  if (content.startsWith("```")) {
    const m = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (m?.[1]) {
      content = m[1].trim();
    }
  }

  try {
    return JSON.parse(content) as AccountingClassifyResponse;
  } catch {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      return JSON.parse(content.slice(start, end + 1)) as AccountingClassifyResponse;
    }
    throw new Error("无法解析 AI 返回的分类结果");
  }
};

export const classifyText = (text: string): Promise<ApiResponse<AccountingClassifyResponse>> =>
  post<ApiResponse<AccountingClassifyResponse>>(`${mobile}/ocr/classify-text`, { text });

// ---- 个人设置相关 ----

export const updateUserProfile = (
  payload: { email?: string; phone?: string; gender?: string; address?: string }
): Promise<ApiResponse<UserProfileDetail>> =>
  patch<ApiResponse<UserProfileDetail>>(`${mobile}/user/profile`, payload);

export const changePassword = (
  payload: { currentPassword: string; newPassword: string }
): Promise<ApiResponse<{ ok: boolean }>> =>
  post<ApiResponse<{ ok: boolean }>>(`${mobile}/auth/change-password`, payload);

export const fetchLoginHistory = (): Promise<ApiResponse<LoginHistoryItem[]>> =>
  get<ApiResponse<LoginHistoryItem[]>>(`${mobile}/auth/login-history`);

export const fetchRiskAssessments = (): Promise<ApiResponse<RiskAssessmentHistoryItem[]>> =>
  get<ApiResponse<RiskAssessmentHistoryItem[]>>(`${mobile}/risk/assessments`);

export const startMobileRiskAssessment = (): Promise<ApiResponse<RiskAssessmentState>> =>
  post<ApiResponse<RiskAssessmentState>>(`${mobile}/risk/assessment/start`, {});

export const submitMobileRiskAssessment = (
  assessmentId: string,
  answers: Array<{ qid: string; optionId: string }>
): Promise<ApiResponse<RiskAssessmentState>> =>
  post<ApiResponse<RiskAssessmentState>>(`${mobile}/risk/assessment/submit`, { assessmentId, answers });

export const fetchMobileRiskResult = (assessmentId: string): Promise<ApiResponse<RiskAssessmentState>> =>
  get<ApiResponse<RiskAssessmentState>>(`${mobile}/risk/assessment/result`, { assessmentId });

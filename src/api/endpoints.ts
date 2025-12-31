import { get, post } from './http';
import type {
  ApiResponse,
  UserProfile,
  PlanProgress,
  AccountingClassifyResponse,
  ProductInfo,
  TransactionFlow,
  IncentiveItem,
  AccountInfo,
  TransactionItem,
  PageResp,
  ReminderItem,
  ConsumptionSummary,
  UserProfileTags,
  PlanItem,
  RiskAssessmentState,
  RecommendedProduct,
  ReportData,
  AnalysisInsights,
  FamilyInfo,
  FamilyMember,
  LedgerInfo
} from './types';

// 用户画像
export const fetchUserProfile = () => get<ApiResponse<UserProfile>>('/api/v1/user/profile');

// 规划进度
export const fetchPlanProgress = (goalId?: string) => get<ApiResponse<PlanProgress[]>>('/api/v1/plan/progress', goalId ? { goalId } : undefined);

// 记账分类 + OCR （支持多图）
export interface AccountingClassifyParams {
  images: (File | Blob)[]; // 多图
  extra?: Record<string, any>; // 额外参数占位，如 currency 等
}

export const classifyAccounting = async (params: AccountingClassifyParams) => {
  const form = new FormData();
  params.images.forEach((img, idx) => form.append('image', img, `upload_${idx}.jpg`));
  if (params.extra) Object.entries(params.extra).forEach(([k, v]) => form.append(k, String(v)));
  return post<ApiResponse<AccountingClassifyResponse>>('/api/v1/accounting/classify', form, { headers: {} });
};

// 占位：理财产品查询
export interface ProductQuery { 
  riskLevel?: 'LOW' | 'MID' | 'HIGH'; 
  minYield?: number;  // 最低预期年化收益（百分比，3.5 表示 3.5%）
  maxYield?: number;  // 最高预期年化收益
  minTermDays?: number; // 最短期限
  maxTermDays?: number; // 最长期限
}
export const fetchProducts = (query: ProductQuery) => get<ApiResponse<ProductInfo[]>>('/api/v1/products', query);
export const fetchProductDetail = (productId: string) => get<ApiResponse<ProductInfo>>(`/api/v1/products/${encodeURIComponent(productId)}`);

// 占位：T+1 流水（后端聚合）
export const fetchDailyFlows = (date: string) => get<ApiResponse<TransactionFlow[]>>('/api/v1/flows', { date });

// 意图识别（新增封装）
export interface RecognizeIntentRequest { text: string }
export type IntentType = 'navigate' | 'incentive';
export interface IntentItem { type: IntentType; score: number; payload?: any }
export const recognizeIntent = (text: string) => post<ApiResponse<IntentItem[]>>('/api/v1/intent/recognize', { text });

// 激励中心
export const fetchIncentives = () => get<ApiResponse<IncentiveItem[]>>('/api/v1/incentives/tasks');
export const claimIncentive = (taskId: string) => post<ApiResponse<{ id: string; status: 'claimed' }>>('/api/v1/incentives/claim', { taskId });
export const fetchUserPoints = () => get<ApiResponse<{ points: number }>>('/api/v1/incentives/points');

// 家庭
export const createFamily = (name: string, description?: string) => post<ApiResponse<FamilyInfo>>('/api/v1/family', { name, description });
export const fetchFamilyMembers = () => get<ApiResponse<FamilyMember[]>>('/api/v1/family/members');
export const fetchFamilyLedgers = () => get<ApiResponse<LedgerInfo[]>>('/api/v1/family/ledgers');
export const inviteFamilyMember = () => post<ApiResponse<{ inviteCode: string; expiry: string }>>('/api/v1/family/invite', {});

// ===== 新增：账户与交易 CRUD 占位 =====
export const fetchAccounts = () => get<ApiResponse<AccountInfo[]>>('/api/v1/accounts');
export const createAccount = (payload: Partial<AccountInfo>) => post<ApiResponse<AccountInfo>>('/api/v1/accounts', payload);
export const updateAccount = (accountId: string, payload: Partial<AccountInfo>) => post<ApiResponse<AccountInfo>>(`/api/v1/accounts/${accountId}`, payload);
export const deleteAccount = (accountId: string) => post<ApiResponse<{ accountId: string; deleted: boolean }>>(`/api/v1/accounts/${accountId}/delete`, {});

export interface TransactionQuery { page?: number; size?: number; accountId?: string; category?: string; from?: string; to?: string; ledgerId?: string; }
export const fetchTransactions = (query: TransactionQuery) => get<ApiResponse<PageResp<TransactionItem>>>('/api/v1/transactions', query);
export const createTransaction = (payload: Partial<TransactionItem>) => post<ApiResponse<TransactionItem>>('/api/v1/transactions', payload);
export const updateTransaction = (transactionId: string, payload: Partial<TransactionItem>) => post<ApiResponse<TransactionItem>>(`/api/v1/transactions/${transactionId}`, payload);
export const deleteTransaction = (transactionId: string) => post<ApiResponse<{ transactionId: string; deleted: boolean }>>(`/api/v1/transactions/${transactionId}/delete`, {});

// 异常检测扫描
export const scanTransactionAnomalies = (since: string) => get<ApiResponse<{ anomalies: string[] }>>('/api/v1/transactions/anomaly-scan', { since });

// ===== 提醒服务 =====
export const fetchReminders = () => get<ApiResponse<ReminderItem[]>>('/api/v1/reminders');
export const createReminder = (payload: Partial<ReminderItem>) => post<ApiResponse<ReminderItem>>('/api/v1/reminders', payload);
export const updateReminderStatus = (id: string, status: ReminderItem['status']) => post<ApiResponse<ReminderItem>>(`/api/v1/reminders/${id}/status`, { status });
// 新增：更新提醒配置（占位后端接口）
export const updateReminder = (id: string, payload: Partial<ReminderItem>) => post<ApiResponse<ReminderItem>>(`/api/v1/reminders/${id}`, payload);

// ===== 消费分析聚合 =====
export const fetchConsumptionSummary = (range: { from: string; to: string }) => get<ApiResponse<ConsumptionSummary>>('/api/v1/consumption/summary', range);

// 洞察与解读
export const fetchAnalysisInsights = (range?: { from?: string; to?: string }) => get<ApiResponse<AnalysisInsights>>('/api/v1/analysis/insights', range);

// 用户画像标签扩展
export const fetchUserProfileTags = (params?: { page?: number; size?: number }) => get<ApiResponse<UserProfileTags>>('/api/v1/user/profile/tags', params);

// ===== 规划方案 CRUD =====
export const fetchPlans = () => get<ApiResponse<PlanItem[]>>('/api/v1/plans');
export const createPlan = (payload: Partial<PlanItem>) => post<ApiResponse<PlanItem>>('/api/v1/plans', payload);
export const updatePlan = (planId: string, payload: Partial<PlanItem>) => post<ApiResponse<PlanItem>>(`/api/v1/plans/${planId}`, payload);
export const deletePlan = (planId: string) => post<ApiResponse<{ planId: string; deleted: boolean }>>(`/api/v1/plans/${planId}/delete`, {});

// 规划生成
export const generatePlans = (payload: { target?: string; budget?: number; deadline?: string; constraints?: string[] }) =>
  post<ApiResponse<{ plans: Array<{ name: string; rationale?: string; steps: string[]; checkpoints: string[] }> }>>('/api/v1/plan/generate', payload);

// ===== 风险测评 =====
export const startRiskAssessment = () => post<ApiResponse<RiskAssessmentState>>('/api/v1/risk/assessment/start', {});
export const submitRiskAssessment = (assessmentId: string, answers: Array<{ qid: string; optionId: string }>) => post<ApiResponse<RiskAssessmentState>>('/api/v1/risk/assessment/submit', { assessmentId, answers });
export const fetchRiskAssessmentResult = (assessmentId: string) => get<ApiResponse<RiskAssessmentState>>('/api/v1/risk/assessment/result', { assessmentId });

// ===== 产品推荐与收益测算 =====
export interface RecommendQuery { budget?: number; termDays?: number; riskPreference?: 'LOW' | 'MID' | 'HIGH'; }
export const fetchRecommendedProducts = (query: RecommendQuery) => get<ApiResponse<RecommendedProduct[]>>('/api/v1/products/recommend', query);
export const estimateProductYield = (productId: string, amount: number, termDays?: number) => get<ApiResponse<{ productId: string; estimate: number; termDays: number }>>('/api/v1/products/estimate', { productId, amount, termDays });

// ===== 报表 =====
export const fetchReport = (type: ReportData['type'], params?: Record<string, any>) => get<ApiResponse<ReportData>>(`/api/v1/reports/${type}`, params);

// ===== 审计批量上报 =====
export const batchAudit = (items: Array<{ ts: number; action: string; detail?: any }>) => post<ApiResponse<{ accepted: number }>>('/api/v1/audit/batch', { items });

// AI 聊天
export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };
export const aiChat = (messages: ChatMessage[], options?: { model?: string; temperature?: number; max_tokens?: number }) =>
  post<ApiResponse<{ content: string; raw: any }>>('/api/v1/ai/chat', { messages, ...(options||{}) });

// 文本快速分类（前端封装，走后端聊天网关），输出 AccountingClassifyResponse
export const classifyTextQuick = async (text: string) => {
  const system = `你是票据/流水解析助手。请严格输出 JSON，结构如下：\n` +
    `{"ocr":[],"categories":[{"label":"餐饮","score":0.95}],"amount":24.5,"merchant":"沃尔玛","ts":"2024-06-12T18:30:00.000Z"}\n` +
    `要求：\n` +
    `1) 仅输出 JSON，不要输出任何解释或代码块围栏。\n` +
    `2) 分类标签限定在：[餐饮, 购物, 交通, 娱乐, 医疗, 教育, 住房, 水电煤, 工资, 奖金, 投资, 其他]。\n` +
    `3) 若无法解析金额或时间，可省略该字段或设为 null。`;
  const resp = await aiChat([
    { role: 'system', content: system },
    { role: 'user', content: text }
  ]);
  let content = resp.data?.content ?? '';
  // 兼容含代码块围栏/多余前后缀的情况
  content = content.trim();
  if (content.startsWith('```')) {
    const m = content.match(/```(?:json)?\n([\s\S]*?)\n```/i);
    if (m && m[1]) content = m[1].trim();
  }
  try {
    const obj = JSON.parse(content);
    return obj as any; // AccountingClassifyResponse 形状
  } catch (e) {
    // 尝试提取花括号内 JSON
    const idx = content.indexOf('{');
    const last = content.lastIndexOf('}');
    if (idx !== -1 && last !== -1 && last > idx) {
      try { return JSON.parse(content.slice(idx, last + 1)); } catch {}
    }
    throw new Error('无法解析 AI 返回的分类结果');
  }
};

// 文本分类（后端专用接口）
export const classifyText = (text: string) =>
  post<ApiResponse<any>>('/api/v1/accounting/classify-text', { text });

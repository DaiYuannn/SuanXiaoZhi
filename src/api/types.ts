// 通用 API 响应类型（可按后端实际调整）
export interface ApiResponse<T> {
  code: number;         // 0 表示成功，其它表示错误码
  message?: string;     // 错误或提示信息
  data: T;              // 业务数据
}

export interface UserProfile {
  userId: string;
  riskLevel?: 'LOW' | 'MID' | 'HIGH';
  preferences?: Record<string, number>; // 消费偏好权重，如 { food: 0.4, travel: 0.2 }
  tags?: string[]; // 其他标签
}

export interface PlanProgress {
  goalId: string;
  progress: number; // 0-1
  updatedAt: string;
}

export interface ClassificationResultItem {
  label: string;   // 分类标签
  score: number;   // 置信度 0-1
}

export interface OcrTextBlock {
  text: string;
  bbox?: [number, number, number, number]; // 可选：左上x、左上y、宽、高
}

export interface AccountingClassifyResponse {
  ocr: OcrTextBlock[];
  categories: ClassificationResultItem[];
  amount?: number;
  merchant?: string;
  ts?: string;
}

// 理财产品
export type ProductRiskLevel = 'LOW' | 'MID' | 'HIGH';
export interface ProductInfo {
  productId: string;
  name: string;
  riskLevel: ProductRiskLevel;
  expectedYield: number; // 预期年化收益，百分比数值，如 3.8 表示 3.8%
  termDays: number;      // 期限（天）
  riskScore?: number;    // 0-100 综合风险评分（后端可选）
  volatility?: number;   // 历史波动率（%）
  sharpe?: number;       // 夏普比率
  historyYieldPoints?: Array<{ date: string; yield: number }>; // 历史收益曲线点
}

// 流水（T+1 聚合）
export interface TransactionFlow {
  id: string;
  amount: number;
  time: string;  // ISO8601
  channel: 'alipay' | 'wechat' | 'bank' | string;
  category?: string;
}

// 激励中心
export interface IncentiveItem {
  id: string;
  code?: string;
  title: string;
  description?: string;
  points: number;
  status: 'PENDING' | 'COMPLETED' | 'CLAIMED';
  progress: number;
  target: number;
  reward?: string; // 兼容旧字段
}

export interface FamilyMember {
  id: string;
  username: string;
  role: string;
}

export interface FamilyInfo {
  id: string;
  name: string;
  description?: string;
  members: FamilyMember[];
}

export interface LedgerInfo {
  id: string;
  name: string;
  type: 'PERSONAL' | 'FAMILY';
  description?: string;
}

// 账户与交易（占位类型）
export interface AccountInfo {
  accountId: string;
  name: string;
  type: 'BANK' | 'CREDIT' | 'CASH' | string;
  balance?: number; // 单位：分或最小货币单位，后端统一
  institution?: string; // 如 招商银行
  currency?: string; // CNY 等
}

export interface TransactionItem {
  transactionId: string;
  accountId: string;
  time: string; // ISO8601
  type: 'INCOME' | 'EXPENSE';
  amount: number; // 最小单位
  category?: string;
  description?: string;
  merchant?: string;
  remark?: string;
  isAnomaly?: boolean;
  voucherUrl?: string;
}

export interface PageResp<T> {
  total: number;
  page: number;
  size: number;
  list: T[];
}

// 提醒
export interface ReminderItem {
  id: string;
  title: string;
  type: 'BILL' | 'AUDIT' | 'CUSTOM';
  dueAt: string; // ISO8601
  status: 'PENDING' | 'DONE' | 'SNOOZE';
  config?: { frequency?: 'DAY' | 'WEEK' | 'MONTH'; timeOfDay?: string };
}

// 消费分析聚合
export interface CategoryAgg { category: string; amount: number; count: number }
export interface TrendPoint { date: string; amount: number }
export interface FrequencyAgg { category: string; count: number }
export interface ConsumptionSummary {
  byCategory: CategoryAgg[];
  trend: TrendPoint[];
  frequency: FrequencyAgg[];
}

// 洞察解读
export interface AnalysisInsights {
  summary: string[];
  recommendation: string;
}

// 用户画像标签扩展
export interface UserProfileTags {
  groups: Array<{ group: string; tags: string[] }>; // 如 基本画像/消费能力/风险偏好
  total?: number;
}

// 规划方案
export interface PlanItem {
  planId: string;
  name: string;
  goal?: string;
  content?: any; // JSON/Text
  status: 'ongoing' | 'done' | 'adjusted';
  createdAt: string;
  updatedAt?: string;
}

// 风险测评
export interface RiskQuestion {
  id: string;
  text: string;
  options: Array<{ id: string; text: string; score?: number }>;
}

export interface RiskAssessmentState {
  assessmentId: string;
  status: 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
  score?: number;
  level?: 'LOW' | 'MID' | 'HIGH';
  questions?: RiskQuestion[];
}

// 推荐
export interface RecommendedProduct {
  product: ProductInfo;
  score: number; // 排序权重
  reason?: string;
}

// 报表
export interface ReportData {
  type: 'income-expense' | 'balance-sheet' | 'cashflow';
  payload: any;
}

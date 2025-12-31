// 基础配置（可由环境变量覆盖）
export const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '';

// 审计日志上报端点（后端可代理到日志服务）
export const AUDIT_ENDPOINT = (import.meta as any)?.env?.VITE_AUDIT_ENDPOINT || '/api/v1/audit/batch';

// 默认请求超时与重试策略
export const DEFAULT_TIMEOUT_MS = 15000; // 15s
export const DEFAULT_RETRIES = 1; // 失败重试次数（网络错误/5xx）
export const DEFAULT_RETRY_DELAY_MS = 500; // 重试间隔

// 审计批量配置
export const AUDIT_BATCH_SIZE = 20;
export const AUDIT_FLUSH_INTERVAL_MS = 15000; // 15s 自动批量上报
export const AUDIT_MAX_BACKLOG = 500; // 本地最大积压

// 鉴权：约定本地存储 Token key
export const AUTH_TOKEN_KEY = 'auth_token';

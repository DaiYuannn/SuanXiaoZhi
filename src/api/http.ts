import { AUTH_TOKEN_KEY, DEFAULT_RETRIES, DEFAULT_RETRY_DELAY_MS, DEFAULT_TIMEOUT_MS, API_BASE } from '../config';
import { auditApi, auditError } from '../analytics/audit';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface HttpOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, any>;
  body?: any; // JSON | FormData | string | undefined
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export interface HttpError extends Error {
  status?: number;
  code?: string;
  responseBody?: any;
}

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

function buildUrl(path: string, query?: Record<string, any>) {
  const base = API_BASE || '';
  const url = new URL((base.endsWith('/') ? base.slice(0, -1) : base) + path, window.location.origin);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (Array.isArray(v)) v.forEach(i => url.searchParams.append(k, String(i)));
      else url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

function getAuthToken(): string | undefined {
  try { return localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined; } catch { return undefined; }
}

export async function http<T = any>(path: string, opts: HttpOptions = {}): Promise<T> {
  const method = opts.method || 'GET';
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const retryDelay = opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const url = buildUrl(path, opts.query);
  const token = getAuthToken();

  // 处理 body 与 headers
  const isFormData = typeof FormData !== 'undefined' && opts.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...opts.headers,
  };

  const fetchInit: RequestInit = {
    method,
    headers,
    body: method === 'GET' || method === 'DELETE' ? undefined : (isFormData ? opts.body : (opts.body !== undefined ? JSON.stringify(opts.body) : undefined)),
    signal: opts.signal,
    credentials: 'include',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  if (fetchInit.signal) {
    // 链接外部 signal 与内部 controller
    fetchInit.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  fetchInit.signal = controller.signal;

  let attempt = 0;
  const startTs = Date.now();
  const traceId = `${startTs}-${Math.random().toString(36).slice(2)}`;
  while (true) {
    try {
      const res = await fetch(url, fetchInit);
      const contentType = res.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await res.json().catch(() => undefined) : await res.text();

      auditApi(`${method} ${path}`, { status: res.status, durationMs: Date.now() - startTs }, traceId);

      if (!res.ok) {
        const err: HttpError = new Error(`HTTP ${res.status} for ${method} ${path}`);
        err.status = res.status;
        err.responseBody = data;
        // 对 5xx 或网络错误进行重试
        if (res.status >= 500 && attempt < retries) {
          attempt++;
          await sleep(retryDelay);
          continue;
        }
        throw err;
      }
      return data as T;
    } catch (e: any) {
      if (e?.name === 'AbortError') {
        const err: HttpError = new Error(`Timeout after ${timeout}ms for ${method} ${path}`);
        err.code = 'TIMEOUT';
        auditError(`${method} ${path}`, err);
        clearTimeout(timeoutId);
        throw err;
      }
      // 仅网络层错误或显式重试条件才重试
      if (attempt < retries) {
        attempt++;
        await sleep(retryDelay);
        continue;
      }
      auditError(`${method} ${path}`, e);
      clearTimeout(timeoutId);
      throw e;
    } finally {
      // 正常结束/抛错都清理定时器
      clearTimeout(timeoutId);
    }
  }
}

export const get = <T = any>(path: string, query?: Record<string, any>, opts?: HttpOptions) =>
  http<T>(path, { ...opts, method: 'GET', query });

export const post = <T = any>(path: string, body?: any, opts?: HttpOptions) =>
  http<T>(path, { ...opts, method: 'POST', body });

export const put = <T = any>(path: string, body?: any, opts?: HttpOptions) =>
  http<T>(path, { ...opts, method: 'PUT', body });

export const patch = <T = any>(path: string, body?: any, opts?: HttpOptions) =>
  http<T>(path, { ...opts, method: 'PATCH', body });

export const del = <T = any>(path: string, query?: Record<string, any>, opts?: HttpOptions) =>
  http<T>(path, { ...opts, method: 'DELETE', query });

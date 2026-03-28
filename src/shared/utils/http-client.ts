import {
  API_BASE,
  AUTH_TOKEN_KEY,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS
} from "../config/env.js";
import { auditApi, auditError } from "../audit/audit-service.js";

export interface HttpClientOptions {
  baseUrl?: string;
  headers?: Record<string, string>;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  query?: Record<string, unknown>;
  body?: unknown;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

export interface HttpError extends Error {
  status?: number;
  code?: string;
  responseBody?: unknown;
}

const asJson = async <T>(response: Response): Promise<T> => {
  const body = (await response.json()) as T;
  return body;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const buildUrl = (path: string, query?: Record<string, unknown>): string => {
  const base = API_BASE || "";
  const url =
    typeof window !== "undefined"
      ? new URL(`${base.endsWith("/") ? base.slice(0, -1) : base}${path}`, window.location.origin)
      : new URL(path, "http://127.0.0.1");

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      if (Array.isArray(value)) {
        value.forEach((item) => url.searchParams.append(key, String(item)));
      } else {
        url.searchParams.set(key, String(value));
      }
    });
  }

  return url.toString();
};

const getAuthToken = (): string | undefined => {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) ?? undefined : undefined;
  } catch {
    return undefined;
  }
};

export const http = async <T = unknown>(path: string, opts: HttpOptions = {}): Promise<T> => {
  const method = opts.method ?? "GET";
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const retryDelayMs = opts.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const url = buildUrl(path, opts.query);
  const token = getAuthToken();
  const isFormData = typeof FormData !== "undefined" && opts.body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers ?? {})
  };

  const request: RequestInit = {
    method,
    headers,
    body:
      method === "GET" || method === "DELETE"
        ? undefined
        : isFormData
          ? (opts.body as BodyInit)
          : opts.body !== undefined
            ? JSON.stringify(opts.body)
            : undefined,
    // Token auth is header-based; avoid cross-origin credential mode that triggers stricter CORS checks.
    credentials: "same-origin"
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (opts.signal) {
    opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  request.signal = controller.signal;

  const start = Date.now();
  const traceId = `${start}-${Math.random().toString(36).slice(2)}`;
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(url, request);
      const contentType = response.headers.get("content-type") ?? "";
      const body = contentType.includes("application/json")
        ? ((await response.json().catch(() => undefined)) as unknown)
        : ((await response.text().catch(() => "")) as unknown);

      auditApi(`${method} ${path}`, { status: response.status, durationMs: Date.now() - start }, traceId);

      if (!response.ok) {
        const err = new Error(`HTTP ${response.status} for ${method} ${path}`) as HttpError;
        err.status = response.status;
        err.responseBody = body;
        if (response.status >= 500 && attempt < retries) {
          attempt += 1;
          await sleep(retryDelayMs);
          continue;
        }
        throw err;
      }

      clearTimeout(timer);
      return body as T;
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        const timeoutError = new Error(`Timeout after ${timeoutMs}ms for ${method} ${path}`) as HttpError;
        timeoutError.code = "TIMEOUT";
        auditError(`${method} ${path}`, timeoutError);
        clearTimeout(timer);
        throw timeoutError;
      }

      if (attempt < retries) {
        attempt += 1;
        await sleep(retryDelayMs);
        continue;
      }

      auditError(`${method} ${path}`, error);
      clearTimeout(timer);
      throw error;
    }
  }
};

export const get = <T = unknown>(path: string, query?: Record<string, unknown>, opts?: HttpOptions): Promise<T> =>
  http<T>(path, { ...opts, method: "GET", query });

export const post = <T = unknown>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> =>
  http<T>(path, { ...opts, method: "POST", body });

export const put = <T = unknown>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> =>
  http<T>(path, { ...opts, method: "PUT", body });

export const patch = <T = unknown>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> =>
  http<T>(path, { ...opts, method: "PATCH", body });

export const del = <T = unknown>(path: string, query?: Record<string, unknown>, opts?: HttpOptions): Promise<T> =>
  http<T>(path, { ...opts, method: "DELETE", query });

export class HttpClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  public constructor(options: HttpClientOptions = {}) {
    this.baseUrl = options.baseUrl ?? "";
    this.headers = options.headers ?? { "Content-Type": "application/json" };
  }

  public async get<T>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.headers
    });

    return asJson<T>(response);
  }

  public async post<T, B = unknown>(path: string, body: B): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body)
    });

    return asJson<T>(response);
  }
}
import fetch from 'node-fetch';
import { assertConsumptionSummary, assertPageResp } from './validator';

export interface BackendConfig {
  base: string;
  timeoutMs?: number;
}

async function req(base: string, path: string, opts: { method?: string; body?: any; timeoutMs?: number } = {}) {
  const url = base.replace(/\/$/, '') + path;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 12000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal
    });
    const json: any = await res.json().catch(() => ({}));
    const latency = Date.now() - t0;
    return { status: res.status, json, latency };
  } finally {
    clearTimeout(timer);
  }
}

export async function testBackend(cfg: BackendConfig) {
  const results: Array<Record<string, any>> = [];

  // 1) transactions page=1 size=1
  {
    const r = await req(cfg.base, '/api/v1/transactions?page=1&size=1', { timeoutMs: cfg.timeoutMs });
    const ok = r.status === 200 && assertPageResp(r.json);
    results.push({ path: '/transactions', ok, status: r.status, latency: r.latency, count: ok ? r.json.data.list.length : undefined });
  }

  // 2) reminders list
  {
    const r = await req(cfg.base, '/api/v1/reminders', { timeoutMs: cfg.timeoutMs });
    const list = r.json?.data;
    const ok = r.status === 200 && Array.isArray(list);
    const hasAudit = ok ? list.some((x: any) => x?.type === 'AUDIT') : undefined;
    results.push({ path: '/reminders', ok, status: r.status, latency: r.latency, count: ok ? list.length : undefined, hasAudit });
  }

  // 3) consumption summary (last 7 days)
  {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    const q = `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    const r = await req(cfg.base, '/api/v1/consumption/summary' + q, { timeoutMs: cfg.timeoutMs });
    const ok = r.status === 200 && assertConsumptionSummary(r.json);
    results.push({ path: '/consumption/summary', ok, status: r.status, latency: r.latency, categories: ok ? r.json.data.byCategory.length : undefined });
  }

  return results;
}

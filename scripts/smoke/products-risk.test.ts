import fetch from 'node-fetch';

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

export async function testProductsAndRisk(cfg: BackendConfig) {
  const results: Array<Record<string, any>> = [];

  // Products: recommend
  {
    const r = await req(cfg.base, '/api/v1/products/recommend?budget=10000&termDays=180&riskPreference=MID', { timeoutMs: cfg.timeoutMs });
    const list = r.json?.data;
    const ok = r.status === 200 && Array.isArray(list) && list.length >= 1 && list[0]?.product?.productId;
    results.push({ path: '/products/recommend', ok, status: r.status, latency: r.latency, count: Array.isArray(list) ? list.length : undefined });
  }

  // Products: estimate
  {
    const r = await req(cfg.base, '/api/v1/products/estimate?productId=P002&amount=10000&termDays=180', { timeoutMs: cfg.timeoutMs });
    const d = r.json?.data;
    const ok = r.status === 200 && typeof d?.estimate === 'number' && d.estimate > 0;
    results.push({ path: '/products/estimate', ok, status: r.status, latency: r.latency, estimate: d?.estimate });
  }

  // Risk assessment: start
  let assessmentId = '';
  {
    const r = await req(cfg.base, '/api/v1/risk/assessment/start', { method: 'POST', body: {}, timeoutMs: cfg.timeoutMs });
    const d = r.json?.data;
    const ok = r.status === 200 && d?.assessmentId && Array.isArray(d?.questions) && d.questions.length > 0;
    assessmentId = d?.assessmentId || '';
    results.push({ path: '/risk/assessment/start', ok, status: r.status, latency: r.latency, qCount: d?.questions?.length });
  }

  // Risk assessment: submit
  if (assessmentId) {
    const q = await req(cfg.base, '/api/v1/risk/assessment/start', { method: 'POST', body: {}, timeoutMs: cfg.timeoutMs });
    const questions = q.json?.data?.questions || [];
    const answers = questions.map((it: any) => ({ qid: it.id, optionId: it.options?.[0]?.id }));
    const r = await req(cfg.base, '/api/v1/risk/assessment/submit', { method: 'POST', body: { assessmentId, answers }, timeoutMs: cfg.timeoutMs });
    const d = r.json?.data;
    const ok = r.status === 200 && d?.status === 'COMPLETED' && typeof d?.score === 'number' && d?.level;
    results.push({ path: '/risk/assessment/submit', ok, status: r.status, latency: r.latency, score: d?.score, level: d?.level });
  } else {
    results.push({ path: '/risk/assessment/submit', ok: false, reason: 'missing assessmentId from start' });
  }

  return results;
}

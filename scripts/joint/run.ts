import fetch from 'node-fetch';

const base = (process.env.API_BASE || 'http://localhost:5177').replace(/\/$/, '');

async function req(path: string, init: RequestInit & { timeoutMs?: number } = {}) {
  const url = base + path;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 12000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      ...(init as any),
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
      signal: controller.signal,
    } as any);
    const json: any = await res.json().catch(() => ({}));
    const latency = Date.now() - t0;
    return { status: res.status, json, latency };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const out: any[] = [];

  // 1) 新增一条交易（前端形状）
  {
    const body = {
      time: new Date().toISOString(),
      amount: 1299, // 分
      category: '餐饮',
      description: '联调测试',
      remark: 'auto',
      type: 'expense',
    };
    const r = await req('/api/v1/transactions', { method: 'POST', body: JSON.stringify(body) });
    out.push({ step: 'POST /transactions', status: r.status, latency: r.latency, id: r.json?.data?.id });
  }

  // 2) 获取交易分页（size=1）
  {
    const r = await req('/api/v1/transactions?page=1&size=1');
    out.push({ step: 'GET /transactions', status: r.status, latency: r.latency, size: r.json?.data?.list?.length });
  }

  // 3) 获取提醒，并切换第一条的启用状态
  let flipped: any = null;
  {
    const r1 = await req('/api/v1/reminders');
    if (Array.isArray(r1.json?.data) && r1.json.data.length > 0) {
      const item = r1.json.data[0];
      const id = item.id;
      const enable = !item.enabled;
      const r2 = await req(`/api/v1/reminders/${id}/status`, { method: 'POST', body: JSON.stringify({ enabled: enable }) });
      flipped = { id, from: !!item.enabled, to: enable, ok: r2.status === 200 };
    }
    out.push({ step: 'REMINDERS toggle', flipped });
  }

  // 4) 消费分析（近 7 天）
  {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 6);
    const q = `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
    const r = await req('/api/v1/consumption/summary' + q);
    out.push({ step: 'GET /consumption/summary', status: r.status, latency: r.latency, categories: r.json?.data?.byCategory?.length });
  }

  console.log('=== Joint Check Results ===');
  for (const item of out) console.log(item);
}

main().catch((e) => {
  console.error('Joint check failed:', e?.message || e);
  process.exit(1);
});

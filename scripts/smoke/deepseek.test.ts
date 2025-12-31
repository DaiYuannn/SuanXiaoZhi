import fetch from 'node-fetch';

export interface DeepseekConfig {
  base: string;
  key: string;
  model: string;
  timeoutMs?: number;
}

export async function testDeepseek(cfg: DeepseekConfig) {
  const url = cfg.base.replace(/\/$/, '') + '/chat/completions';
  const body = {
    model: cfg.model,
    messages: [{ role: 'user', content: '用一句话告诉我测试脚本已连通。' }],
    max_tokens: 64
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 12000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const json: any = await res.json().catch(() => ({}));
    const latency = Date.now() - t0;
    if (!res.ok) {
      return { ok: false, stage: 'http', status: res.status, latency, json };
    }
    const text = json?.choices?.[0]?.message?.content;
    if (typeof text !== 'string') {
      return { ok: false, stage: 'schema', latency, json };
    }
    return { ok: true, latency, text: String(text).slice(0, 120) };
  } catch (e: any) {
    const latency = Date.now() - t0;
    return { ok: false, stage: 'exception', error: e?.message || String(e), latency };
  } finally {
    clearTimeout(timer);
  }
}

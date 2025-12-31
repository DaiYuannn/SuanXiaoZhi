import path from 'path';
import fs from 'fs';
import fetch from 'node-fetch';
import { createWorker } from 'tesseract.js';
import { assertBillOCR } from './validator';

export interface LocalOCRCfg {
  base: string;
  key: string;
  model: string;
  imagePath: string;
  timeoutMs?: number;
  langs?: string; // e.g., 'chi_sim+eng'
}

async function runOCR(imagePath: string, langs: string) {
  const abs = path.isAbsolute(imagePath) ? imagePath : path.join(process.cwd(), imagePath);
  if (!fs.existsSync(abs)) return { ok: false, reason: `image not found at ${imagePath}` } as const;
  const worker = await createWorker(langs, 1, { logger: () => {} });
  try {
    const { data } = await worker.recognize(abs);
    await worker.terminate();
    const text = data?.text || '';
    if (!text.trim()) return { ok: false, reason: 'empty ocr text' } as const;
    return { ok: true, text } as const;
  } catch (e: any) {
    try { await worker.terminate(); } catch {}
    return { ok: false, reason: e?.message || String(e) } as const;
  }
}

export async function testLocalOCRThenLLM(cfg: LocalOCRCfg) {
  const ocr = await runOCR(cfg.imagePath, cfg.langs || 'chi_sim+eng');
  if (!ocr.ok) return { ok: false, stage: 'ocr', reason: ocr.reason };

  const system = '你是票据/订单结构化助手。严格要求：只输出一段 JSON，不得输出任何多余文字或Markdown代码块；字段为 vendor、platform、datetime、currency、totalPaid、items[{name,quantity,price,amount}]。金额单位元，保留两位小数；无法确定可省略；items 最多10条；尽量精简，单行输出。';
  const user = '以下是OCR原文：\n' + ocr.text.slice(0, 4000) + '\n请按要求仅输出JSON。';

  const url = cfg.base.replace(/\/$/, '') + '/chat/completions';
  const body = {
    model: cfg.model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0,
    max_tokens: 700
  } as any;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs ?? 20000);
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const latency = Date.now() - t0;
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, stage: 'llm-http', status: res.status, latency, json };
  let content = json?.choices?.[0]?.message?.content as string | undefined;
    if (typeof content !== 'string') return { ok: false, stage: 'llm-schema', latency, json };
  // sanitize markdown fences if any
  content = content.replace(/```json|```/g, '').trim();
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  const raw = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch { return { ok: false, stage: 'llm-parse', latency, content: content.slice(0, 300) }; }
    const valid = assertBillOCR(parsed);
    return { ok: valid, latency, vendor: parsed.vendor, totalPaid: parsed.totalPaid, items: parsed.items?.length };
  } catch (e: any) {
    const latency = Date.now() - t0;
    return { ok: false, stage: 'llm-exception', error: e?.message || String(e), latency };
  } finally {
    clearTimeout(timer);
  }
}

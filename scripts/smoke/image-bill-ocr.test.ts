import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { assertBillOCR } from './validator';

export interface OCRConfig {
  base: string;
  key: string;
  model: string;
  imagePath: string;
  timeoutMs?: number;
}

function guessMime(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.jfif') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'application/octet-stream';
}

export async function testBillOCR(cfg: OCRConfig) {
  const abs = path.isAbsolute(cfg.imagePath)
    ? cfg.imagePath
    : path.join(process.cwd(), cfg.imagePath);

  if (!fs.existsSync(abs)) {
    return { ok: false, skipped: true, reason: `image not found at ${cfg.imagePath}` };
  }

  const bin = fs.readFileSync(abs);
  const b64 = bin.toString('base64');
  const mime = guessMime(abs);
  const dataUrl = `data:${mime};base64,${b64}`;

  const system = '你是一名票据/订单OCR助手。任务：从图片中提取结构化账单数据，使用JSON返回，且只输出JSON（不含额外文字）。金额以数字，单位元，保留两位小数。若无法识别某字段可省略。';
  const user = [
    { type: 'text', text: '请解析图片中的订单/账单，输出JSON，字段包含：vendor、platform、datetime、currency、totalPaid、items[{name,quantity,price,amount}]。' },
    { type: 'image_url', image_url: dataUrl } as any
  ];

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
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const latency = Date.now() - t0;

    const text = await res.text();
    let json: any = undefined;
    try { json = JSON.parse(text); } catch { /* ignore */ }

    if (!res.ok) {
      // Some providers may not support image content; surface a clear skip.
      const msg = (json && (json.error?.message || json.message)) || text.slice(0, 300);
      const notSupported = /image|vision|unsupported|content type/i.test(String(msg));
      if (notSupported) {
        return { ok: false, skipped: true, reason: 'vision not supported by this endpoint/model', status: res.status, latency };
      }
      return { ok: false, stage: 'http', status: res.status, latency, message: msg };
    }

    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      return { ok: false, stage: 'schema', latency, raw: json };
    }

    // Try to extract JSON block
    const match = content.match(/\{[\s\S]*\}$/);
    const rawJson = match ? match[0] : content;
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch (e) {
      return { ok: false, stage: 'parse', latency, content: content.slice(0, 300) };
    }

    const valid = assertBillOCR(parsed);
    return { ok: valid, latency, vendor: parsed.vendor, totalPaid: parsed.totalPaid, items: parsed.items?.length };
  } catch (e: any) {
    const latency = Date.now() - t0;
    return { ok: false, stage: 'exception', error: e?.message || String(e), latency };
  } finally {
    clearTimeout(timer);
  }
}

import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import Tesseract from 'tesseract.js';

const upload = multer({ storage: multer.memoryStorage() });
export const ocrRouter = Router();

// simple in-memory cache for idempotency (fingerprint -> result)
const cache = new Map<string, any>();
function putCache(key: string, val: any) {
  if (cache.size > 200) cache.clear();
  cache.set(key, val);
}
function getCache(key: string) { return cache.get(key); }

async function ocrWithTesseract(buf: Buffer) {
  const r = await Tesseract.recognize(buf, 'eng');
  const text = r?.data?.text || '';
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return lines.map((t: string) => ({ text: t }));
}

async function classifyWithAI(ocrText: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const system = '你是财务记账助手。请从OCR文本中提取本次消费/支出的关键信息，以严格JSON输出，不要包含多余文字。金额单位为元，数字类型；时间用ISO8601或省略。JSON结构：{ "amount": number, "merchant"?: string, "ts"?: string, "categories": [{"label": string, "score": number}] }。categories从["餐饮","购物","交通","娱乐","医疗","教育","住房","水电煤","其他"]中选择，给出3个以内，score在0~1之间。若无法确定金额或商户可省略相应字段。';
  const user = `OCR:\n${ocrText}\n请输出JSON。`;
  const body = {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    max_tokens: 600,
    stream: false,
  } as any;
  const r = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  const json: any = await r.json().catch(() => ({}));
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') return null;
  const m = content.match(/\{[\s\S]*\}/);
  const raw = m ? m[0] : content;
  try {
    const parsed = JSON.parse(raw);
    return parsed;
  } catch {
    return null;
  }
}

// POST /api/v1/accounting/classify (multipart form-data)
ocrRouter.post('/accounting/classify', upload.array('image'), async (req, res) => {
  try {
    const files = (req.files as any[]) || [];
    if (!files.length) return res.status(400).json({ code: 400, message: 'no image provided' });

    // idempotency per request: hash all files
    const hash = crypto.createHash('sha256');
    for (const f of files) hash.update(f.buffer);
    const fp = hash.digest('hex');

    if (!req.query.noCache) {
      const cached = getCache(fp);
      if (cached) return res.json({ code: 0, message: 'ok', data: cached, cache: true });
    }

    // OCR all images (concat lines)
    const allBlocks: Array<{ text: string }> = [];
    for (const f of files) {
      const blocks = await ocrWithTesseract(f.buffer);
      allBlocks.push(...blocks);
    }
    const ocrText = allBlocks.map(b => b.text).join('\n');

    // Ask AI to classify
    const ai = await classifyWithAI(ocrText);

    // Heuristic fallback if AI unavailable
    let categories = ai?.categories || [ { label: '其他', score: 0.5 } ];
    let amount = ai?.amount;
    let merchant = ai?.merchant;
    let ts = ai?.ts || new Date().toISOString();

    if (amount == null) {
      // naive amount extraction: choose max price-like number <= 200000
      const nums = (ocrText.match(/\d+[\.,]\d{2}|\d+/g) || []).map(x => Number(String(x).replace(',', '.')));
      const candidates = nums.filter(n => n > 0 && n < 200000);
      amount = candidates.length ? Math.max(...candidates) : undefined;
    }

    const data = {
      ocr: allBlocks,
      categories,
      amount: amount !== undefined ? Number(Number(amount).toFixed(2)) : undefined,
      merchant: merchant || undefined,
      ts,
    };

    putCache(fp, data);
    return res.json({ code: 0, message: 'ok', data });
  } catch (e: any) {
    return res.status(500).json({ code: 500, message: e?.message || 'classify failed' });
  }
});

// POST /api/v1/accounting/classify-text  { text: string }
ocrRouter.post('/accounting/classify-text', async (req, res) => {
  try {
    const text = (req.body?.text || '').toString().trim();
    if (!text) return res.status(400).json({ code: 400, message: 'text required' });

    // Fingerprint by text content
    const fp = crypto.createHash('sha256').update(text).digest('hex');
    if (!req.query.noCache) {
      const cached = getCache(fp);
      if (cached) return res.json({ code: 0, message: 'ok', data: cached, cache: true });
    }

    // Ask AI to classify (reusing same prompt policy)
    const ai = await classifyWithAI(text);

    // Heuristic fallback
    let categories = ai?.categories || [ { label: '其他', score: 0.5 } ];
    let amount = ai?.amount;
    let merchant = ai?.merchant;
    let ts = ai?.ts || new Date().toISOString();

    if (amount == null) {
      const nums = (text.match(/\d+[\.,]\d{2}|\d+/g) || []).map((x: string) => Number(String(x).replace(',', '.')));
      const candidates = nums.filter((n: number) => n > 0 && n < 200000);
      amount = candidates.length ? Math.max(...candidates) : undefined;
    }

    const data = {
      ocr: [],
      categories,
      amount: amount !== undefined ? Number(Number(amount).toFixed(2)) : undefined,
      merchant: merchant || undefined,
      ts,
    };

    putCache(fp, data);
    return res.json({ code: 0, message: 'ok', data });
  } catch (e: any) {
    return res.status(500).json({ code: 500, message: e?.message || 'classify-text failed' });
  }
});

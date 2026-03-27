import crypto from "node:crypto";
import multer from "multer";
import { Router } from "express";
import Tesseract from "tesseract.js";

const upload = multer({ storage: multer.memoryStorage() });
const cache = new Map<string, unknown>();

const putCache = (key: string, value: unknown): void => {
  if (cache.size > 200) {
    cache.clear();
  }
  cache.set(key, value);
};

const getCache = (key: string): unknown => {
  return cache.get(key);
};

const ocrWithTesseract = async (buffer: Buffer): Promise<Array<{ text: string }>> => {
  const result = await Tesseract.recognize(buffer, "eng");
  const text = result?.data?.text ?? "";
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line }));
};

const classifyWithAI = async (ocrText: string): Promise<unknown | null> => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return null;
  }

  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-chat";

  const body = {
    model,
    messages: [
      {
        role: "system",
        content:
          "你是财务记账助手。请严格输出JSON：{ amount?: number, merchant?: string, ts?: string, categories: [{label:string,score:number}] }"
      },
      { role: "user", content: `OCR:\n${ocrText}` }
    ],
    temperature: 0.2,
    max_tokens: 500,
    stream: false
  };

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return null;
  }

  const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const matched = content.match(/\{[\s\S]*\}/);
  const raw = matched ? matched[0] : content;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const router = Router();

router.post("/classify", upload.array("image"), async (req, res, next) => {
  try {
    const files = (req.files as Express.Multer.File[]) ?? [];
    if (files.length === 0) {
      res.status(400).json({ ok: false, code: 400, message: "no image provided" });
      return;
    }

    const hash = crypto.createHash("sha256");
    files.forEach((file) => hash.update(file.buffer));
    const fingerprint = hash.digest("hex");

    if (!req.query.noCache) {
      const cached = getCache(fingerprint);
      if (cached) {
        res.json({ ok: true, code: 0, message: "ok", data: cached, cache: true });
        return;
      }
    }

    const allBlocks: Array<{ text: string }> = [];
    for (const file of files) {
      const blocks = await ocrWithTesseract(file.buffer);
      allBlocks.push(...blocks);
    }

    const ocrText = allBlocks.map((item) => item.text).join("\n");
    const ai = (await classifyWithAI(ocrText)) as
      | { categories?: Array<{ label: string; score: number }>; amount?: number; merchant?: string; ts?: string }
      | null;

    let amount = ai?.amount;
    if (amount === undefined) {
      const nums = (ocrText.match(/\d+[\.,]\d{2}|\d+/g) ?? []).map((item) => Number(item.replace(",", ".")));
      const candidates = nums.filter((n) => n > 0 && n < 200000);
      amount = candidates.length ? Math.max(...candidates) : undefined;
    }

    const data = {
      ocr: allBlocks,
      categories: ai?.categories ?? [{ label: "其他", score: 0.5 }],
      amount: amount !== undefined ? Number(amount.toFixed(2)) : undefined,
      merchant: ai?.merchant,
      ts: ai?.ts ?? new Date().toISOString()
    };

    putCache(fingerprint, data);
    res.json({ ok: true, code: 0, message: "ok", data });
  } catch (error) {
    next(error);
  }
});

router.post("/classify-text", async (req, res, next) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) {
      res.status(400).json({ ok: false, code: 400, message: "text required" });
      return;
    }

    const fingerprint = crypto.createHash("sha256").update(text).digest("hex");
    if (!req.query.noCache) {
      const cached = getCache(fingerprint);
      if (cached) {
        res.json({ ok: true, code: 0, message: "ok", data: cached, cache: true });
        return;
      }
    }

    const ai = (await classifyWithAI(text)) as
      | { categories?: Array<{ label: string; score: number }>; amount?: number; merchant?: string; ts?: string }
      | null;

    let amount = ai?.amount;
    if (amount === undefined) {
      const nums = (text.match(/\d+[\.,]\d{2}|\d+/g) ?? []).map((item) => Number(item.replace(",", ".")));
      const candidates = nums.filter((n) => n > 0 && n < 200000);
      amount = candidates.length ? Math.max(...candidates) : undefined;
    }

    const data = {
      ocr: [],
      categories: ai?.categories ?? [{ label: "其他", score: 0.5 }],
      amount: amount !== undefined ? Number(amount.toFixed(2)) : undefined,
      merchant: ai?.merchant,
      ts: ai?.ts ?? new Date().toISOString()
    };

    putCache(fingerprint, data);
    res.json({ ok: true, code: 0, message: "ok", data });
  } catch (error) {
    next(error);
  }
});

export default router;
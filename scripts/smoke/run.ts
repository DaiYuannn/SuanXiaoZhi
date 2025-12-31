/// <reference types="node" />
import fs from 'fs';
import dotenv from 'dotenv';
// Prefer .env.smoke if present, otherwise fallback to default .env
if (fs.existsSync('.env.smoke')) {
  dotenv.config({ path: '.env.smoke' });
} else {
  dotenv.config();
}
import { testDeepseek } from './deepseek.test';
import { testBackend } from './backend-api.test';
import { testBillOCR } from './image-bill-ocr.test';
import { testLocalOCRThenLLM } from './local-ocr-then-llm.test';
import path from 'path';
import { testProductsAndRisk } from './products-risk.test';
import { testClassifyUpload } from './classify-upload.test';

function maskKey(key?: string) {
  if (!key) return 'N/A';
  if (key.length <= 8) return key.slice(0, 2) + '****';
  return key.slice(0, 6) + '****';
}

(async () => {
  const cfg = {
    apiBase: process.env.SMOKE_API_BASE || '',
    deepBase: process.env.SMOKE_DEEPSEEK_BASE || '',
    deepKey: process.env.SMOKE_DEEPSEEK_KEY || '',
    timeout: Number(process.env.SMOKE_TIMEOUT_MS || '12000'),
    model: process.env.SMOKE_MODEL || 'deepseek-chat',
    imagePath: process.env.SMOKE_IMAGE_PATH || '',
    autoVision: String(process.env.SMOKE_AUTO_VISION || 'true') === 'true',
    enableLocalOCR: String(process.env.SMOKE_ENABLE_LOCAL_OCR || 'true') === 'true'
  };

  const summary: Array<Record<string, any>> = [];
  let failures = 0;

  console.log('=== Smoke Config ===');
  console.log({
    apiBase: cfg.apiBase,
    deepBase: cfg.deepBase,
    deepKey: maskKey(cfg.deepKey),
    timeout: cfg.timeout,
    model: cfg.model,
    imagePath: cfg.imagePath
  });

  // DeepSeek
  if (cfg.deepBase && cfg.deepKey) {
    const res = await testDeepseek({ base: cfg.deepBase, key: cfg.deepKey, model: cfg.model, timeoutMs: cfg.timeout });
    summary.push({ module: 'DeepSeek', ...res });
    if (!res.ok) failures++;

  // Optional: Vision OCR test if image exists
    if (cfg.imagePath) {
      const exists = fs.existsSync(cfg.imagePath) || fs.existsSync(path.join(process.cwd(), cfg.imagePath));
      if (exists) {
        let r = await testBillOCR({ base: cfg.deepBase, key: cfg.deepKey, model: cfg.model, imagePath: cfg.imagePath, timeoutMs: cfg.timeout });
        // If current model does not support vision, optionally try candidates
        if ((r as any).skipped && /vision not supported/i.test(String((r as any).reason)) && cfg.autoVision) {
          const candidates = [
            'deepseek-vl',
            'deepseek-vl-1.5',
            'deepseek-coder-vl',
            'deepseek-multimodal',
            'deepseek-chat-vision',
            'deepseek-v3-vision',
            'deepseek-vl-chat'
          ];
          for (const m of candidates) {
            const attempt = await testBillOCR({ base: cfg.deepBase, key: cfg.deepKey, model: m, imagePath: cfg.imagePath, timeoutMs: cfg.timeout });
            if (attempt.ok) {
              r = { ...attempt, model: m } as any;
              break;
            }
          }
        }
        summary.push({ module: 'DeepSeek OCR', modelTried: cfg.model, ...r });
        if (!r.ok && !r.skipped) failures++;

        // Fallback: Local OCR + LLM structuring
        if ((!r.ok || r.skipped) && cfg.enableLocalOCR) {
          const l = await testLocalOCRThenLLM({ base: cfg.deepBase, key: cfg.deepKey, model: 'deepseek-chat', imagePath: cfg.imagePath, timeoutMs: cfg.timeout });
          summary.push({ module: 'Local OCR + LLM', ...l });
          if (!l.ok) failures++;
        }
      } else {
        summary.push({ module: 'DeepSeek OCR', skipped: true, reason: `image not found at ${cfg.imagePath}` });
      }
    } else {
      summary.push({ module: 'DeepSeek OCR', skipped: true, reason: 'missing SMOKE_IMAGE_PATH' });
    }
  } else {
    summary.push({ module: 'DeepSeek', skipped: true, reason: 'missing SMOKE_DEEPSEEK_BASE or SMOKE_DEEPSEEK_KEY' });
    summary.push({ module: 'DeepSeek OCR', skipped: true, reason: 'missing SMOKE_DEEPSEEK_BASE or SMOKE_DEEPSEEK_KEY' });
  }

  // Backend API
  if (cfg.apiBase) {
    const r = await testBackend({ base: cfg.apiBase, timeoutMs: cfg.timeout });
    r.forEach(x => { summary.push({ module: 'Backend', ...x }); if (!x.ok) failures++; });

    const pr = await testProductsAndRisk({ base: cfg.apiBase, timeoutMs: cfg.timeout });
    pr.forEach(x => { summary.push({ module: 'Products/Risk', ...x }); if (!x.ok) failures++; });

    const cu = await testClassifyUpload(cfg.apiBase, cfg.timeout);
    summary.push({ module: 'Classify Upload', ...cu });
    if (!cu.ok && !cu.skipped) failures++;
  } else {
    summary.push({ module: 'Backend', skipped: true, reason: 'missing SMOKE_API_BASE' });
  }

  console.log('=== Smoke Results ===');
  for (const row of summary) console.log(row);

  console.log(`Final: total=${summary.length} failed=${failures}`);
  process.exit(failures > 0 ? 1 : 0);
})();

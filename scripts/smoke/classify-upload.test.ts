import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import FormData from 'form-data';

export async function testClassifyUpload(apiBase: string, timeoutMs = 20000) {
  const imgPath = path.join(process.cwd(), 'scripts', 'smoke', 'assets', 'order.jpg');
  if (!fs.existsSync(imgPath)) {
    return { ok: false, skipped: true, reason: `image not found at ${imgPath}` };
  }

  const form = new FormData();
  form.append('image', fs.createReadStream(imgPath), { filename: 'order.jpg', contentType: 'image/jpeg' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const t0 = Date.now();
  try {
    const res = await fetch(apiBase.replace(/\/$/, '') + '/api/v1/accounting/classify', {
      method: 'POST',
      body: form as any,
      // @ts-ignore form-data sets its own headers
      headers: form.getHeaders(),
      signal: controller.signal
    });
    const latency = Date.now() - t0;
    const json: any = await res.json().catch(() => ({}));
    const ok = res.status === 200 && json?.code === 0 && Array.isArray(json?.data?.ocr);
    return { ok, status: res.status, latency, ocrLines: json?.data?.ocr?.length, amount: json?.data?.amount };
  } catch (e: any) {
    const latency = Date.now() - t0;
    return { ok: false, error: e?.message || String(e), latency };
  } finally {
    clearTimeout(timer);
  }
}

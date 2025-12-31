import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';

async function main() {
  const base = (process.env.API_BASE || 'http://localhost:5177').replace(/\/$/, '');
  const imgPath = process.env.IMG || 'scripts/smoke/assets/order.jpg';
  const abs = path.isAbsolute(imgPath) ? imgPath : path.join(process.cwd(), imgPath);
  if (!fs.existsSync(abs)) throw new Error('image not found: ' + abs);

  const form = new FormData();
  form.append('image', fs.createReadStream(abs), path.basename(abs));

  const r = await fetch(base + '/api/v1/accounting/classify', {
    method: 'POST',
    body: form as any,
    headers: (form as any).getHeaders(),
  });
  const json = await r.json();
  console.log('status:', r.status);
  console.log(JSON.stringify(json, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

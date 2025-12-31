import fetch from 'node-fetch';

async function main() {
  const base = process.env.API_BASE || 'http://localhost:5177';
  const r = await fetch(base.replace(/\/$/, '') + '/api/v1/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: '你是一个理财助手，回答言简意赅。' },
        { role: 'user', content: '用一句话总结：记账软件的目标是什么？' }
      ]
    })
  });
  const json = await r.json();
  console.log('status=', r.status);
  console.log(JSON.stringify(json, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });

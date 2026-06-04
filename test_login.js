const http = require('http');

const data = JSON.stringify({ username: 'demo_owner', password: 'demo123' });

const req = http.request({
  hostname: '127.0.0.1',
  port: 3000,
  path: '/api/v1/mobile/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', body);
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();

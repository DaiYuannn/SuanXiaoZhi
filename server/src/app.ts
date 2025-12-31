import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { json, urlencoded } from 'express';
import { router } from './routes/index.js';
import rateLimit from 'express-rate-limit';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

export function createApp() {
  const app = express();
  app.use(helmet());
  const isProd = process.env.NODE_ENV === 'production';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.PRODUCTION_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  app.use(cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
      if (!allowedOrigins.length) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('CORS not allowed'), false);
    },
    credentials: true
  }));
  if (isProd) {
    const csp = [
      "default-src 'self'",
      "connect-src 'self' https://api.deepseek.com",
      "img-src 'self' data: blob:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "font-src 'self' data:",
      "object-src 'none'",
      "frame-ancestors 'none'"
    ].join('; ');
    app.use((_req, res, next) => {
      res.setHeader('Content-Security-Policy', csp);
      res.setHeader('Referrer-Policy', 'no-referrer');
      next();
    });
  }
  app.use(json({ limit: '4mb' }));
  app.use(urlencoded({ extended: true }));

  // 基础限流（全局温和限制）
  const baseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false
  });
  app.use(baseLimiter);

  // AI/耗资源路由更严格限制
  const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { code: 429, message: 'Too Many Requests: AI route limited' },
    standardHeaders: true,
    legacyHeaders: false
  });
  const heavyLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { code: 429, message: 'Too Many Requests' },
    standardHeaders: true,
    legacyHeaders: false
  });

  // Health
  app.get('/health', (_req, res) => res.json({ ok: true }));

  // HTTP logging with pino
  const logger = pinoHttp({
    genReqId: (req: any, res: any) => {
      const existing = (req.headers['x-request-id'] as string) || undefined;
      const id = existing || randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password', 'req.body.token'],
      remove: true
    },
    customProps: (_req: any, res: any) => ({ requestId: (res.getHeader('x-request-id') as string) || undefined })
  });
  app.use(logger);

  // Routes with selective limiters
  app.use('/api/v1/ai', aiLimiter);
  app.use('/api/v1/accounting/classify', heavyLimiter);
  app.use('/api/v1/accounting/classify-text', heavyLimiter);
  app.use('/api/v1/plan/generate', heavyLimiter);
  app.use('/api/v1', router);

  // Static serve for production build + SPA fallback（容错查找 dist 目录）
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const distCandidates = [
    path.resolve(currentDir, '..', '..', 'dist'), // ../dist 相对 server/dist/app.js
    path.resolve(process.cwd(), '..', 'dist'),    // CWD/../dist（常规）
    path.resolve(process.cwd(), 'dist')
  ];
  const staticDir = distCandidates.find(p => fs.existsSync(path.join(p, 'index.html'))) || distCandidates[0];
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticDir, 'index.html'));
  });

  // Error handler
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err?.status || 500;
    let message = err?.message || 'Internal Server Error';
    if (status >= 500 && isProd) message = 'Internal Server Error';
    res.status(status).json({ code: status, message });
  });

  return app;
}
